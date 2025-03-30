import 'dotenv/config';
import { join } from 'path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

const DATABASE_URL = process.env.DATABASE_URL;
const migrations = join(__dirname, 'migrations/*.ts');

const AppDataSource = new DataSource({
  migrations: [migrations],
  type: 'postgres',
  url: DATABASE_URL,
  entities: ['**/*.entity.ts'],
  synchronize: false,
  logging: ['error', 'query', 'schema'],
  dropSchema: true,
});

export default AppDataSource;
