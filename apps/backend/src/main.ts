import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from '@xile/backend/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: 'http://localhost:4200',
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

  const port = process.env.PORT || 3000;

  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
