CREATE TYPE "public"."claim_method" AS ENUM('email_code', 'social_match', 'id_document');--> statement-breakpoint
CREATE TYPE "public"."distance_category" AS ENUM('five_k', 'ten_k', 'half_marathon', 'marathon', 'ultra', 'custom');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('individual', 'relay', 'virtual');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('target_time', 'yearly_distance', 'yearly_race_count');--> statement-breakpoint
CREATE TYPE "public"."import_candidate_status" AS ENUM('pending', 'imported', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('strava', 'garmin');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('connected', 'disconnected', 'error');--> statement-breakpoint
CREATE TYPE "public"."result_source" AS ENUM('official', 'manual', 'import');--> statement-breakpoint
CREATE TYPE "public"."result_status" AS ENUM('verified', 'pending', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."terrain" AS ENUM('road', 'trail', 'track', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."upload_purpose" AS ENUM('avatar', 'claim_evidence', 'result_evidence');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('runner', 'organizer', 'admin');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"runner_id" uuid NOT NULL,
	"method" "claim_method" NOT NULL,
	"evidence_url" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "edit_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"proposed_changes" jsonb NOT NULL,
	"reason" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "event_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"date" date NOT NULL,
	"results_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"city" text NOT NULL,
	"province" text NOT NULL,
	"region" text NOT NULL,
	"website" text,
	"description" text,
	"distances" jsonb NOT NULL,
	"terrain" "terrain" NOT NULL,
	"organizer_id" uuid,
	"logo_url" text,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"runner_id" uuid NOT NULL,
	"type" "goal_type" NOT NULL,
	"distance_category" "distance_category",
	"target_value" numeric NOT NULL,
	"deadline" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"distance_meters" integer NOT NULL,
	"elapsed_ms" integer NOT NULL,
	"status" "import_candidate_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"status" "integration_status" DEFAULT 'connected' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sync_at" timestamp with time zone,
	"auto_import" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ph_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" text NOT NULL,
	"province" text NOT NULL,
	"city" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"label" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_keys_keyHash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "organizers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"runner_id" uuid NOT NULL,
	"event_id" uuid,
	"edition_id" uuid,
	"event_name" text NOT NULL,
	"edition_year" integer NOT NULL,
	"date" date NOT NULL,
	"location" text NOT NULL,
	"distance_category" "distance_category" NOT NULL,
	"distance_meters" integer NOT NULL,
	"official_time_ms" integer NOT NULL,
	"overall_rank" integer,
	"gender_rank" integer,
	"age_group_rank" integer,
	"age_group" text,
	"field_size" integer,
	"bib" text,
	"splits" jsonb,
	"terrain" "terrain" NOT NULL,
	"event_type" "event_type" NOT NULL,
	"source" "result_source" NOT NULL,
	"status" "result_status" NOT NULL,
	"weather" text,
	"notes" text,
	"evidence_url" text,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "runners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"display_name" text NOT NULL,
	"photo_url" text,
	"nationality" char(2) DEFAULT 'PH' NOT NULL,
	"city" text,
	"province" text,
	"region" text,
	"club" text,
	"gender" "gender",
	"birth_year" integer,
	"bio" text,
	"is_claimed" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"hide_age" boolean DEFAULT false NOT NULL,
	"hide_club" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"purpose" "upload_purpose" NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "refresh_tokens_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"display_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"runner_id" uuid,
	"organizer_id" uuid,
	"providers" jsonb,
	"deletion_requested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edit_requests" ADD CONSTRAINT "edit_requests_result_id_race_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."race_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edit_requests" ADD CONSTRAINT "edit_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edit_requests" ADD CONSTRAINT "edit_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_editions" ADD CONSTRAINT "event_editions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_candidates" ADD CONSTRAINT "import_candidates_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_edition_id_event_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."event_editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "claims_pending_user_runner_idx" ON "claims" USING btree ("user_id","runner_id") WHERE "claims"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "event_editions_event_id_year_idx" ON "event_editions" USING btree ("event_id","year");--> statement-breakpoint
CREATE INDEX "events_name_idx" ON "events" USING btree ("name");--> statement-breakpoint
CREATE INDEX "goals_runner_id_idx" ON "goals" USING btree ("runner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_candidates_integration_id_external_id_idx" ON "import_candidates" USING btree ("integration_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_user_id_provider_idx" ON "integrations" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "ph_locations_region_province_city_idx" ON "ph_locations" USING btree ("region","province","city");--> statement-breakpoint
CREATE INDEX "api_keys_organizer_id_idx" ON "api_keys" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "race_results_runner_id_date_idx" ON "race_results" USING btree ("runner_id","date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "race_results_edition_distance_time_idx" ON "race_results" USING btree ("edition_id","distance_category","official_time_ms");--> statement-breakpoint
CREATE INDEX "runners_display_name_idx" ON "runners" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "uploads_owner_user_id_idx" ON "uploads" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");