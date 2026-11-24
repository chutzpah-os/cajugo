ALTER TYPE "public"."notice_kind" ADD VALUE 'cancel_scheduled';--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'cancel_undone';--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'store_canceled';--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'plan_changed';--> statement-breakpoint
DROP INDEX "invoices_first_per_store";--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "cancel_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "active_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "canceled_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_first_open_per_store" ON "invoices" USING btree ("store_id") WHERE "invoices"."kind" = 'first' and "invoices"."status" = 'open';