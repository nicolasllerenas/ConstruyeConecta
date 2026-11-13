CREATE SCHEMA "reputation";

CREATE TYPE "reputation"."author_role" AS ENUM('family', 'specialist');
CREATE TABLE "reputation"."rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);

CREATE TABLE "reputation"."reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"author_role" "reputation"."author_role" NOT NULL,
	"stars" smallint NOT NULL,
	"tags" text[] NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_contract_author" UNIQUE("contract_id","author_id")
);

CREATE INDEX "reviews_subject_idx" ON "reputation"."reviews" USING btree ("subject_id");