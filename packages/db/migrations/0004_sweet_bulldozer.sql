ALTER TABLE "users" ADD COLUMN "name" text;
UPDATE "users" SET "name" = split_part("email", '@', 1) WHERE "name" IS NULL OR "name" = '';
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
