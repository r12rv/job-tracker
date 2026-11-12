import { vacancyInputSchema, vacancyMoveSchema, vacancyStatusUpdateSchema } from '@job-tracker/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono, type ValidationTargets } from 'hono';
import type { AuthedEnv } from '../app';
import { z } from 'zod';
import type { VacancyRepository } from './repository';

const idParamSchema = z.object({ id: z.uuid() });

/**
 * Валидатор с единым форматом ошибки 400: { error, issues: [{ path, message }] }.
 * Сообщения — из общих Zod-схем, те же, что видит пользователь в форме.
 */
function validate<Target extends keyof ValidationTargets, Schema extends z.ZodType>(target: Target, schema: Schema) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'validation_error',
          issues: result.error.issues.map((issue) => ({
            path: issue.path.map(String).join('.'),
            message: issue.message,
          })),
        },
        400,
      );
    }
    return undefined;
  });
}

const notFound = { error: 'not_found' } as const;

export function createVacancyRoutes(repository: VacancyRepository) {
  // userId кладёт middleware requireUser в app.ts — до этих маршрутов без сессии не дойти
  return new Hono<AuthedEnv>()
    .get('/', async (c) => c.json(await repository.list(c.get('userId'))))

    .get('/:id', validate('param', idParamSchema), async (c) => {
      const vacancy = await repository.findById(c.get('userId'), c.req.valid('param').id);
      return vacancy ? c.json(vacancy) : c.json(notFound, 404);
    })

    .post('/', validate('json', vacancyInputSchema), async (c) => {
      const vacancy = await repository.create(c.get('userId'), c.req.valid('json'));
      return c.json(vacancy, 201);
    })

    .put('/:id', validate('param', idParamSchema), validate('json', vacancyInputSchema), async (c) => {
      const vacancy = await repository.update(c.get('userId'), c.req.valid('param').id, c.req.valid('json'));
      return vacancy ? c.json(vacancy) : c.json(notFound, 404);
    })

    .patch('/:id/status', validate('param', idParamSchema), validate('json', vacancyStatusUpdateSchema), async (c) => {
      const vacancy = await repository.setStatus(c.get('userId'), c.req.valid('param').id, c.req.valid('json').status);
      return vacancy ? c.json(vacancy) : c.json(notFound, 404);
    })

    // Перетаскивание в канбане: колонка и место в ней. 409 — соседняя карточка изменилась, клиент перечитает список
    .patch('/:id/move', validate('param', idParamSchema), validate('json', vacancyMoveSchema), async (c) => {
      const result = await repository.move(c.get('userId'), c.req.valid('param').id, c.req.valid('json'));
      if (result.ok) return c.json(result.vacancy);
      return result.reason === 'conflict' ? c.json({ error: 'conflict' } as const, 409) : c.json(notFound, 404);
    })

    .delete('/:id', validate('param', idParamSchema), async (c) => {
      const deleted = await repository.remove(c.get('userId'), c.req.valid('param').id);
      return deleted ? c.body(null, 204) : c.json(notFound, 404);
    });
}
