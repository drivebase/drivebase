import 'dotenv/config';
import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());

  const port = process.env.BACKEND_PORT || 8000;

  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}`);

  process.on('SIGINT', () => {
    app
      .close()
      .then(() => {
        Logger.log('SIGINT signal received: closing HTTP server');
        process.exit(0);
      })
      .catch((err) => {
        Logger.error('Error closing HTTP server', err);
        process.exit(1);
      });
  });
}

bootstrap().catch((err) => {
  Logger.error('Error starting application', err);
  process.exit(1);
});
