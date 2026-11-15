ALTER TABLE "stores" ADD COLUMN "city_slug" text GENERATED ALWAYS AS (trim(both '-' from regexp_replace(lower(translate(city, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ', 'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn')), '[^a-z0-9]+', '-', 'g')) || '-' || lower(state)) STORED;--> statement-breakpoint
CREATE INDEX "stores_city_slug_status" ON "stores" USING btree ("city_slug","status");--> statement-breakpoint
CREATE INDEX "vehicles_status_model_slug" ON "vehicles" USING btree ("status","model_slug");--> statement-breakpoint
-- Marcas com nome corrigido (DSC-FR-011, D3): só o slug muda; o nome da FIPE fica.
UPDATE "vehicles" SET "make_slug" = 'chevrolet' WHERE "make_slug" = 'gm-chevrolet';--> statement-breakpoint
UPDATE "vehicles" SET "make_slug" = 'volkswagen' WHERE "make_slug" = 'vw-volkswagen';
