import { UserMenu } from '../auth/UserMenu';
import { Button } from '../ui/Button';
import { PlusIcon } from '../ui/Icons';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  /** Без обработчика кнопка «Добавить» не показывается (гость, загрузка) */
  onAdd?: (() => void) | undefined;
}

export function Header({ onAdd }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <div className="flex items-center gap-2.5">
          {/* Картинка в 2× размере — чётко на экранах высокой плотности; alt пустой: рядом есть название */}
          <img src="/logo-64.png" alt="" width={32} height={32} className="size-8 rounded-lg" />
          <h1 className="text-base font-semibold whitespace-nowrap text-slate-900 dark:text-slate-100 sm:text-lg">Трекер откликов</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {onAdd && (
            <Button onClick={onAdd} aria-label="Добавить вакансию" className="px-2.5 sm:px-4">
              <PlusIcon />
              <span className="hidden sm:inline">Добавить вакансию</span>
            </Button>
          )}
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
