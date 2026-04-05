DO $$ BEGIN
 CREATE TYPE "public"."cognitive_domain" AS ENUM('memory', 'attention', 'processing_speed', 'executive_function', 'language', 'visuospatial');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exercise_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"exercise_id" varchar(100) NOT NULL,
	"domain" "cognitive_domain" NOT NULL,
	"difficulty" integer DEFAULT 2 NOT NULL,
	"raw_score" real,
	"normalized_score" real,
	"user_response" varchar(8000),
	"duration_seconds" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"metadata" jsonb
);
