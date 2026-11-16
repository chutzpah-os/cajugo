CREATE TYPE "public"."search_alert_status" AS ENUM('pending', 'notified', 'canceled', 'expired');--> statement-breakpoint
CREATE TABLE "search_alerts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"status" "search_alert_status" DEFAULT 'pending' NOT NULL,
	"name" text,
	"phone" text,
	"query" text NOT NULL,
	"discovery_path" text,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"notified_by" uuid
);
--> statement-breakpoint
ALTER TABLE "search_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "search_alerts" ADD CONSTRAINT "search_alerts_notified_by_profiles_id_fk" FOREIGN KEY ("notified_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "search_alerts_pending_search" ON "search_alerts" USING btree ("phone","query",coalesce("discovery_path", '')) WHERE "search_alerts"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "search_alerts_status_created" ON "search_alerts" USING btree ("status","created_at");--> statement-breakpoint
-- Validade do "Avisar quando chegar" (PRD §5.14, ALR-FR-005): valor inicial editável em [4c].
INSERT INTO "setting_values" ("id", "key", "value", "valid_from") VALUES
  (gen_random_uuid(), 'search_alert_validity_days', '90', '2000-01-01T00:00:00Z');
