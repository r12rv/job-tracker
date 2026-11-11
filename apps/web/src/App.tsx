import { useMemo, useState } from 'react';
import { FiltersBar } from './components/filters/FiltersBar';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { EmptyState } from './components/layout/EmptyState';
import { Header } from './components/layout/Header';
import { StatsPanel } from './components/stats/StatsPanel';
import { VacancyTable } from './components/table/VacancyTable';
import { Button } from './components/ui/Button';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { PlusIcon } from './components/ui/Icons';
import { VacancyModal } from './components/vacancy/VacancyModal';
import { ViewTabs } from './components/views/ViewTabs';
import { useFilteredVacancies } from './hooks/useFilteredVacancies';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useStats } from './hooks/useStats';
import { useVacancies } from './hooks/useVacancies';
import type { Vacancy, VacancyFilters, VacancyInput, VacancyStatus, ViewMode } from './types/vacancy';

type EditorState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; vacancy: Vacancy };

const INITIAL_FILTERS: VacancyFilters = { status: 'all', search: '' };

function parseViewMode(raw: unknown): ViewMode {
  return raw === 'table' ? 'table' : 'kanban';
}

export default function App() {
  const { vacancies, addVacancy, updateVacancy, removeVacancy, changeStatus } = useVacancies();
  const [view, setView] = useLocalStorage<ViewMode>('job-tracker:view', 'kanban', parseViewMode);
  const [filters, setFilters] = useState<VacancyFilters>(INITIAL_FILTERS);
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<Vacancy | null>(null);

  const stats = useStats(vacancies);
  const filtered = useFilteredVacancies(vacancies, filters);

  // Счётчики на чипах учитывают поиск, но не выбранный статус
  const searchMatched = useFilteredVacancies(vacancies, { status: 'all', search: filters.search });
  const statusCounts = useMemo(() => {
    const counts: Record<VacancyStatus, number> = { applied: 0, test: 0, interview: 0, offer: 0, rejected: 0 };
    for (const vacancy of searchMatched) counts[vacancy.status] += 1;
    return counts;
  }, [searchMatched]);

  const openCreate = () => { setEditor({ mode: 'create' }); };
  const openEdit = (vacancy: Vacancy) => { setEditor({ mode: 'edit', vacancy }); };
  const closeEditor = () => { setEditor({ mode: 'closed' }); };

  const handleSubmit = (input: VacancyInput) => {
    if (editor.mode === 'edit') updateVacancy(editor.vacancy.id, input);
    else addVacancy(input);
    closeEditor();
  };

  const confirmDelete = () => {
    if (pendingDelete) removeVacancy(pendingDelete.id);
    setPendingDelete(null);
  };

  const hasAny = vacancies.length > 0;
  const nothingFound = hasAny && filtered.length === 0;
  const showKanbanAnyway = view === 'kanban' && filters.search === '';

  return (
    <div className="min-h-dvh">
      <Header onAdd={openCreate} />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <StatsPanel stats={stats} />

        {hasAny ? (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <ViewTabs value={view} onChange={setView} />
                <p className="text-sm text-slate-500 tabular-nums">
                  {filtered.length} из {vacancies.length}
                </p>
              </div>
              <FiltersBar
                filters={filters}
                counts={statusCounts}
                total={searchMatched.length}
                onChange={setFilters}
              />
            </div>

            {nothingFound && !showKanbanAnyway ? (
              <EmptyState
                title="Ничего не найдено"
                description="Попробуйте изменить поисковый запрос или выбрать другой статус."
                action={
                  <Button variant="secondary" onClick={() => { setFilters(INITIAL_FILTERS); }}>
                    Сбросить фильтры
                  </Button>
                }
              />
            ) : view === 'kanban' ? (
              <KanbanBoard
                vacancies={filtered}
                statusFilter={filters.status}
                onStatusChange={changeStatus}
                onEdit={openEdit}
                onDelete={setPendingDelete}
              />
            ) : (
              <VacancyTable
                vacancies={filtered}
                onStatusChange={changeStatus}
                onEdit={openEdit}
                onDelete={setPendingDelete}
              />
            )}
          </>
        ) : (
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
        )}
      </main>

      <VacancyModal
        open={editor.mode !== 'closed'}
        vacancy={editor.mode === 'edit' ? editor.vacancy : undefined}
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
    </div>
  );
}
