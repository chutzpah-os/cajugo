ALTER TYPE "public"."notice_kind" ADD VALUE 'sale_confirmed';--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'commission_received';--> statement-breakpoint
ALTER TYPE "public"."notice_kind" ADD VALUE 'commission_unreceived';--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "commission_received_at" timestamp with time zone;