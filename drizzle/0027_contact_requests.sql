CREATE TYPE "public"."contact_status" AS ENUM('pending', 'handled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."contact_topic" AS ENUM('auction_waitlist', 'password_help');--> statement-breakpoint
CREATE TABLE "contact_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"topic" "contact_topic" NOT NULL,
	"status" "contact_status" DEFAULT 'pending' NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"handled_by" uuid
);
--> statement-breakpoint
ALTER TABLE "contact_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_handled_by_profiles_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_requests_status_created" ON "contact_requests" USING btree ("status","created_at");