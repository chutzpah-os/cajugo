CREATE TABLE "setting_values" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" uuid
);
--> statement-breakpoint
ALTER TABLE "setting_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "setting_values" ADD CONSTRAINT "setting_values_changed_by_profiles_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "setting_values_key_valid_from" ON "setting_values" USING btree ("key","valid_from" DESC NULLS LAST);--> statement-breakpoint
-- Histórico só de inserção (CFG-SEC-003): correção é uma linha nova, nunca edição.
CREATE FUNCTION "setting_values_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'setting_values é só de inserção';
END $$;--> statement-breakpoint
CREATE TRIGGER "setting_values_no_update_delete"
  BEFORE UPDATE OR DELETE ON "setting_values"
  FOR EACH ROW EXECUTE FUNCTION "setting_values_append_only"();--> statement-breakpoint
-- Valores provisórios do PRD §5.14 (CFG-FR-003), vigentes desde 2000-01-01.
-- Dinheiro em centavos; porcentagem em centésimos de ponto (1,79% = 179).
INSERT INTO "setting_values" ("id", "key", "value", "valid_from") VALUES
  (gen_random_uuid(), 'support_whatsapp', '"557981360206"', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'pix', 'null', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'review_business_days', '1', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'past_due_tolerance_days', '5', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'installment_rate_bps', '179', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'cajugo_fee_bps', '100', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'require_approval', 'false', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'min_photos', '6', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'retention_days', '90', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'referral_enabled', 'true', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'referral_who', '{"store_owner": true, "seller": true, "referrer": true}', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'referral_pct_bps', '3000', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'referral_months', '3', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'payout_min_cents', '5000', '2000-01-01T00:00:00Z');
