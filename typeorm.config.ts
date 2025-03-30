import { config } from 'dotenv';
import { join } from 'path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['**/*.entity.ts'],
  migrations: [join(__dirname, 'src/migrations/*.ts')],
  synchronize: false,
  logging: ['error', 'query', 'schema'],
});

export default AppDataSource;
