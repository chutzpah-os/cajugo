ALTER TABLE "stores" ADD COLUMN "address_street" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "address_number" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "address_complement" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "address_district" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "address_zip" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "slug_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "slug_reserved_until" timestamp with time zone;