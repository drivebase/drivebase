CREATE TYPE "public"."conflict_action" AS ENUM('overwrite', 'skip', 'rename');--> statement-breakpoint
ALTER TYPE "public"."job_status" ADD VALUE 'awaiting_conflict';--> statement-breakpoint
CREATE TABLE "operation_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"path" text NOT NULL,
	"existing_type" text NOT NULL,
	"incoming_type" text NOT NULL,
	"decision" "conflict_action",
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operations" ADD COLUMN "blanket_conflict_decision" "conflict_action";--> statement-breakpoint
ALTER TABLE "operation_conflicts" ADD CONSTRAINT "operation_conflicts_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_conflicts" ADD CONSTRAINT "operation_conflicts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conflicts_operation_idx" ON "operation_conflicts" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "conflicts_job_idx" ON "operation_conflicts" USING btree ("job_id");