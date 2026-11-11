import { useCallback } from 'react';
import { STORAGE_KEY } from '../constants/statuses';
import type { Vacancy, VacancyInput, VacancyStatus } from '../types/vacancy';
import { parseVacancies } from '../utils/storage';
import { useLocalStorage } from './useLocalStorage';

const EMPTY: Vacancy[] = [];

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function withStatus(vacancy: Vacancy, status: VacancyStatus, now: string): Vacancy {
  if (vacancy.status === status) return vacancy;
  return {
    ...vacancy,
    status,
    statusHistory: [...vacancy.statusHistory, { status, changedAt: now }],
    updatedAt: now,
  };
}

export interface UseVacanciesResult {
  vacancies: Vacancy[];
  addVacancy: (input: VacancyInput) => void;
  updateVacancy: (id: string, input: VacancyInput) => void;
  removeVacancy: (id: string) => void;
  changeStatus: (id: string, status: VacancyStatus) => void;
}

export function useVacancies(): UseVacanciesResult {
  const [vacancies, setVacancies] = useLocalStorage<Vacancy[]>(STORAGE_KEY, EMPTY, parseVacancies);

  const addVacancy = useCallback(
    (input: VacancyInput) => {
      const now = new Date().toISOString();
      const vacancy: Vacancy = {
        ...input,
        id: createId(),
        statusHistory: [{ status: input.status, changedAt: now }],
        createdAt: now,
        updatedAt: now,
      };
      setVacancies((prev) => [vacancy, ...prev]);
    },
    [setVacancies],
  );

  const updateVacancy = useCallback(
    (id: string, input: VacancyInput) => {
      const now = new Date().toISOString();
      setVacancies((prev) =>
        prev.map((vacancy) => {
          if (vacancy.id !== id) return vacancy;
          const { status, ...fields } = input;
          return withStatus({ ...vacancy, ...fields, updatedAt: now }, status, now);
        }),
      );
    },
    [setVacancies],
  );

  const removeVacancy = useCallback(
    (id: string) => {
      setVacancies((prev) => prev.filter((vacancy) => vacancy.id !== id));
    },
    [setVacancies],
  );

  const changeStatus = useCallback(
    (id: string, status: VacancyStatus) => {
      const now = new Date().toISOString();
      setVacancies((prev) =>
        prev.map((vacancy) => (vacancy.id === id ? withStatus(vacancy, status, now) : vacancy)),
      );
    },
    [setVacancies],
  );

  return { vacancies, addVacancy, updateVacancy, removeVacancy, changeStatus };
}
