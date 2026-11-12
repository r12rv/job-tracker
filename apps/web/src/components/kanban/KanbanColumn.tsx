import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { STATUS_META } from '../../constants/statuses';
import type { Vacancy, VacancyStatus } from '../../types/vacancy';
import { columnDropId } from './dnd';
import { SortableVacancyCard } from './SortableVacancyCard';

interface KanbanColumnProps {
  status: VacancyStatus;
  vacancies: Vacancy[];
  onStatusChange: (id: string, status: VacancyStatus) => void;
  onEdit: (vacancy: Vacancy) => void;
  onDelete: (vacancy: Vacancy) => void;
  /** Сюда сейчас встанет перетаскиваемая карточка */
  highlighted?: boolean;
}

export function KanbanColumn({ status, vacancies, onStatusChange, onEdit, onDelete, highlighted = false }: KanbanColumnProps) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(status) });
  const active = highlighted || isOver;

  return (
    <section
      aria-label={meta.label}
      className={`flex w-[85vw] max-w-80 shrink-0 snap-start flex-col rounded-2xl p-2 transition-colors sm:w-72 lg:w-auto lg:max-w-none lg:min-w-0 lg:flex-1 ${
        active ? 'bg-indigo-100/70' : 'bg-slate-100/80'
      }`}
    >
      <header className="flex items-center gap-2 px-2 pt-1 pb-2.5">
        <span className={`size-2 rounded-full ${meta.dot}`} />
        <h2 className="text-sm font-semibold text-slate-700">{meta.label}</h2>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
          {vacancies.length}
        </span>
      </header>
      {/* Вся область списка принимает карточку — даже если колонка пустая */}
      <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2">
        <SortableContext items={vacancies.map((vacancy) => vacancy.id)} strategy={verticalListSortingStrategy}>
          {vacancies.map((vacancy) => (
            <SortableVacancyCard
              key={vacancy.id}
              vacancy={vacancy}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {vacancies.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
            {active ? 'Отпустите здесь' : 'Пусто'}
          </p>
        )}
      </div>
    </section>
  );
}
