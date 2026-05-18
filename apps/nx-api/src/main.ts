/**
 * File: apps/nx-api/src/main.ts
 * Purpose: 啟動 Nest + 載入 .env + CORS
 *
 * 2026-05-18 TASK-AUTH-ERROR-CODE：ValidationPipe exceptionFactory 解析 DTO message 中的
 * [XX-NNN] 前綴 → 轉為 NexoraHttpException 帶 errorCode（規範 v1.1 §7）。
 * 對齊既有：未帶 [XX-NNN] 前綴的 message 仍 fallback 走 NestJS 預設 BadRequestException。
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// ✅ 先載入 .env（一定要在其他 import 使用 env 前）
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

import { BadRequestException, HttpStatus, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NEXORA_ERROR_CODE_REGEX, NexoraHttpException } from './shared/errors/nexora-error';

const ERROR_CODE_PREFIX_REGEX = /^\[([A-Z]{2}-\d{3})\](.+)$/;

/** 從 DTO message 中拔出 [XX-NNN] 前綴；無前綴回 null。 */
function extractErrorCodeFromMessage(message: string): { errorCode: string; cleanMessage: string } | null {
  const m = ERROR_CODE_PREFIX_REGEX.exec(message);
  if (!m) return null;
  const errorCode = m[1]!;
  if (!NEXORA_ERROR_CODE_REGEX.test(errorCode)) return null;
  return { errorCode, cleanMessage: m[2]!.trim() };
}

/** 取第一個 ValidationError 的第一個 constraint message（深度優先、含 nested children）。*/
function firstConstraintMessage(errors: ValidationError[]): string | null {
  for (const err of errors) {
    if (err.constraints) {
      const vals = Object.values(err.constraints);
      if (vals.length) return vals[0]!;
    }
    if (err.children && err.children.length) {
      const inner = firstConstraintMessage(err.children);
      if (inner) return inner;
    }
  }
  return null;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) => {
        const raw = firstConstraintMessage(errors);
        if (raw) {
          const parsed = extractErrorCodeFromMessage(raw);
          if (parsed) {
            return new NexoraHttpException({
              statusCode: HttpStatus.BAD_REQUEST,
              errorCode: parsed.errorCode,
              message: parsed.cleanMessage,
            });
          }
        }
        return new BadRequestException(errors);
      },
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
