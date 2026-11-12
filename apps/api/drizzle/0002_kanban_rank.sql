ALTER TABLE "vacancies" ADD COLUMN "rank" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Существующие вакансии сохраняют привычный порядок: в каждой колонке свежие отклики сверху
UPDATE "vacancies" AS v
SET "rank" = ordered.rn - 1
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "user_id", "status" ORDER BY "applied_at" DESC, "created_at" DESC) AS rn
  FROM "vacancies"
) AS ordered
WHERE v."id" = ordered."id";--> statement-breakpoint
CREATE INDEX "vacancies_user_id_status_rank_idx" ON "vacancies" USING btree ("user_id","status","rank");