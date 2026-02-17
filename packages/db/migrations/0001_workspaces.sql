-- Create workspace_role enum
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'editor', 'viewer');

-- Create workspaces table
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" DEFAULT 'viewer' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create workspace_invites table
CREATE TABLE IF NOT EXISTS "workspace_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"token" text NOT NULL,
	"role" "workspace_role" DEFAULT 'viewer' NOT NULL,
	"expires_at" timestamp with time zone,
	"max_uses" integer,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invites_token_unique" UNIQUE("token")
);

-- Add foreign keys for workspaces
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Add foreign keys for workspace_members
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Add foreign keys for workspace_invites
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Create unique index on workspace_members
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");

-- Step 1: Add nullable workspace_id to provider tables
ALTER TABLE "storage_providers" ADD COLUMN "workspace_id" text;
ALTER TABLE "oauth_provider_credentials" ADD COLUMN "workspace_id" text;

-- Step 2: Backfill - create a workspace for each existing user and migrate their providers
DO $$
DECLARE
	r RECORD;
	ws_id text;
	ws_slug text;
	slug_suffix int;
BEGIN
	FOR r IN SELECT id, name, email FROM users LOOP
		-- Generate a slug from email prefix
		ws_slug := lower(regexp_replace(split_part(r.email, '@', 1), '[^a-z0-9]', '-', 'g'));
		-- Ensure uniqueness by appending a suffix if needed
		slug_suffix := 0;
		WHILE EXISTS (SELECT 1 FROM workspaces WHERE slug = CASE WHEN slug_suffix = 0 THEN ws_slug ELSE ws_slug || '-' || slug_suffix END) LOOP
			slug_suffix := slug_suffix + 1;
		END LOOP;
		IF slug_suffix > 0 THEN
			ws_slug := ws_slug || '-' || slug_suffix;
		END IF;

		-- Generate a nanoid-like ID (21 chars alphanumeric)
		ws_id := substr(md5(random()::text || clock_timestamp()::text), 1, 21);

		-- Create workspace
		INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at)
		VALUES (ws_id, COALESCE(r.name, 'My Workspace'), ws_slug, r.id, now(), now());

		-- Add user as owner
		INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, created_at, updated_at)
		VALUES (substr(md5(random()::text || clock_timestamp()::text), 1, 21), ws_id, r.id, 'owner', now(), now(), now());

		-- Migrate their providers
		UPDATE storage_providers SET workspace_id = ws_id WHERE user_id = r.id;
		UPDATE oauth_provider_credentials SET workspace_id = ws_id WHERE user_id = r.id;
	END LOOP;
END $$;

-- Step 3: Make workspace_id NOT NULL and add FKs
ALTER TABLE "storage_providers" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "storage_providers" ADD CONSTRAINT "storage_providers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "oauth_provider_credentials" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "oauth_provider_credentials" ADD CONSTRAINT "oauth_provider_credentials_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;

-- Step 4: Drop user_id from provider tables
ALTER TABLE "storage_providers" DROP CONSTRAINT "storage_providers_user_id_users_id_fk";
ALTER TABLE "storage_providers" DROP COLUMN "user_id";

DROP INDEX IF EXISTS "oauth_provider_credentials_user_type_identifier_idx";
ALTER TABLE "oauth_provider_credentials" DROP CONSTRAINT "oauth_provider_credentials_user_id_users_id_fk";
ALTER TABLE "oauth_provider_credentials" DROP COLUMN "user_id";

-- Create new unique index for oauth credentials with workspace_id
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_provider_credentials_workspace_type_identifier_idx" ON "oauth_provider_credentials" USING btree ("workspace_id","type","identifier_value");

-- Step 5: Drop role from users and user_role enum
ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE IF EXISTS "public"."user_role";
