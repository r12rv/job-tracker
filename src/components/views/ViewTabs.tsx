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
    <div role="tablist" aria-label="Вид отображения" className="inline-flex rounded-lg bg-slate-200/70 p-1">
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
              active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
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
