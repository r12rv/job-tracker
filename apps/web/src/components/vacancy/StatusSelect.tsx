import { STATUS_META } from '../../constants/statuses';
import { VACANCY_STATUSES, type VacancyStatus } from '../../types/vacancy';
import { isVacancyStatus } from '@job-tracker/shared';

interface StatusSelectProps {
  value: VacancyStatus;
  onChange: (status: VacancyStatus) => void;
  label?: string;
}

/** Компактный выпадающий список статуса в виде бейджа */
export function StatusSelect({ value, onChange, label = 'Статус' }: StatusSelectProps) {
  const meta = STATUS_META[value];
  return (
    <div className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (isVacancyStatus(next)) onChange(next);
        }}
        className={`cursor-pointer appearance-none rounded-full py-1 pr-7 pl-2.5 text-xs font-medium ring-1 ring-inset focus:ring-2 focus:outline-none ${meta.badge}`}
      >
        {VACANCY_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 opacity-70"
      >
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
      </svg>
    </div>
  );
}
