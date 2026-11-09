ALTER TABLE "vehicles" ADD COLUMN "make_slug" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "model_slug" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', search_text)) STORED;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "rank_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "vehicles_search" ON "vehicles" USING gin ("search");--> statement-breakpoint
CREATE INDEX "vehicles_status_rank" ON "vehicles" USING btree ("status","rank_score" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "vehicles_status_price" ON "vehicles" USING btree ("status","price_cents","id");--> statement-breakpoint
CREATE INDEX "vehicles_status_published" ON "vehicles" USING btree ("status","published_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "vehicles_store_status_rank" ON "vehicles" USING btree ("store_id","status","rank_score" DESC NULLS LAST,"id");--> statement-breakpoint
-- Parcela estimada (PRD §5.14, SHW-FR-003): valores iniciais editáveis em [4c].
INSERT INTO "setting_values" ("id", "key", "value", "valid_from") VALUES
  (gen_random_uuid(), 'installment_down_bps', '2000', '2000-01-01T00:00:00Z'),
  (gen_random_uuid(), 'installment_months', '48', '2000-01-01T00:00:00Z');
