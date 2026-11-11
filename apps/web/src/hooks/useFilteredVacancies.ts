import { useMemo } from 'react';
import type { Vacancy, VacancyFilters } from '../types/vacancy';

function byAppliedDateDesc(a: Vacancy, b: Vacancy): number {
  if (a.appliedAt !== b.appliedAt) return a.appliedAt < b.appliedAt ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

export function useFilteredVacancies(vacancies: Vacancy[], filters: VacancyFilters): Vacancy[] {
  return useMemo(() => {
    const query = filters.search.trim().toLocaleLowerCase('ru-RU');
    return vacancies
      .filter((vacancy) => filters.status === 'all' || vacancy.status === filters.status)
      .filter((vacancy) => query === '' || vacancy.company.toLocaleLowerCase('ru-RU').includes(query))
      .sort(byAppliedDateDesc);
  }, [vacancies, filters.status, filters.search]);
}
