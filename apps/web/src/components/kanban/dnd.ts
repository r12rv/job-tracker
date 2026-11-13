import { closestCenter, closestCorners, MouseSensor, pointerWithin, TouchSensor, type CollisionDetection } from '@dnd-kit/core';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import type { VacancyStatus } from '../../types/vacancy';

/** id колонки для dnd-kit: отличается от id карточек, чтобы можно было бросить карточку в пустую колонку */
export const columnDropId = (status: VacancyStatus) => `column:${status}`;

/** Нажатие пришлось на кнопку, ссылку или поле — это не начало перетаскивания */
function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, a, input, select, textarea, label') !== null;
}

/**
 * Мышь: перетаскивание начинается, только если нажали на саму карточку, а не на её кнопки.
 * Порог в 5px (задаётся в KanbanBoard) отличает клик от перетаскивания.
 */
export class CardMouseSensor extends MouseSensor {
  static override activators = [
    {
      eventName: 'onMouseDown' as const,
      handler: ({ nativeEvent }: ReactMouseEvent) => nativeEvent.button === 0 && !isInteractive(nativeEvent.target),
    },
  ];
}

/**
 * Палец: перетаскивание после долгого нажатия (задержка в KanbanBoard),
 * поэтому обычный свайп по-прежнему прокручивает колонки и страницу.
 */
export class CardTouchSensor extends TouchSensor {
  static override activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: ({ nativeEvent }: ReactTouchEvent) => nativeEvent.touches.length === 1 && !isInteractive(nativeEvent.target),
    },
  ];
}

/**
 * Куда встанет карточка при перетаскивании мышью или пальцем: то, что прямо под курсором, —
 * карточка, а если её нет, колонка (пустое место колонки — «в конец»). Курсор между колонками —
 * ближайшая по углам.
 */
export const pointerCollision: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  if (underPointer.length === 0) return closestCorners(args);
  const cards = underPointer.filter((collision) => !String(collision.id).startsWith('column:'));
  return cards.length > 0 ? cards : underPointer;
};

/**
 * С клавиатуры курсора нет: ближайшая по центру карточка, поэтому каждая стрелка сразу сдвигает
 * карточку на одно место. Колонки участвуют, только если пустые, — иначе большая колонка
 * «перетягивала» бы на себя соседние карточки.
 */
export function keyboardCollision(emptyColumnIds: ReadonlySet<string>): CollisionDetection {
  return (args) =>
    closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) => !String(container.id).startsWith('column:') || emptyColumnIds.has(String(container.id)),
      ),
    });
}
