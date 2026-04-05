/**
 * File: apps/nx-api/src/main.ts
 * Purpose: 啟動 Nest + 載入 .env + CORS
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// ✅ 先載入 .env（一定要在其他 import 使用 env 前）
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://app.nexoragrid.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // 瀏覽器 preflight 常帶 Accept；與 credentials: true 搭配時前端需 credentials: 'include'
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;

  console.log('[BOOT] DATABASE_URL exists =', !!process.env.DATABASE_URL);
  console.log('[BOOT] nx-api starting on port', port);

  await app.listen(port);
}

bootstrap();
