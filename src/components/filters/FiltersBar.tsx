import { STATUS_META } from '../../constants/statuses';
import { VACANCY_STATUSES, type StatusFilter, type VacancyFilters, type VacancyStatus } from '../../types/vacancy';
import { SearchIcon, XIcon } from '../ui/Icons';

interface FiltersBarProps {
  filters: VacancyFilters;
  counts: Record<VacancyStatus, number>;
  total: number;
  onChange: (filters: VacancyFilters) => void;
}

interface ChipOption {
  value: StatusFilter;
  label: string;
  count: number;
  dot?: string;
}

export function FiltersBar({ filters, counts, total, onChange }: FiltersBarProps) {
  const options: ChipOption[] = [
    { value: 'all', label: 'Все', count: total },
    ...VACANCY_STATUSES.map((status) => ({
      value: status,
      label: STATUS_META[status].label,
      count: counts[status],
      dot: STATUS_META[status].dot,
    })),
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative lg:w-72">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => { onChange({ ...filters, search: event.target.value }); }}
          placeholder="Поиск по компании"
          aria-label="Поиск по компании"
          className="block h-10 w-full rounded-lg border-0 bg-white pr-9 pl-9 text-base text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => { onChange({ ...filters, search: '' }); }}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label="Очистить поиск"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Фильтр по статусу"
        className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-0"
      >
        {options.map((option) => {
          const active = filters.status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => { onChange({ ...filters, status: option.value }); }}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 ring-inset hover:bg-slate-50'
              }`}
            >
              {option.dot && <span className={`size-1.5 rounded-full ${option.dot}`} />}
              {option.label}
              <span className={`tabular-nums ${active ? 'text-slate-300' : 'text-slate-400'}`}>{option.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
