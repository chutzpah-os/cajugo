CREATE TYPE "public"."commission_type" AS ENUM('pct', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."partnership_origin" AS ENUM('request', 'invite');--> statement-breakpoint
CREATE TYPE "public"."partnership_status" AS ENUM('pending', 'active', 'declined', 'ended');--> statement-breakpoint
CREATE TYPE "public"."seller_status" AS ENUM('in_review', 'active', 'blocked');--> statement-breakpoint
ALTER TYPE "public"."lead_origin" ADD VALUE 'seller';--> statement-breakpoint
CREATE TABLE "partnerships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seller_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"origin" "partnership_origin" NOT NULL,
	"status" "partnership_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "partnerships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seller_vehicle_clicks" (
	"seller_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"day" date NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "seller_vehicle_clicks_seller_id_vehicle_id_day_pk" PRIMARY KEY("seller_id","vehicle_id","day")
);
--> statement-breakpoint
ALTER TABLE "seller_vehicle_clicks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sellers" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"code" text,
	"city" text NOT NULL,
	"status" "seller_status" DEFAULT 'in_review' NOT NULL,
	"document_front_public_id" text,
	"document_front_format" text,
	"document_back_public_id" text,
	"document_back_format" text,
	"blocked_reason" text,
	"decided_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sellers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "sellers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "seller_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "cpf" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pix_key" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pix_key_type" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "commission_type" "commission_type";--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "commission_value" integer;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_seller_id_sellers_profile_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_vehicle_clicks" ADD CONSTRAINT "seller_vehicle_clicks_seller_id_sellers_profile_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_vehicle_clicks" ADD CONSTRAINT "seller_vehicle_clicks_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_decided_by_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "partnerships_open" ON "partnerships" USING btree ("seller_id","store_id") WHERE "partnerships"."status" in ('pending', 'active');--> statement-breakpoint
CREATE INDEX "partnerships_store_status" ON "partnerships" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "sellers_status_created" ON "sellers" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_seller_id_sellers_profile_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_cpf" ON "profiles" USING btree ("cpf") WHERE "profiles"."cpf" is not null;