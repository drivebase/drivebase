CREATE TABLE "file_text_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"run_id" text NOT NULL,
	"source" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"model_name" text NOT NULL,
	"model_tier" "analysis_model_tier" NOT NULL,
	"embedding" vector(512) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_text_chunks" ADD CONSTRAINT "file_text_chunks_file_id_nodes_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_text_chunks" ADD CONSTRAINT "file_text_chunks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_text_chunks" ADD CONSTRAINT "file_text_chunks_run_id_file_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."file_analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "file_text_chunks_file_run_chunk_idx" ON "file_text_chunks" USING btree ("file_id","run_id","chunk_index");--> statement-breakpoint
CREATE INDEX "file_text_chunks_workspace_idx" ON "file_text_chunks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "file_text_chunks_file_idx" ON "file_text_chunks" USING btree ("file_id");