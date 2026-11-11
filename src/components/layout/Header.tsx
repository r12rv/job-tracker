import { Button } from '../ui/Button';
import { BriefcaseIcon, PlusIcon } from '../ui/Icons';

interface HeaderProps {
  onAdd: () => void;
}

export function Header({ onAdd }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BriefcaseIcon className="size-4" />
          </span>
          <h1 className="text-base font-semibold text-slate-900 sm:text-lg">Трекер откликов</h1>
        </div>
        <Button onClick={onAdd} aria-label="Добавить вакансию">
          <PlusIcon />
          <span className="hidden sm:inline">Добавить вакансию</span>
          <span className="sm:hidden">Добавить</span>
        </Button>
      </div>
    </header>
  );
}
