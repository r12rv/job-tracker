import type { ComponentType, SVGProps } from 'react';
import type { ViewMode } from '../../types/vacancy';
import { BoardIcon, TableIcon } from '../ui/Icons';

interface ViewTabsProps {
  value: ViewMode;
  onChange: (view: ViewMode) => void;
}

const TABS: { value: ViewMode; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { value: 'kanban', label: 'Канбан', icon: BoardIcon },
  { value: 'table', label: 'Таблица', icon: TableIcon },
];

export function ViewTabs({ value, onChange }: ViewTabsProps) {
  return (
    <div role="tablist" aria-label="Вид отображения" className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800/70 p-1">
      {TABS.map(({ value: tab, label, icon: Icon }) => {
        const active = value === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => { onChange(tab); }}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
              active ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
