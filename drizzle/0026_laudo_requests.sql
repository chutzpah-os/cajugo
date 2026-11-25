CREATE TYPE "public"."laudo_status" AS ENUM('awaiting_pix', 'paid', 'sent');--> statement-breakpoint
CREATE TABLE "laudo_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"status" "laudo_status" DEFAULT 'awaiting_pix' NOT NULL,
	"name" text,
	"whatsapp" text,
	"email" text,
	"plate" text,
	"vehicle" text,
	"vehicle_id" uuid,
	"price_cents" integer NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"paid_by" uuid,
	"sent_at" timestamp with time zone,
	"sent_by" uuid,
	"purged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "laudo_requests_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "laudo_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "laudo_requests" ADD CONSTRAINT "laudo_requests_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laudo_requests" ADD CONSTRAINT "laudo_requests_paid_by_profiles_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laudo_requests" ADD CONSTRAINT "laudo_requests_sent_by_profiles_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "laudo_requests_status_created" ON "laudo_requests" USING btree ("status","created_at");--> statement-breakpoint
-- Preço da consulta veicular do LaudoCaju (016, LAU-FR-007): valor inicial editável em [4c].
INSERT INTO "setting_values" ("id", "key", "value", "valid_from") VALUES
  (gen_random_uuid(), 'laudo_price_cents', '7000', '2000-01-01T00:00:00Z');
