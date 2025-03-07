import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '@xilehq/backend/app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.NEXT_PUBLIC_FRONTEND_URL,
      credentials: true,
    },
  });

  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('Xile API')
    .setDescription('The Xile API description')
    .setVersion('1.0')
    .addTag('xile')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.BACKEND_PORT || 8000;

  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
