/**
 * File: apps/nx-api/src/nx00/part/part.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PART-MODULE-001：Part Module（LITE 統一單數命名）
 */

import { Module } from '@nestjs/common';
import { PartController } from './controllers/part.controller';
import { PartService } from './services/part.service';

@Module({
    controllers: [PartController],
    providers: [PartService],
})
export class PartModule { }