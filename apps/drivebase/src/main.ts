import 'dotenv/config';
import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { TransformInterceptor } from './helpers/transform.response';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());

  const reflector = new Reflector();
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

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
