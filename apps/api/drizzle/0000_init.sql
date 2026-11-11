CREATE TYPE "public"."currency" AS ENUM('RUB', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."vacancy_status" AS ENUM('applied', 'test', 'interview', 'offer', 'rejected');--> statement-breakpoint
CREATE TABLE "vacancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"position" text NOT NULL,
	"url" text,
	"salary_min" integer,
	"salary_max" integer,
	"currency" "currency" DEFAULT 'RUB' NOT NULL,
	"applied_at" date NOT NULL,
	"notes" text,
	"status" "vacancy_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vacancies_salary_non_negative" CHECK ("vacancies"."salary_min" >= 0 AND "vacancies"."salary_max" >= 0),
	CONSTRAINT "vacancies_salary_range" CHECK ("vacancies"."salary_min" IS NULL OR "vacancies"."salary_max" IS NULL OR "vacancies"."salary_min" <= "vacancies"."salary_max")
);
--> statement-breakpoint
CREATE TABLE "vacancy_status_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vacancy_id" uuid NOT NULL,
	"status" "vacancy_status" NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vacancy_status_changes" ADD CONSTRAINT "vacancy_status_changes_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vacancies_applied_at_idx" ON "vacancies" USING btree ("applied_at");--> statement-breakpoint
CREATE INDEX "vacancy_status_changes_vacancy_id_idx" ON "vacancy_status_changes" USING btree ("vacancy_id","changed_at");