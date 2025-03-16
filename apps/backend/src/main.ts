import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '@drivebase/backend/app.module';
import cookieParser from 'cookie-parser';
import { TransformInterceptor } from '@drivebase/internal/helpers/transform.response';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.VITE_PUBLIC_APP_URL,
      credentials: true,
    },
  });

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());

  const reflector = new Reflector();
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  const config = new DocumentBuilder()
    .setTitle('Drivebase API')
    .setDescription('The Drivebase API description')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.BACKEND_PORT || 8000;

  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
