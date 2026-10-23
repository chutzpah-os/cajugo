CREATE TYPE "public"."store_status" AS ENUM('registered', 'payment_review', 'active', 'past_due', 'suspended', 'cancel_scheduled', 'canceled', 'archived');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'store_staff';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'seller';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'referrer';--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "roles" "user_role"[] DEFAULT '{}'::user_role[] NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_panel" "user_role";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "temp_password_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "status" "store_status" DEFAULT 'registered' NOT NULL;--> statement-breakpoint
-- Copia o papel único antigo para a lista de papéis (001/T002). A coluna role sai na 0003.
UPDATE "profiles" SET "roles" = ARRAY["role"] WHERE "role" IS NOT NULL AND cardinality("roles") = 0;