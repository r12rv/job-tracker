import { useState } from 'react';
import { EmptyState } from '../components/layout/EmptyState';
import { Header } from '../components/layout/Header';
import { TrackerBoard } from '../components/tracker/TrackerBoard';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PlusIcon } from '../components/ui/Icons';
import { VacancyModal } from '../components/vacancy/VacancyModal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useVacancies } from '../hooks/useVacancies';
import type { Vacancy, VacancyInput, ViewMode } from '../types/vacancy';

type EditorState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; vacancy: Vacancy };

function parseViewMode(raw: unknown): ViewMode {
  return raw === 'table' ? 'table' : 'kanban';
}

/** Заглушка на время первой загрузки: повторяет раскладку страницы, чтобы ничего не прыгало */
function TrackerSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Загрузка вакансий">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[106px] animate-pulse rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="h-10 w-56 animate-pulse rounded-lg bg-slate-200/70" />
      <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />
    </div>
  );
}

interface TrackerPageProps {
  userId: string;
}

export function TrackerPage({ userId }: TrackerPageProps) {
  const { vacancies, isLoading, loadError, refetch, create, update, changeStatus, move, remove } = useVacancies(userId);

  const [view, setView] = useLocalStorage<ViewMode>('job-tracker:view', 'kanban', parseViewMode);
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<Vacancy | null>(null);

  const openCreate = () => { setEditor({ mode: 'create' }); };
  const openEdit = (vacancy: Vacancy) => { setEditor({ mode: 'edit', vacancy }); };
  const closeEditor = () => { setEditor({ mode: 'closed' }); };

  const saving = create.isPending || update.isPending;
  const handleSubmit = (input: VacancyInput) => {
    // Модалка закрывается только после ответа сервера; при ошибке введённое остаётся в форме
    if (editor.mode === 'edit') update.mutate({ id: editor.vacancy.id, input }, { onSuccess: closeEditor });
    else create.mutate(input, { onSuccess: closeEditor });
  };

  const confirmDelete = () => {
    if (pendingDelete) remove(pendingDelete.id);
    setPendingDelete(null);
  };

  const renderContent = () => {
    if (isLoading) return <TrackerSkeleton />;

    if (!vacancies) {
      return (
        <EmptyState
          title="Не удалось загрузить вакансии"
          description={
            loadError ? 'Проверьте подключение к интернету и попробуйте ещё раз.' : 'Попробуйте обновить страницу.'
          }
          action={
            <Button variant="secondary" onClick={() => { void refetch(); }}>
              Повторить
            </Button>
          }
        />
      );
    }

    return (
      <TrackerBoard
        vacancies={vacancies}
        view={view}
        onViewChange={setView}
        onStatusChange={changeStatus}
        onMove={move}
        onEdit={openEdit}
        onDelete={setPendingDelete}
        emptyState={
          <EmptyState
            title="Пока нет откликов"
            description="Добавьте первую вакансию, на которую откликнулись, — и следите за её движением по воронке."
            action={
              <Button onClick={openCreate}>
                <PlusIcon />
                Добавить вакансию
              </Button>
            }
          />
        }
      />
    );
  };

  return (
    <>
      <Header onAdd={isLoading ? undefined : openCreate} />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        {renderContent()}
      </main>

      <VacancyModal
        open={editor.mode !== 'closed'}
        vacancy={editor.mode === 'edit' ? editor.vacancy : undefined}
        saving={saving}
        onClose={closeEditor}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Удалить вакансию?"
        message={
          pendingDelete
            ? `«${pendingDelete.position}» в ${pendingDelete.company} будет удалена без возможности восстановления.`
            : ''
        }
        onConfirm={confirmDelete}
        onCancel={() => { setPendingDelete(null); }}
      />
    </>
  );
}
