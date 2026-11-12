import type { Vacancy, VacancyInput } from '../../types/vacancy';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { VACANCY_FORM_ID, VacancyForm } from './VacancyForm';

interface VacancyModalProps {
  open: boolean;
  vacancy?: Vacancy | undefined;
  /** Идёт сохранение на сервере: кнопка заблокирована, повторная отправка невозможна */
  saving?: boolean;
  onClose: () => void;
  onSubmit: (input: VacancyInput) => void;
}

export function VacancyModal({ open, vacancy, saving = false, onClose, onSubmit }: VacancyModalProps) {
  const isEdit = vacancy !== undefined;
  const submitLabel = isEdit ? 'Сохранить' : 'Добавить';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Редактирование вакансии' : 'Новая вакансия'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button type="submit" form={VACANCY_FORM_ID} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Сохранение…' : submitLabel}
          </Button>
        </>
      }
    >
      {/* key сбрасывает состояние формы при переключении между вакансиями */}
      <VacancyForm
        key={vacancy?.id ?? 'new'}
        initial={vacancy}
        onSubmit={(input) => {
          if (!saving) onSubmit(input);
        }}
      />
    </Modal>
  );
}
