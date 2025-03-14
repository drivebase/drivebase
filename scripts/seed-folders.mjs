import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** @type {import('@prisma/client').File[]} */
const folders = [
  {
    name: 'Documents',
    isFolder: true,
  },
  {
    name: 'Images',
    isFolder: true,
  },
  {
    name: 'Videos',
    isFolder: true,
  },
  {
    name: 'Personal',
    isFolder: true,
  },
];

async function seedFolders() {
  const workspaces = await prisma.workspace.findMany();

  for (const workspace of workspaces) {
    for (const folder of folders) {
      await prisma.file.create({
        data: { ...folder, workspaceId: workspace.id },
      });
    }
  }
}

seedFolders();
