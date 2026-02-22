/**
 * File: apps/nx-api/src/prisma/prisma.module.ts
 * Project: NEXORA (Monorepo)
 * Purpose: NX00-API-002 PrismaModule（集中提供 PrismaService 並 export 給其他 Module 注入使用）
 * Notes:
 * - 目前 Nx00PartsService 需要 PrismaService，請確保 Nx00Module 有 import PrismaModule（或將此 Module 設為 Global）
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
