import { useMemo } from 'react';
import { INTERVIEW_OR_LATER } from '../constants/statuses';
import type { Vacancy, VacancyStats } from '../types/vacancy';

/** Вакансия считается дошедшей до собеседования, если когда-либо была в этом статусе или дальше */
function reachedInterview(vacancy: Vacancy): boolean {
  return (
    INTERVIEW_OR_LATER.includes(vacancy.status) ||
    vacancy.statusHistory.some((change) => INTERVIEW_OR_LATER.includes(change.status))
  );
}

export function useStats(vacancies: Vacancy[]): VacancyStats {
  return useMemo(() => {
    const total = vacancies.length;
    const interviews = vacancies.filter(reachedInterview).length;
    const offers = vacancies.filter((vacancy) => vacancy.status === 'offer').length;
    const active = vacancies.filter(
      (vacancy) => vacancy.status !== 'offer' && vacancy.status !== 'rejected',
    ).length;

    return {
      total,
      reachedInterview: interviews,
      interviewRate: total === 0 ? 0 : Math.round((interviews / total) * 100),
      offers,
      active,
    };
  }, [vacancies]);
}
