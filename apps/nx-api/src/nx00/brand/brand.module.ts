/**
 * File: apps/nx-api/src/nx00/brand/brand.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-BRAND-MODULE-001：Brand Module（LITE 統一單數命名）
 */

import { Module } from '@nestjs/common';
import { BrandController } from './controllers/brand.controller';
import { BrandService } from './services/brand.service';

@Module({
    controllers: [BrandController],
    providers: [BrandService],
})
export class BrandModule { }