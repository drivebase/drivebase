CREATE TYPE "public"."extraction_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'unsupported');--> statement-breakpoint
CREATE TABLE "file_contents" (
	"id" text PRIMARY KEY NOT NULL,
	"node_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"extracted_text" text,
	"search_vector" "tsvector",
	"extraction_method" text,
	"extraction_status" "extraction_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"language" text DEFAULT 'english',
	"page_count" integer,
	"word_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_contents_node_id_unique" UNIQUE("node_id")
);
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "smart_search_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "file_contents" ADD CONSTRAINT "file_contents_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_contents" ADD CONSTRAINT "file_contents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_contents_search_vector_idx" ON "file_contents" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "file_contents_workspace_idx" ON "file_contents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "file_contents_status_idx" ON "file_contents" USING btree ("extraction_status");