import type { Vacancy, VacancyStatus } from '../../types/vacancy';
import { formatDate, formatSalary, hostnameOf } from '../../utils/format';
import { VacancyCard } from '../kanban/VacancyCard';
import { ExternalLinkIcon } from '../ui/Icons';
import { StatusSelect } from '../vacancy/StatusSelect';
import { VacancyActions } from '../vacancy/VacancyActions';

interface VacancyTableProps {
  vacancies: Vacancy[];
  onStatusChange: (id: string, status: VacancyStatus) => void;
  onEdit: (vacancy: Vacancy) => void;
  onDelete: (vacancy: Vacancy) => void;
}

const TH = 'px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase';

export function VacancyTable({ vacancies, onStatusChange, onEdit, onDelete }: VacancyTableProps) {
  return (
    <>
      {/* Телефон: список карточек */}
      <div className="flex flex-col gap-2 md:hidden">
        {vacancies.map((vacancy) => (
          <VacancyCard
            key={vacancy.id}
            vacancy={vacancy}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Планшет и десктоп: таблица */}
      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className={TH}>Компания</th>
              <th scope="col" className={TH}>Должность</th>
              <th scope="col" className={TH}>Зарплата</th>
              <th scope="col" className={TH}>Дата отклика</th>
              <th scope="col" className={TH}>Статус</th>
              <th scope="col" className={`${TH} sr-only`}>Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vacancies.map((vacancy) => (
              <tr key={vacancy.id} className="align-top transition-colors hover:bg-slate-50/70">
                <td className="max-w-56 px-4 py-3">
                  <div className="truncate font-medium text-slate-900" title={vacancy.company}>
                    {vacancy.company}
                  </div>
                  {vacancy.url && (
                    <a
                      href={vacancy.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-slate-500 hover:text-indigo-600"
                      title={vacancy.url}
                    >
                      <ExternalLinkIcon className="size-3 shrink-0" />
                      <span className="truncate">{hostnameOf(vacancy.url)}</span>
                    </a>
                  )}
                </td>
                <td className="max-w-64 px-4 py-3 text-sm text-slate-700">
                  <div className="truncate" title={vacancy.position}>{vacancy.position}</div>
                  {vacancy.notes && (
                    <div className="mt-0.5 truncate text-xs text-slate-400" title={vacancy.notes}>
                      {vacancy.notes}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-700">
                  {formatSalary(vacancy.salary)}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-500">
                  <time dateTime={vacancy.appliedAt}>{formatDate(vacancy.appliedAt)}</time>
                </td>
                <td className="px-4 py-3">
                  <StatusSelect value={vacancy.status} onChange={(status) => { onStatusChange(vacancy.id, status); }} />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <div className="inline-flex">
                    <VacancyActions
                      company={vacancy.company}
                      onEdit={() => { onEdit(vacancy); }}
                      onDelete={() => { onDelete(vacancy); }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
