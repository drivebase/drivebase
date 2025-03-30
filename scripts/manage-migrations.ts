#!/usr/bin/env node
import { exec } from 'child_process';
import { readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MIGRATIONS_DIR = 'migrations';

async function squashMigrations(name: string) {
  try {
    console.log('⚡ Starting migration squash process...');

    // Generate SQL from current schema
    console.log('1. Generating SQL from current schema...');
    const { stdout: sql } = await execAsync(
      'npx prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script',
    );

    // Create squashed migration name with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14);
    const migrationName = `${timestamp}_squashed_${name || 'migrations'}`;

    // Create migration directory
    const migrationDir = join(MIGRATIONS_DIR, migrationName);
    await execAsync(`mkdir -p ${migrationDir}`);

    // Write migration file
    await writeFile(join(migrationDir, 'migration.sql'), `-- Squashed migrations\n\n${sql}`);

    console.log('✓ Squashed migration created successfully');
    console.log(`\nNext steps:`);
    console.log('1. Review the generated migration in:', migrationDir);
    console.log('2. Test the migration on a development database');
    console.log('3. After verification, you can delete old migrations');
  } catch (error) {
    console.error('Error during squash:', error);
    process.exit(1);
  }
}

async function validateMigrations() {
  try {
    console.log('🔍 Validating migrations...');

    // Check for migration conflicts
    const { stdout: diffOutput } = await execAsync(
      'npx prisma migrate diff --from-schema-datamodel schema.prisma --to-schema-datamodel schema.prisma',
    );

    if (diffOutput.includes('No difference detected')) {
      console.log('✓ Migrations are in sync with schema');
    } else {
      console.error('⚠️ Warning: Schema and migrations might be out of sync');
      console.log(diffOutput);
    }

    // List all migrations
    const migrations = await readdir(MIGRATIONS_DIR);
    console.log(`\nFound ${migrations.length} migrations:`);
    migrations.forEach((migration) => console.log(`- ${migration}`));
  } catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const command = process.argv[2];
const name = process.argv[3];

switch (command) {
  case 'squash':
    squashMigrations(name);
    break;
  case 'validate':
    validateMigrations();
    break;
  default:
    console.log(`
Migration Management Tool

Commands:
  squash [name]  - Squash all migrations into a single migration
  validate       - Check migration status and list all migrations

Examples:
  node manage-migrations.mjs squash init_v2
  node manage-migrations.mjs validate
    `);
}
