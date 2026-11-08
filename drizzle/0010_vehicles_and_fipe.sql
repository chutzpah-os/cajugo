CREATE TYPE "public"."vehicle_status" AS ENUM('draft', 'pending_approval', 'published', 'hidden', 'sold', 'deleted');--> statement-breakpoint
CREATE TABLE "fipe_brands" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fipe_brands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fipe_models" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_id" text NOT NULL,
	"name" text NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fipe_models" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fipe_prices" (
	"year_id" text PRIMARY KEY NOT NULL,
	"fipe_code" text NOT NULL,
	"price_cents" integer NOT NULL,
	"month" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fipe_prices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fipe_years" (
	"id" text PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"label" text NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fipe_years" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicle_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicle_photos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"public_id" text NOT NULL,
	"position" smallint NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"status" "vehicle_status" DEFAULT 'draft' NOT NULL,
	"fipe_brand_id" text,
	"fipe_model_id" text,
	"fipe_year_id" text,
	"make" text,
	"model" text,
	"version" text,
	"year_manufacture" smallint,
	"year_model" smallint,
	"mileage_km" integer,
	"transmission" text,
	"fuel" text,
	"body" text,
	"color" text,
	"doors" smallint,
	"engine" text,
	"plate" text,
	"plate_end" text,
	"chassis" text,
	"price_cents" integer,
	"fipe_code" text,
	"fipe_price_cents" integer,
	"fipe_month" text,
	"show_installment" boolean DEFAULT false NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"features" text[] DEFAULT '{}'::text[] NOT NULL,
	"description" text,
	"contact_whatsapp" text,
	"share_on_cajugo" boolean DEFAULT true NOT NULL,
	"share_before_sale" boolean,
	"published_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vehicle_history" ADD CONSTRAINT "vehicle_history_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_history" ADD CONSTRAINT "vehicle_history_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_photos" ADD CONSTRAINT "vehicle_photos_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fipe_models_brand" ON "fipe_models" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "fipe_years_model" ON "fipe_years" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "vehicle_history_vehicle" ON "vehicle_history" USING btree ("vehicle_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_photos_position" ON "vehicle_photos" USING btree ("vehicle_id","position");--> statement-breakpoint
CREATE INDEX "vehicles_store_status" ON "vehicles" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "vehicles_status_share" ON "vehicles" USING btree ("status","share_on_cajugo");