import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Vacancy, VacancyStatus } from '../../types/vacancy';
import { VacancyCard } from './VacancyCard';

interface SortableVacancyCardProps {
  vacancy: Vacancy;
  onStatusChange: (id: string, status: VacancyStatus) => void;
  onEdit: (vacancy: Vacancy) => void;
  onDelete: (vacancy: Vacancy) => void;
}

/**
 * Карточка, которую можно перетаскивать. Пока её тащат, на месте остаётся полупрозрачная «тень».
 * Роль — элемент списка, а не кнопка (как по умолчанию в dnd-kit): внутри карточки свои кнопки,
 * ссылка и выбор статуса, а вложенные интерактивные элементы сбивают скринридеры.
 */
export function SortableVacancyCard({ vacancy, ...handlers }: SortableVacancyCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: vacancy.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-roledescription="перетаскиваемая карточка"
      aria-label={`${vacancy.company}, ${vacancy.position}`}
      className={`rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 md:cursor-grab ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <VacancyCard vacancy={vacancy} {...handlers} />
    </div>
  );
}
