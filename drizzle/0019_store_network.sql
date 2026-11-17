CREATE TYPE "public"."commission_status" AS ENUM('to_receive', 'paid');--> statement-breakpoint
CREATE TYPE "public"."sale_attribution" AS ENUM('link', 'other_partner', 'store');--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"final_price_cents" integer NOT NULL,
	"attribution" "sale_attribution" NOT NULL,
	"seller_id" uuid,
	"commission_cents" integer,
	"commission_status" "commission_status",
	"fee_bps" integer,
	"fee_cents" integer,
	"invoice_id" uuid,
	"confirmed_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"canceled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "accepts_sellers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "commission_override_type" "commission_type";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "commission_override_value" integer;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "sale_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_sellers_profile_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_confirmed_by_profiles_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_vehicle_active" ON "sales" USING btree ("vehicle_id") WHERE "sales"."canceled_at" is null;--> statement-breakpoint
CREATE INDEX "sales_store_created" ON "sales" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "sales_seller_created" ON "sales" USING btree ("seller_id","created_at");