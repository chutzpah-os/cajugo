CREATE TYPE "public"."lead_channel" AS ENUM('form', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."lead_origin" AS ENUM('cajugo', 'store_catalog');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacting', 'negotiating', 'sold', 'lost');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"channel" "lead_channel" NOT NULL,
	"origin" "lead_origin" NOT NULL,
	"status" "lead_status" NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purged_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicle_daily_stats" (
	"vehicle_id" uuid NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "vehicle_daily_stats_vehicle_id_day_pk" PRIMARY KEY("vehicle_id","day")
);
--> statement-breakpoint
ALTER TABLE "vehicle_daily_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_daily_stats" ADD CONSTRAINT "vehicle_daily_stats_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_store_status_created" ON "leads" USING btree ("store_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leads_store_created" ON "leads" USING btree ("store_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leads_vehicle" ON "leads" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "leads_created_unpurged" ON "leads" USING btree ("created_at") WHERE "leads"."purged_at" is null;