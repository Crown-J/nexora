/**
 * File: apps/nx-api/src/nx00/brand/brand.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-BRAND-MODULE-001：Brand Module（LITE 統一單數命名）
 *
 * Notes:
 * - 匯入 AuditLogModule 以便 BrandService 寫入操作紀錄（CREATE/UPDATE/SET_ACTIVE）
 */

import { Module } from '@nestjs/common';
import { BrandController } from './controllers/brand.controller';
import { BrandService } from './services/brand.service';

import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [BrandController],
    providers: [BrandService],
})
export class BrandModule { }