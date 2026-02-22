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

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS（你之前的）
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;

  console.log('[BOOT] DATABASE_URL exists =', !!process.env.DATABASE_URL);
  console.log('[BOOT] nx-api starting on port', port);

  await app.listen(port);
}

bootstrap();
