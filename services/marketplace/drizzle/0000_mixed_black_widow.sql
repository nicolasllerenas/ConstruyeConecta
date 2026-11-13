CREATE SCHEMA "marketplace";

CREATE TYPE "marketplace"."plan" AS ENUM('free', 'pro');
CREATE TYPE "marketplace"."project_kind" AS ENUM('build', 'expand', 'remodel', 'repair');
CREATE TYPE "marketplace"."project_status" AS ENUM('open', 'contracted', 'closed');
CREATE TYPE "marketplace"."project_timing" AS ENUM('asap', 'within_3_months', 'just_quoting');
CREATE TYPE "marketplace"."role" AS ENUM('family', 'specialist');
CREATE TYPE "marketplace"."specialist_kind" AS ENUM('engineer', 'architect', 'master_builder', 'technician');
CREATE TYPE "marketplace"."swipe_actor" AS ENUM('family', 'specialist');
CREATE TYPE "marketplace"."swipe_decision" AS ENUM('like', 'pass');
CREATE TABLE "marketplace"."matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"specialist_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_project_specialist" UNIQUE("project_id","specialist_id")
);

CREATE TABLE "marketplace"."portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"specialist_id" uuid NOT NULL,
	"url" text NOT NULL,
	"caption" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "marketplace"."profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"role" "marketplace"."role" NOT NULL,
	"display_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"reference" text,
	"district" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius_km" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "marketplace"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"kind" "marketplace"."project_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"photo_urls" text[] NOT NULL,
	"voice_note_url" text,
	"budget_min_cents" integer NOT NULL,
	"budget_max_cents" integer NOT NULL,
	"timing" "marketplace"."project_timing" NOT NULL,
	"district" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius_km" integer NOT NULL,
	"highlighted_until" timestamp with time zone,
	"status" "marketplace"."project_status" DEFAULT 'open' NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "marketplace"."rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);

CREATE TABLE "marketplace"."specialist_details" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"kind" "marketplace"."specialist_kind" NOT NULL,
	"bio" text NOT NULL,
	"specialties" text[] NOT NULL,
	"visit_fee_cents" integer NOT NULL,
	"availability" text NOT NULL,
	"avatar_url" text,
	"verified" boolean DEFAULT false NOT NULL,
	"plan" "marketplace"."plan" DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp with time zone,
	"demo" boolean DEFAULT false NOT NULL,
	"completed_jobs" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "marketplace"."swipes" (
	"project_id" uuid NOT NULL,
	"specialist_id" uuid NOT NULL,
	"actor" "marketplace"."swipe_actor" NOT NULL,
	"decision" "marketplace"."swipe_decision" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "swipes_project_id_specialist_id_actor_pk" PRIMARY KEY("project_id","specialist_id","actor")
);

ALTER TABLE "marketplace"."matches" ADD CONSTRAINT "matches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketplace"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "marketplace"."matches" ADD CONSTRAINT "matches_specialist_id_specialist_details_user_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "marketplace"."specialist_details"("user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "marketplace"."matches" ADD CONSTRAINT "matches_family_id_profiles_user_id_fk" FOREIGN KEY ("family_id") REFERENCES "marketplace"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "marketplace"."portfolio_items" ADD CONSTRAINT "portfolio_items_specialist_id_specialist_details_user_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "marketplace"."specialist_details"("user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "marketplace"."projects" ADD CONSTRAINT "projects_family_id_profiles_user_id_fk" FOREIGN KEY ("family_id") REFERENCES "marketplace"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "marketplace"."specialist_details" ADD CONSTRAINT "specialist_details_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "marketplace"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "marketplace"."swipes" ADD CONSTRAINT "swipes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketplace"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "marketplace"."swipes" ADD CONSTRAINT "swipes_specialist_id_specialist_details_user_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "marketplace"."specialist_details"("user_id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "portfolio_specialist_idx" ON "marketplace"."portfolio_items" USING btree ("specialist_id");
CREATE INDEX "projects_family_idx" ON "marketplace"."projects" USING btree ("family_id");
CREATE INDEX "projects_status_idx" ON "marketplace"."projects" USING btree ("status");