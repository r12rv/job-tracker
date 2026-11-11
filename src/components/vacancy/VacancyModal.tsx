import type { Vacancy, VacancyInput } from '../../types/vacancy';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { VACANCY_FORM_ID, VacancyForm } from './VacancyForm';

interface VacancyModalProps {
  open: boolean;
  vacancy?: Vacancy;
  onClose: () => void;
  onSubmit: (input: VacancyInput) => void;
}

export function VacancyModal({ open, vacancy, onClose, onSubmit }: VacancyModalProps) {
  const isEdit = vacancy !== undefined;
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
          <Button type="submit" form={VACANCY_FORM_ID} className="w-full sm:w-auto">
            {isEdit ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      {/* key сбрасывает состояние формы при переключении между вакансиями */}
      <VacancyForm key={vacancy?.id ?? 'new'} initial={vacancy} onSubmit={onSubmit} />
    </Modal>
  );
}
