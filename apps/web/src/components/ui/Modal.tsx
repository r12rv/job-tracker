import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './Icons';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg';
}

export function Modal({ open, title, onClose, children, footer, size = 'lg' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Актуальный onClose без перезапуска эффекта (иначе фокус прыгал бы при каждом рендере родителя)
  const handleEscape = useEffectEvent(() => {
    onClose();
  });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleEscape();
    };
    document.addEventListener('keydown', handleKey);

    const firstInput = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button');
    firstInput?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  const width = size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-2xl';
  // На телефоне большие модалки открываются на весь экран, маленькие — снизу листом
  const mobile = size === 'sm' ? 'mt-auto rounded-t-2xl' : 'h-full';

  return createPortal(
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex w-full flex-col bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl ${mobile} ${width}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Закрыть"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
