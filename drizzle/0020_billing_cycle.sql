CREATE TYPE "public"."credit_kind" AS ENUM('overpayment', 'fee_refund', 'referral');--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'invoice_due';--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'store_suspended';--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'store_reactivated';--> statement-breakpoint
CREATE TABLE "billing_credits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"kind" "credit_kind" NOT NULL,
	"amount_cents" integer NOT NULL,
	"source_id" uuid,
	"applied_invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_credits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "past_due_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_credits" ADD CONSTRAINT "billing_credits_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credits" ADD CONSTRAINT "billing_credits_applied_invoice_id_invoices_id_fk" FOREIGN KEY ("applied_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_credits_store_open" ON "billing_credits" USING btree ("store_id") WHERE "billing_credits"."applied_invoice_id" is null;--> statement-breakpoint
CREATE INDEX "invoices_open_due" ON "invoices" USING btree ("status","due_at");