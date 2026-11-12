import { MouseSensor, TouchSensor } from '@dnd-kit/core';
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
