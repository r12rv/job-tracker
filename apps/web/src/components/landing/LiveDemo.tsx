import { useState } from 'react';
import { toast } from 'sonner';
import { createDemoVacancies } from '../../demo/demoVacancies';
import { signInWithGoogle } from '../../lib/auth-client';
import type { Vacancy, VacancyStatus, ViewMode } from '../../types/vacancy';
import { withStatus } from '../../utils/vacancy';
import { EmptyState } from '../layout/EmptyState';
import { TrackerBoard } from '../tracker/TrackerBoard';
import { Button } from '../ui/Button';
import { ResetIcon } from '../ui/Icons';

const signInAction = {
  label: 'Войти',
  onClick: () => {
    void signInWithGoogle();
  },
};

/**
 * Настоящий интерфейс трекера с примерными вакансиями. Всё работает в памяти страницы:
 * можно менять статусы, удалять, фильтровать и переключать вид, но на сервер ничего не уходит.
 */
export function LiveDemo() {
  const [vacancies, setVacancies] = useState<Vacancy[]>(() => createDemoVacancies());
  const [view, setView] = useState<ViewMode>('kanban');
  // Новый key сбрасывает внутреннее состояние доски (фильтры, поиск) вместе с данными
  const [resetKey, setResetKey] = useState(0);

  const reset = () => {
    setVacancies(createDemoVacancies());
    setResetKey((key) => key + 1);
  };

  const changeStatus = (id: string, status: VacancyStatus) => {
    setVacancies((list) =>
      list.map((vacancy) => (vacancy.id === id && vacancy.status !== status ? withStatus(vacancy, status) : vacancy)),
    );
  };

  const remove = (vacancy: Vacancy) => {
    setVacancies((list) => list.filter((item) => item.id !== vacancy.id));
    toast(`«${vacancy.company}» удалена из демо`, {
      action: {
        label: 'Вернуть',
        onClick: () => {
          setVacancies((list) =>
            [vacancy, ...list.filter((item) => item.id !== vacancy.id)].sort((a, b) =>
              b.appliedAt.localeCompare(a.appliedAt),
            ),
          );
        },
      },
    });
  };

  const edit = () => {
    toast.info('Редактирование доступно после входа', {
      description: 'В демо можно менять статусы, удалять и искать.',
      action: signInAction,
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 shadow-slate-900/5 ring-slate-200">
      {/* Рамка «окна приложения»: отделяет демо от остальной страницы */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100/80 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="truncate text-xs font-medium text-slate-500">Демо · примеры вакансий, ничего не сохраняется</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
          <ResetIcon className="size-3.5" />
          <span className="hidden sm:inline">Сбросить демо</span>
          <span className="sr-only sm:hidden">Сбросить демо</span>
        </Button>
      </div>

      <div className="flex flex-col gap-5 bg-slate-50 p-3 sm:p-5">
        <TrackerBoard
          key={resetKey}
          vacancies={vacancies}
          view={view}
          onViewChange={setView}
          onStatusChange={changeStatus}
          onEdit={edit}
          onDelete={remove}
          emptyState={
            <EmptyState
              title="Вы удалили все примеры"
              description="Верните их, чтобы продолжить знакомство, — или войдите и добавьте свои отклики."
              action={
                <Button variant="secondary" onClick={reset}>
                  <ResetIcon className="size-4" />
                  Вернуть примеры
                </Button>
              }
            />
          }
        />
      </div>
    </div>
  );
}
