CREATE TYPE "public"."referral_status" AS ENUM('invited', 'registered', 'active', 'paused', 'ended');--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"profile_id" uuid,
	"campaign_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
ALTER TABLE "referral_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"referrer_id" uuid,
	"referred_store_id" uuid NOT NULL,
	"status" "referral_status" DEFAULT 'registered' NOT NULL,
	"months_paid" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_referred_store_id_unique" UNIQUE("referred_store_id")
);
--> statement-breakpoint
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "store_slug_redirects" (
	"old_slug" text PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_slug_redirects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_code_referral_codes_code_fk" FOREIGN KEY ("code") REFERENCES "public"."referral_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_profiles_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_store_id_stores_id_fk" FOREIGN KEY ("referred_store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_slug_redirects" ADD CONSTRAINT "store_slug_redirects_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referrals_referrer_status" ON "referrals" USING btree ("referrer_id","status");--> statement-breakpoint
ALTER TABLE "stores" DROP COLUMN "address";