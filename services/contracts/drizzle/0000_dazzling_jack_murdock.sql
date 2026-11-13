CREATE SCHEMA "contracts";

CREATE TYPE "contracts"."contract_status" AS ENUM('active', 'completed');
CREATE TYPE "contracts"."quote_status" AS ENUM('submitted', 'adjustment_requested', 'selected', 'rejected');
CREATE TYPE "contracts"."stage_status" AS ENUM('pending', 'in_progress', 'submitted', 'approved');
CREATE TABLE "contracts"."contract_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"week_from" integer NOT NULL,
	"week_to" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "contracts"."stage_status" DEFAULT 'pending' NOT NULL,
	"rejection_message" text,
	"approved_at" timestamp with time zone,
	CONSTRAINT "contract_stages_position" UNIQUE("contract_id","position")
);

CREATE TABLE "contracts"."contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"project_title" text NOT NULL,
	"family_id" uuid NOT NULL,
	"specialist_id" uuid NOT NULL,
	"status" "contracts"."contract_status" DEFAULT 'active' NOT NULL,
	"total_cents" integer NOT NULL,
	"duration_weeks" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "contracts_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "contracts_project_id_unique" UNIQUE("project_id")
);

CREATE TABLE "contracts"."progress_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"message" text NOT NULL,
	"photo_urls" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "contracts"."quote_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"materials_cents" integer NOT NULL,
	"labor_cents" integer NOT NULL,
	"permits_cents" integer,
	"extras_cents" integer,
	"duration_weeks" integer NOT NULL,
	"scope" text NOT NULL,
	"change_note" text,
	"stages" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_versions_quote_version" UNIQUE("quote_id","version")
);

CREATE TABLE "contracts"."quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"project_title" text NOT NULL,
	"family_id" uuid NOT NULL,
	"specialist_id" uuid NOT NULL,
	"status" "contracts"."quote_status" DEFAULT 'submitted' NOT NULL,
	"adjustment_message" text,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_match_id_unique" UNIQUE("match_id")
);

CREATE TABLE "contracts"."rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);

ALTER TABLE "contracts"."contract_stages" ADD CONSTRAINT "contract_stages_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "contracts"."contracts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contracts"."contracts" ADD CONSTRAINT "contracts_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "contracts"."quotes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "contracts"."progress_updates" ADD CONSTRAINT "progress_updates_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "contracts"."contracts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contracts"."progress_updates" ADD CONSTRAINT "progress_updates_stage_id_contract_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "contracts"."contract_stages"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contracts"."quote_versions" ADD CONSTRAINT "quote_versions_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "contracts"."quotes"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "progress_contract_idx" ON "contracts"."progress_updates" USING btree ("contract_id");
CREATE INDEX "quotes_project_idx" ON "contracts"."quotes" USING btree ("project_id");
CREATE INDEX "quotes_specialist_idx" ON "contracts"."quotes" USING btree ("specialist_id");