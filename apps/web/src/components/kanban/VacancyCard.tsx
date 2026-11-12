import type { Vacancy, VacancyStatus } from '../../types/vacancy';
import { formatDate, formatSalary, hostnameOf } from '../../utils/format';
import { ExternalLinkIcon } from '../ui/Icons';
import { StatusSelect } from '../vacancy/StatusSelect';
import { VacancyActions } from '../vacancy/VacancyActions';

interface VacancyCardProps {
  vacancy: Vacancy;
  onStatusChange: (id: string, status: VacancyStatus) => void;
  onEdit: (vacancy: Vacancy) => void;
  onDelete: (vacancy: Vacancy) => void;
  /** Карточка «в руке» во время перетаскивания: приподнята и слегка повёрнута */
  lifted?: boolean;
}

export function VacancyCard({ vacancy, onStatusChange, onEdit, onDelete, lifted = false }: VacancyCardProps) {
  const hasSalary = vacancy.salary.min !== undefined || vacancy.salary.max !== undefined;

  return (
    <article
      className={`group rounded-xl bg-white p-3.5 ring-1 transition-shadow ${
        lifted ? 'rotate-2 cursor-grabbing shadow-xl ring-indigo-300' : 'shadow-sm ring-slate-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900" title={vacancy.company}>
            {vacancy.company}
          </h3>
          <p className="truncate text-sm text-slate-600" title={vacancy.position}>
            {vacancy.position}
          </p>
        </div>
        <div className="-mt-1.5 -mr-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <VacancyActions
            company={vacancy.company}
            onEdit={() => { onEdit(vacancy); }}
            onDelete={() => { onDelete(vacancy); }}
          />
        </div>
      </div>

      {hasSalary && (
        <p className="mt-2 text-sm font-medium text-slate-800">{formatSalary(vacancy.salary)}</p>
      )}

      {vacancy.notes && (
        <p className="mt-2 line-clamp-2 text-xs whitespace-pre-line text-slate-500">{vacancy.notes}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <StatusSelect value={vacancy.status} onChange={(status) => { onStatusChange(vacancy.id, status); }} />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {vacancy.url && (
            <a
              href={vacancy.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-32 items-center gap-1 truncate hover:text-indigo-600"
              title={vacancy.url}
            >
              <ExternalLinkIcon className="size-3.5 shrink-0" />
              <span className="truncate">{hostnameOf(vacancy.url)}</span>
            </a>
          )}
          <time dateTime={vacancy.appliedAt}>{formatDate(vacancy.appliedAt)}</time>
        </div>
      </div>
    </article>
  );
}
