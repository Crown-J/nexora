/**
 * File: apps/nx-api/src/nx00/location/location.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOCATION-MODULE-001：Location Module（LITE 統一單數命名）
 *
 * Notes:
 * - 匯入 AuditLogModule 以便 LocationService 寫入操作紀錄（CREATE/UPDATE/SET_ACTIVE）
 */

import { Module } from '@nestjs/common';
import { LocationController } from './controllers/location.controller';
import { LocationService } from './services/location.service';

import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [LocationController],
    providers: [LocationService],
})
export class LocationModule { }