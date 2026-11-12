import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import { STATUS_META } from '../../constants/statuses';
import { VACANCY_STATUSES, type StatusFilter, type Vacancy, type VacancyStatus } from '../../types/vacancy';
import { compareByRank } from '../../utils/vacancy';
import { CardMouseSensor, CardTouchSensor, columnDropId } from './dnd';
import { KanbanColumn } from './KanbanColumn';
import { VacancyCard } from './VacancyCard';

type ColumnIds = Record<VacancyStatus, string[]>;

interface KanbanBoardProps {
  vacancies: Vacancy[];
  statusFilter: StatusFilter;
  onStatusChange: (id: string, status: VacancyStatus) => void;
  /** Карточку перетащили: в колонку `status` сразу после `afterId` (null — в начало) */
  onMove: (id: string, status: VacancyStatus, afterId: string | null) => void;
  onEdit: (vacancy: Vacancy) => void;
  onDelete: (vacancy: Vacancy) => void;
}

function groupIds(vacancies: Vacancy[]): ColumnIds {
  const groups: Record<VacancyStatus, Vacancy[]> = { applied: [], test: [], interview: [], offer: [], rejected: [] };
  for (const vacancy of vacancies) groups[vacancy.status].push(vacancy);
  const ids = {} as ColumnIds;
  for (const status of VACANCY_STATUSES) ids[status] = groups[status].sort(compareByRank).map((v) => v.id);
  return ids;
}

/** В какой колонке сейчас элемент: id колонки или id карточки внутри неё */
function findColumn(columns: ColumnIds, id: UniqueIdentifier): VacancyStatus | undefined {
  const key = String(id);
  const byDropId = VACANCY_STATUSES.find((status) => columnDropId(status) === key);
  return byDropId ?? VACANCY_STATUSES.find((status) => columns[status].includes(key));
}

const noop = () => undefined;

export function KanbanBoard({ vacancies, statusFilter, onStatusChange, onMove, onEdit, onDelete }: KanbanBoardProps) {
  const byId = useMemo(() => new Map(vacancies.map((vacancy) => [vacancy.id, vacancy])), [vacancies]);
  const grouped = useMemo(() => groupIds(vacancies), [vacancies]);

  // Во время перетаскивания раскладка живёт локально: карточка «переезжает» между колонками под курсором,
  // а данные меняются один раз — когда её отпустили
  const [drag, setDrag] = useState<{ activeId: string; columns: ColumnIds } | null>(null);
  const columns = drag?.columns ?? grouped;
  const active = drag ? byId.get(drag.activeId) : undefined;

  const sensors = useSensors(
    useSensor(CardMouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(CardTouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleStatuses = statusFilter === 'all' ? VACANCY_STATUSES : [statusFilter];

  const handleDragStart = ({ active: dragged }: DragStartEvent) => {
    setDrag({ activeId: String(dragged.id), columns: grouped });
  };

  // Перенос в другую колонку показываем сразу, пока карточку ещё держат
  const handleDragOver = ({ active: dragged, over }: DragOverEvent) => {
    if (!drag || !over) return;
    const from = findColumn(drag.columns, dragged.id);
    const to = findColumn(drag.columns, over.id);
    if (!from || !to || from === to) return;

    const id = String(dragged.id);
    const target = drag.columns[to];
    const overIndex = target.indexOf(String(over.id));
    const insertAt = overIndex === -1 ? target.length : overIndex;
    setDrag({
      activeId: drag.activeId,
      columns: {
        ...drag.columns,
        [from]: drag.columns[from].filter((item) => item !== id),
        [to]: [...target.slice(0, insertAt), id, ...target.slice(insertAt)],
      },
    });
  };

  const handleDragEnd = ({ active: dragged, over }: DragEndEvent) => {
    const state = drag;
    setDrag(null);
    if (!state || !over) return;

    const id = String(dragged.id);
    const to = findColumn(state.columns, over.id);
    if (!to) return;

    // Итоговый порядок колонки после отпускания
    const list = state.columns[to];
    const from = list.indexOf(id);
    const overIndex = list.indexOf(String(over.id));
    const finalList = overIndex === -1 || from === -1 ? list : arrayMove(list, from, overIndex);
    const index = finalList.indexOf(id);
    const afterId = index > 0 ? (finalList[index - 1] ?? null) : null;

    // Отпустили там же, где взяли, — запрос не нужен
    const original = byId.get(id);
    if (!original) return;
    const originalList = grouped[original.status];
    const originalIndex = originalList.indexOf(id);
    const originalAfter = originalIndex > 0 ? (originalList[originalIndex - 1] ?? null) : null;
    if (original.status === to && originalAfter === afterId) return;

    onMove(id, to, afterId);
  };

  const describe = (id: UniqueIdentifier) => byId.get(String(id))?.company ?? 'карточка';
  const columnLabel = (id: UniqueIdentifier | undefined) => {
    if (id === undefined) return '';
    const status = findColumn(columns, id);
    return status ? STATUS_META[status].label : '';
  };

  // Озвучка для скринридеров — по-русски, чтобы перетаскивание с клавиатуры было понятным
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Взята карточка «${describe(a.id)}».`,
    onDragOver: ({ active: a, over }) =>
      over ? `«${describe(a.id)}» в колонке «${columnLabel(over.id)}».` : `«${describe(a.id)}» вне колонок.`,
    onDragEnd: ({ active: a, over }) =>
      over ? `«${describe(a.id)}» перенесена в колонку «${columnLabel(over.id)}».` : 'Перемещение отменено.',
    onDragCancel: ({ active: a }) => `Перемещение «${describe(a.id)}» отменено.`,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setDrag(null); }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Чтобы переместить карточку, нажмите пробел или Enter, двигайте её стрелками и снова нажмите пробел или Enter. Escape — отмена.',
        },
      }}
    >
      {/* На время перетаскивания отключаем «прилипание» прокрутки, чтобы колонки свободно прокручивались у края */}
      <div
        className={`no-scrollbar -mx-4 flex items-start scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:snap-none lg:overflow-visible lg:px-0 ${
          drag ? '' : 'snap-x snap-mandatory'
        }`}
      >
        {visibleStatuses.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            vacancies={columns[status].flatMap((id) => byId.get(id) ?? [])}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            highlighted={drag !== null && columns[status].includes(drag.activeId)}
          />
        ))}
      </div>

      {/* Карточка «в руке» рисуется поверх всего, поэтому не обрезается краями колонок */}
      <DragOverlay>
        {active ? <VacancyCard vacancy={active} onStatusChange={noop} onEdit={noop} onDelete={noop} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}
