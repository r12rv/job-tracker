import type { Vacancy, VacancyStatus } from '../types/vacancy';

/** Новая версия вакансии с другим статусом и записью в истории — так же, как это делает сервер */
export function withStatus(vacancy: Vacancy, status: VacancyStatus, now = new Date().toISOString()): Vacancy {
  return {
    ...vacancy,
    status,
    statusHistory: [...vacancy.statusHistory, { status, changedAt: now }],
    updatedAt: now,
  };
}
