import { useMemo, useState, type ReactNode } from 'react';
import { useFilteredVacancies } from '../../hooks/useFilteredVacancies';
import { useStats } from '../../hooks/useStats';
import type { Vacancy, VacancyFilters, VacancyStatus, ViewMode } from '../../types/vacancy';
import { FiltersBar } from '../filters/FiltersBar';
import { KanbanBoard } from '../kanban/KanbanBoard';
import { EmptyState } from '../layout/EmptyState';
import { StatsPanel } from '../stats/StatsPanel';
import { VacancyTable } from '../table/VacancyTable';
import { Button } from '../ui/Button';
import { ViewTabs } from '../views/ViewTabs';

const INITIAL_FILTERS: VacancyFilters = { status: 'all', search: '' };

interface TrackerBoardProps {
  vacancies: Vacancy[];
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onStatusChange: (id: string, status: VacancyStatus) => void;
  onEdit: (vacancy: Vacancy) => void;
  onDelete: (vacancy: Vacancy) => void;
  /** Что показать, когда вакансий нет совсем */
  emptyState: ReactNode;
}

/**
 * Интерфейс трекера без привязки к источнику данных: статистика, вид, фильтры, канбан или таблица.
 * Его используют и рабочая страница (данные с сервера), и демо на стартовой странице (примерные данные в памяти),
 * поэтому демо всегда совпадает с настоящим интерфейсом.
 */
export function TrackerBoard({
  vacancies,
  view,
  onViewChange,
  onStatusChange,
  onEdit,
  onDelete,
  emptyState,
}: TrackerBoardProps) {
  const [filters, setFilters] = useState<VacancyFilters>(INITIAL_FILTERS);

  const stats = useStats(vacancies);
  const filtered = useFilteredVacancies(vacancies, filters);

  // Счётчики на чипах учитывают поиск, но не выбранный статус
  const searchMatched = useFilteredVacancies(vacancies, { status: 'all', search: filters.search });
  const statusCounts = useMemo(() => {
    const counts: Record<VacancyStatus, number> = { applied: 0, test: 0, interview: 0, offer: 0, rejected: 0 };
    for (const vacancy of searchMatched) counts[vacancy.status] += 1;
    return counts;
  }, [searchMatched]);

  const hasAny = vacancies.length > 0;
  const nothingFound = hasAny && filtered.length === 0;
  const showKanbanAnyway = view === 'kanban' && filters.search === '';

  return (
    <>
      <StatsPanel stats={stats} />

      {hasAny ? (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <ViewTabs value={view} onChange={onViewChange} />
              <p className="text-sm text-slate-500 tabular-nums">
                {filtered.length} из {vacancies.length}
              </p>
            </div>
            <FiltersBar filters={filters} counts={statusCounts} total={searchMatched.length} onChange={setFilters} />
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
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ) : (
            <VacancyTable vacancies={filtered} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />
          )}
        </>
      ) : (
        emptyState
      )}
    </>
  );
}
