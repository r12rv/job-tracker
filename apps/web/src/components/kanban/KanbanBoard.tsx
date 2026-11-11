import { useMemo } from 'react';
import { VACANCY_STATUSES, type Vacancy, type VacancyStatus, type StatusFilter } from '../../types/vacancy';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  vacancies: Vacancy[];
  statusFilter: StatusFilter;
  onStatusChange: (id: string, status: VacancyStatus) => void;
  onEdit: (vacancy: Vacancy) => void;
  onDelete: (vacancy: Vacancy) => void;
}

export function KanbanBoard({ vacancies, statusFilter, onStatusChange, onEdit, onDelete }: KanbanBoardProps) {
  const grouped = useMemo(() => {
    const groups: Record<VacancyStatus, Vacancy[]> = {
      applied: [],
      test: [],
      interview: [],
      offer: [],
      rejected: [],
    };
    for (const vacancy of vacancies) groups[vacancy.status].push(vacancy);
    return groups;
  }, [vacancies]);

  const columns = statusFilter === 'all' ? VACANCY_STATUSES : [statusFilter];

  return (
    <div className="no-scrollbar -mx-4 flex items-start snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:snap-none lg:overflow-visible lg:px-0">
      {columns.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          vacancies={grouped[status]}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
