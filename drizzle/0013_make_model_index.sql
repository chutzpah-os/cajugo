DROP INDEX "vehicles_status_model_slug";--> statement-breakpoint
CREATE INDEX "vehicles_make_model_slug" ON "vehicles" USING btree ("make_slug","model_slug");