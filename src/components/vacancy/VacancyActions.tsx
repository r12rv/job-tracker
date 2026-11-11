import { PencilIcon, TrashIcon } from '../ui/Icons';

interface VacancyActionsProps {
  company: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function VacancyActions({ company, onEdit, onDelete }: VacancyActionsProps) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Редактировать: ${company}`}
        title="Редактировать"
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Удалить: ${company}`}
        title="Удалить"
      >
        <TrashIcon />
      </button>
    </div>
  );
}
