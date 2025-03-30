import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1743083251102 implements MigrationInterface {
  name = 'Migration1743083251102';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."provider_type_enum" AS ENUM('LOCAL', 'GOOGLE_DRIVE', 'AMAZON_S3', 'DROPBOX', 'ONEDRIVE', 'TELEGRAM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."provider_authtype_enum" AS ENUM('NONE', 'OAUTH2', 'API_KEY', 'BASIC')`,
    );
    await queryRunner.query(
      `CREATE TABLE "provider" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "type" "public"."provider_type_enum" NOT NULL, "authType" "public"."provider_authtype_enum" NOT NULL, "credentials" json NOT NULL, "metadata" json, "isActive" boolean NOT NULL DEFAULT true, "workspaceId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6ab2f66d8987bf1bfdd6136a2d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_faaa24371bbc67cdfc62fc04f1" ON "provider" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dcfb7e7c3dea489222af8b0b45" ON "provider" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "file" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "isFolder" boolean NOT NULL DEFAULT false, "parentPath" character varying(1000) NOT NULL, "path" character varying(1000) NOT NULL, "mimeType" character varying(255), "size" double precision, "isStarred" boolean NOT NULL DEFAULT false, "referenceId" character varying(255), "workspaceId" uuid, "providerId" uuid, "parentId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_36b46d232307066b3a2c9ea3a1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a6b3b927fe2ad2bda57fc63f6b" ON "file" ("parentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a50a89c70778e24a63a92a40d" ON "file" ("providerId", "referenceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8891cb02f060ba483f8bcedd94" ON "file" ("workspaceId", "path") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'USER', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "workspace" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ca86b6f9b3be5fe26d307d09b49" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider" ADD CONSTRAINT "FK_dcfb7e7c3dea489222af8b0b458" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "file" ADD CONSTRAINT "FK_de468b3d8dcf7e94f7074220929" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "file" ADD CONSTRAINT "FK_028390e1dc7af2f3c6cd0e2d2bf" FOREIGN KEY ("providerId") REFERENCES "provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "file" ADD CONSTRAINT "FK_a6b3b927fe2ad2bda57fc63f6b2" FOREIGN KEY ("parentId") REFERENCES "file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace" ADD CONSTRAINT "FK_51f2194e4a415202512807d2f63" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace" DROP CONSTRAINT "FK_51f2194e4a415202512807d2f63"`,
    );
    await queryRunner.query(`ALTER TABLE "file" DROP CONSTRAINT "FK_a6b3b927fe2ad2bda57fc63f6b2"`);
    await queryRunner.query(`ALTER TABLE "file" DROP CONSTRAINT "FK_028390e1dc7af2f3c6cd0e2d2bf"`);
    await queryRunner.query(`ALTER TABLE "file" DROP CONSTRAINT "FK_de468b3d8dcf7e94f7074220929"`);
    await queryRunner.query(
      `ALTER TABLE "provider" DROP CONSTRAINT "FK_dcfb7e7c3dea489222af8b0b458"`,
    );
    await queryRunner.query(`DROP TABLE "workspace"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8891cb02f060ba483f8bcedd94"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9a50a89c70778e24a63a92a40d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a6b3b927fe2ad2bda57fc63f6b"`);
    await queryRunner.query(`DROP TABLE "file"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dcfb7e7c3dea489222af8b0b45"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_faaa24371bbc67cdfc62fc04f1"`);
    await queryRunner.query(`DROP TABLE "provider"`);
    await queryRunner.query(`DROP TYPE "public"."provider_authtype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."provider_type_enum"`);
  }
}
