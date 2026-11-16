CREATE TYPE "public"."report_reason" AS ENUM('sold', 'unreal_price', 'wrong_photos', 'scam', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'kept', 'hidden');--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'vehicle_hidden';--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'vehicle_shown';--> statement-breakpoint
CREATE TABLE "vehicle_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "hidden_reason" "report_reason";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "hidden_note" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "hidden_by" uuid;--> statement-breakpoint
ALTER TABLE "vehicle_reports" ADD CONSTRAINT "vehicle_reports_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_reports" ADD CONSTRAINT "vehicle_reports_decided_by_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicle_reports_open" ON "vehicle_reports" USING btree ("vehicle_id","created_at") WHERE "vehicle_reports"."status" = 'open';--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_hidden_by_profiles_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;