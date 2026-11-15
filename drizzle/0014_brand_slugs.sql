-- Marcas com nome corrigido que a 0012 não cobriu (DSC-FR-011, D3): só o slug muda; o nome da FIPE fica.
UPDATE "vehicles" SET "make_slug" = 'kia' WHERE "make_slug" = 'kia-motors';--> statement-breakpoint
UPDATE "vehicles" SET "make_slug" = 'caoa-chery' WHERE "make_slug" = 'caoa-chery-chery';
