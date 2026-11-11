import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { STATUS_META } from '../../constants/statuses';
import {
  CURRENCIES,
  VACANCY_STATUSES,
  type Vacancy,
  type VacancyFormValues,
  type VacancyInput,
} from '../../types/vacancy';
import { currencySign, todayIso } from '../../utils/format';
import { isCurrency, isVacancyStatus } from '../../utils/storage';
import { validateVacancyForm, type FormErrors } from '../../utils/validation';
import { SelectField, TextAreaField, TextField } from '../ui/Field';

export const VACANCY_FORM_ID = 'vacancy-form';

function toFormValues(vacancy?: Vacancy): VacancyFormValues {
  if (!vacancy) {
    return {
      company: '',
      position: '',
      url: '',
      salaryMin: '',
      salaryMax: '',
      currency: 'RUB',
      appliedAt: todayIso(),
      notes: '',
      status: 'applied',
    };
  }
  return {
    company: vacancy.company,
    position: vacancy.position,
    url: vacancy.url ?? '',
    salaryMin: vacancy.salary.min?.toString() ?? '',
    salaryMax: vacancy.salary.max?.toString() ?? '',
    currency: vacancy.salary.currency,
    appliedAt: vacancy.appliedAt,
    notes: vacancy.notes ?? '',
    status: vacancy.status,
  };
}

type TextKey = Exclude<keyof VacancyFormValues, 'currency' | 'status'>;

interface VacancyFormProps {
  initial?: Vacancy;
  onSubmit: (input: VacancyInput) => void;
}

export function VacancyForm({ initial, onSubmit }: VacancyFormProps) {
  const [values, setValues] = useState<VacancyFormValues>(() => toFormValues(initial));
  const [errors, setErrors] = useState<FormErrors>({});

  const handleText =
    (key: TextKey) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = event.target.value;
      setValues((prev) => ({ ...prev, [key]: next }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateVacancyForm(values);
    if (result.ok) {
      onSubmit(result.data);
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <form id={VACANCY_FORM_ID} onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Компания"
        required
        value={values.company}
        onChange={handleText('company')}
        error={errors.company}
        placeholder="Например, Яндекс"
        autoComplete="organization"
      />
      <TextField
        label="Должность"
        required
        value={values.position}
        onChange={handleText('position')}
        error={errors.position}
        placeholder="Frontend-разработчик"
      />
      <TextField
        label="Ссылка на вакансию"
        type="url"
        inputMode="url"
        value={values.url}
        onChange={handleText('url')}
        error={errors.url}
        placeholder="https://hh.ru/vacancy/…"
        containerClassName="sm:col-span-2"
      />

      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Зарплатная вилка</legend>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <TextField
            label="От"
            inputMode="numeric"
            value={values.salaryMin}
            onChange={handleText('salaryMin')}
            error={errors.salaryMin}
            placeholder="150 000"
          />
          <TextField
            label="До"
            inputMode="numeric"
            value={values.salaryMax}
            onChange={handleText('salaryMax')}
            error={errors.salaryMax}
            placeholder="250 000"
          />
          <SelectField
            label="Валюта"
            value={values.currency}
            onChange={(event) => {
              const next = event.target.value;
              if (isCurrency(next)) setValues((prev) => ({ ...prev, currency: next }));
            }}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currencySign(currency)} {currency}
              </option>
            ))}
          </SelectField>
        </div>
      </fieldset>

      <TextField
        label="Дата отклика"
        type="date"
        required
        value={values.appliedAt}
        onChange={handleText('appliedAt')}
        error={errors.appliedAt}
      />
      <SelectField
        label="Статус"
        value={values.status}
        onChange={(event) => {
          const next = event.target.value;
          if (isVacancyStatus(next)) setValues((prev) => ({ ...prev, status: next }));
        }}
      >
        {VACANCY_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </SelectField>

      <TextAreaField
        label="Заметки"
        value={values.notes}
        onChange={handleText('notes')}
        placeholder="Контакт рекрутера, стек, впечатления…"
        rows={4}
        containerClassName="sm:col-span-2"
      />
    </form>
  );
}
