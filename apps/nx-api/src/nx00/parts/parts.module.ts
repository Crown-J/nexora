/**
 * File: apps/nx-api/src/nx00/parts/parts.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PARTS-001：Parts Module（Controller / Service）
 */

import { Module } from '@nestjs/common';
import { Nx00PartsController } from './controllers/parts.controller';
import { Nx00PartsService } from './services/parts.service';

@Module({
  controllers: [Nx00PartsController],
  providers: [Nx00PartsService],
  exports: [Nx00PartsService], // 需要被其他模組用到時保留，暫時不需要也不影響
})
export class PartsModule {}