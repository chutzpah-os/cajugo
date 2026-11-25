ALTER TYPE "public"."report_reason" ADD VALUE 'provenance_omitted' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "origin" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "damage" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "gnv" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "remarked" boolean;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "lien" boolean;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "judicial_restriction" boolean;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "theft" boolean;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "provenance_declared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "provenance_declared_by" uuid;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_provenance_declared_by_profiles_id_fk" FOREIGN KEY ("provenance_declared_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicles_status_origin_damage" ON "vehicles" USING btree ("status","origin","damage");