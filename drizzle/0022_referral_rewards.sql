CREATE TYPE "public"."reward_target" AS ENUM('credit', 'balance');--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'referral_active';--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'referral_reward';--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"referral_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"target" "reward_target" NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_rewards_invoice_id_unique" UNIQUE("invoice_id")
);
--> statement-breakpoint
ALTER TABLE "referral_rewards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_beneficiary_id_profiles_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referral_rewards_beneficiary" ON "referral_rewards" USING btree ("beneficiary_id","created_at");--> statement-breakpoint
CREATE INDEX "referral_rewards_referral" ON "referral_rewards" USING btree ("referral_id");