ALTER TABLE "workspace_ai_settings" ADD COLUMN IF NOT EXISTS "models_ready" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_ai_settings" ADD COLUMN IF NOT EXISTS "config" jsonb DEFAULT '{}'::jsonb NOT NULL;
