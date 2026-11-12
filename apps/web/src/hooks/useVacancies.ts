import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, call, describeError } from '../api/client';
import type { Vacancy, VacancyInput, VacancyStatus } from '../types/vacancy';

/** Ключ кэша включает id пользователя: после смены аккаунта чужие данные не покажутся даже на миг */
export const vacanciesKey = (userId: string) => ['vacancies', userId] as const;

/** Тот же порядок, что отдаёт сервер: свежие отклики сверху */
function sortVacancies(list: readonly Vacancy[]): Vacancy[] {
  return [...list].sort(
    (a, b) => b.appliedAt.localeCompare(a.appliedAt) || b.createdAt.localeCompare(a.createdAt),
  );
}

function withStatus(vacancy: Vacancy, status: VacancyStatus): Vacancy {
  const now = new Date().toISOString();
  return {
    ...vacancy,
    status,
    statusHistory: [...vacancy.statusHistory, { status, changedAt: now }],
    updatedAt: now,
  };
}

/** Точечные правки кэша: при параллельных изменениях откат одного не затирает другие */
function cacheOps(queryClient: QueryClient, userId: string) {
  const key = vacanciesKey(userId);
  const update = (fn: (list: Vacancy[]) => Vacancy[]) => {
    queryClient.setQueryData<Vacancy[]>(key, (list) => (list ? fn(list) : list));
  };
  return {
    key,
    find: (id: string) => queryClient.getQueryData<Vacancy[]>(key)?.find((vacancy) => vacancy.id === id),
    upsert: (vacancy: Vacancy) => {
      update((list) => sortVacancies([vacancy, ...list.filter((item) => item.id !== vacancy.id)]));
    },
    remove: (id: string) => {
      update((list) => list.filter((item) => item.id !== id));
    },
  };
}

/** Ошибку с кнопкой «Повторить» держим дольше стандартных 4 секунд — чтобы успеть нажать */
const RETRY_TOAST_MS = 10_000;

interface Rollback {
  previous: Vacancy | undefined;
}

export function useVacancies(userId: string) {
  const queryClient = useQueryClient();
  const cache = cacheOps(queryClient, userId);

  const query = useQuery({
    queryKey: cache.key,
    queryFn: async (): Promise<Vacancy[]> => call(api.vacancies.$get()),
  });

  // Создание и редактирование ждут ответа сервера: форма остаётся открытой,
  // пока данные не сохранены, — так ошибка не потеряет введённое
  const create = useMutation({
    mutationFn: async (input: VacancyInput): Promise<Vacancy> => call(api.vacancies.$post({ json: input })),
    onSuccess: (vacancy) => {
      cache.upsert(vacancy);
      toast.success('Вакансия добавлена');
    },
    onError: (error) => {
      toast.error('Не удалось добавить вакансию', { description: describeError(error) });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VacancyInput }): Promise<Vacancy> =>
      call(api.vacancies[':id'].$put({ param: { id }, json: input })),
    onSuccess: (vacancy) => {
      cache.upsert(vacancy);
    },
    onError: (error) => {
      toast.error('Не удалось сохранить изменения', { description: describeError(error) });
    },
  });

  // Смена статуса и удаление — оптимистичные: интерфейс меняется сразу,
  // а при ошибке сервера изменение откатывается и появляется уведомление с кнопкой «Повторить»
  const changeStatus = useMutation<Vacancy, Error, { id: string; status: VacancyStatus }, Rollback>({
    mutationFn: async ({ id, status }) =>
      call(api.vacancies[':id'].status.$patch({ param: { id }, json: { status } })),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: cache.key });
      const previous = cache.find(id);
      if (previous) cache.upsert(withStatus(previous, status));
      return { previous };
    },
    onSuccess: (vacancy) => {
      cache.upsert(vacancy);
    },
    onError: (error, variables, context) => {
      if (context?.previous) cache.upsert(context.previous);
      toast.error('Статус не изменён', {
        description: describeError(error),
        duration: RETRY_TOAST_MS,
        action: {
          label: 'Повторить',
          onClick: () => {
            changeStatus.mutate(variables);
          },
        },
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await call(api.vacancies[':id'].$delete({ param: { id } }));
    },
    onMutate: async (id): Promise<Rollback> => {
      await queryClient.cancelQueries({ queryKey: cache.key });
      const previous = cache.find(id);
      cache.remove(id);
      return { previous };
    },
    onError: (error, id, context) => {
      if (context?.previous) cache.upsert(context.previous);
      toast.error('Вакансия не удалена', {
        description: describeError(error),
        duration: RETRY_TOAST_MS,
        action: {
          label: 'Повторить',
          onClick: () => {
            remove.mutate(id);
          },
        },
      });
    },
  });

  return {
    vacancies: query.data,
    isLoading: query.isPending,
    loadError: query.error,
    refetch: query.refetch,
    create,
    update,
    changeStatus: (id: string, status: VacancyStatus) => {
      if (cache.find(id)?.status !== status) changeStatus.mutate({ id, status });
    },
    remove: (id: string) => {
      remove.mutate(id);
    },
  };
}
