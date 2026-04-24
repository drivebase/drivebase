DROP INDEX "upload_sessions_plan_uq";--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD COLUMN "dst_path" text NOT NULL;--> statement-breakpoint
CREATE INDEX "upload_sessions_plan_idx" ON "upload_sessions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "upload_sessions_plan_path_idx" ON "upload_sessions" USING btree ("plan_id","dst_path");