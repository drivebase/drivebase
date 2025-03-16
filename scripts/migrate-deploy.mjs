import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function main() {
  try {
    // Try to connect to the database
    await prisma.$connect();
    console.log('✓ Database connection successful');

    // Deploy migrations
    console.log('Deploying migrations...');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');

    if (stderr) {
      console.error('Migration stderr:', stderr);
    }

    console.log('Migration output:', stdout);
    console.log('✓ Migrations deployed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
