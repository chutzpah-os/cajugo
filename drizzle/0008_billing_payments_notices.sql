CREATE TYPE "public"."invoice_kind" AS ENUM('first', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('open', 'paid', 'overdue', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."notice_kind" AS ENUM('payment_confirmed', 'payment_rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('pix', 'cash', 'transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('submitted', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tax_id_type" AS ENUM('cpf', 'cnpj');--> statement-breakpoint
ALTER TYPE "public"."referral_status" ADD VALUE 'rejected';--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"kind" "invoice_kind" NOT NULL,
	"period" text,
	"membership_cents" integer NOT NULL,
	"fees_cents" integer DEFAULT 0 NOT NULL,
	"credit_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" "invoice_status" DEFAULT 'open' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" "notice_kind" NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"invoice_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"paid_cents" integer,
	"amount_cents" integer NOT NULL,
	"receipt_public_id" text,
	"receipt_format" text,
	"status" "payment_status" NOT NULL,
	"reject_reason" text,
	"manual" boolean DEFAULT false NOT NULL,
	"method" "payment_method" DEFAULT 'pix' NOT NULL,
	"note" text,
	"submitted_by" uuid NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "reject_reason" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "tax_id_type" "tax_id_type";--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "billing_day" smallint;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "next_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_submitted_by_profiles_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_first_per_store" ON "invoices" USING btree ("store_id") WHERE "invoices"."kind" = 'first';--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_store_period" ON "invoices" USING btree ("store_id","period");--> statement-breakpoint
CREATE INDEX "invoices_store_status" ON "invoices" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "notices_profile_created" ON "notices" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_status_submitted" ON "payments" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "payments_store" ON "payments" USING btree ("store_id","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_one_in_review" ON "payments" USING btree ("invoice_id") WHERE "payments"."status" = 'submitted';--> statement-breakpoint
CREATE INDEX "stores_tax_id" ON "stores" USING btree ("tax_id");--> statement-breakpoint
-- Mensalidade do Plano Catálogo (PRD §5.14, PIX-FR-001): R$ 100, valor provisório.
INSERT INTO "setting_values" ("id", "key", "value", "valid_from") VALUES
  (gen_random_uuid(), 'membership_cents', '10000', '2000-01-01T00:00:00Z');
