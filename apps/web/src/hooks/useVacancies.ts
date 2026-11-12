import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError, call, describeError } from '../api/client';
import type { Vacancy, VacancyInput, VacancyStatus } from '../types/vacancy';
import { applyMove } from '../utils/vacancy';

/** Ключ кэша включает id пользователя: после смены аккаунта чужие данные не покажутся даже на миг */
export const vacanciesKey = (userId: string) => ['vacancies', userId] as const;

/** Ключ мутаций перетаскивания: по нему видно, сколько перемещений ещё ждут ответа сервера */
const moveKey = (userId: string) => ['vacancies', userId, 'move'] as const;

/** Тот же порядок, что отдаёт сервер: свежие отклики сверху (таблица). Канбан сортирует по rank сам */
function sortVacancies(list: readonly Vacancy[]): Vacancy[] {
  return [...list].sort(
    (a, b) => b.appliedAt.localeCompare(a.appliedAt) || b.createdAt.localeCompare(a.createdAt),
  );
}

/** Точечные правки кэша: при параллельных изменениях откат одного не затирает другие */
function cacheOps(queryClient: QueryClient, userId: string) {
  const key = vacanciesKey(userId);
  const update = (fn: (list: Vacancy[]) => Vacancy[]) => {
    queryClient.setQueryData<Vacancy[]>(key, (list) => (list ? fn(list) : list));
  };
  return {
    key,
    update,
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

interface MoveVariables {
  id: string;
  status: VacancyStatus;
  afterId: string | null;
}

export function useVacancies(userId: string) {
  const queryClient = useQueryClient();
  const cache = cacheOps(queryClient, userId);

  const query = useQuery({
    queryKey: cache.key,
    queryFn: async (): Promise<Vacancy[]> => call(api.vacancies.$get()),
  });

  /** Оптимистично применяет перемещение и запоминает прежнее состояние карточки для отката */
  const optimisticMove = async ({ id, status, afterId }: MoveVariables): Promise<Rollback> => {
    await queryClient.cancelQueries({ queryKey: cache.key });
    const previous = cache.find(id);
    cache.update((list) => applyMove(list, id, status, afterId));
    return { previous };
  };

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

  // Смена статуса, перетаскивание и удаление — оптимистичные: интерфейс меняется сразу,
  // а при ошибке сервера изменение откатывается и появляется уведомление с кнопкой «Повторить»
  const changeStatus = useMutation<Vacancy, Error, { id: string; status: VacancyStatus }, Rollback>({
    mutationFn: async ({ id, status }) =>
      call(api.vacancies[':id'].status.$patch({ param: { id }, json: { status } })),
    // Сервер ставит карточку наверх новой колонки — делаем так же
    onMutate: async ({ id, status }) => optimisticMove({ id, status, afterId: null }),
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

  const move = useMutation<Vacancy, Error, MoveVariables, Rollback>({
    mutationKey: moveKey(userId),
    mutationFn: async ({ id, status, afterId }) =>
      call(api.vacancies[':id'].move.$patch({ param: { id }, json: { status, afterId } })),
    onMutate: optimisticMove,
    onSuccess: (vacancy) => {
      cache.upsert(vacancy);
    },
    onError: (error, variables, context) => {
      if (context?.previous) cache.upsert(context.previous);
      if (error instanceof ApiError && error.status === 409) {
        // Соседняя карточка изменилась на другом устройстве: повтор не поможет, просто показываем свежий порядок
        toast.info('Порядок карточек изменился', { description: describeError(error) });
        return;
      }
      toast.error('Карточка не перемещена', {
        description: describeError(error),
        duration: RETRY_TOAST_MS,
        action: {
          label: 'Повторить',
          onClick: () => {
            move.mutate(variables);
          },
        },
      });
    },
    onSettled: () => {
      // Сервер мог перенумеровать колонку — перечитываем список, но только после последнего
      // перемещения из серии: иначе ответ «устарел бы» и карточки прыгнули бы назад
      if (queryClient.isMutating({ mutationKey: moveKey(userId) }) === 1) {
        void queryClient.invalidateQueries({ queryKey: cache.key });
      }
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
    move: (id: string, status: VacancyStatus, afterId: string | null) => {
      move.mutate({ id, status, afterId });
    },
    remove: (id: string) => {
      remove.mutate(id);
    },
  };
}
