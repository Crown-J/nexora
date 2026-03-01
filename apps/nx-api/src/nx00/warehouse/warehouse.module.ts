/**
 * File: apps/nx-api/src/nx00/warehouse/warehouse.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-WAREHOUSE-MODULE-001：Warehouse Module（LITE 統一單數命名）
 *
 * Notes:
 * - 匯入 AuditLogModule 以便 WarehouseService 寫入操作紀錄（CREATE/UPDATE/SET_ACTIVE）
 */

import { Module } from '@nestjs/common';
import { WarehouseController } from './controllers/warehouse.controller';
import { WarehouseService } from './services/warehouse.service';

import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [WarehouseController],
    providers: [WarehouseService],
})
export class WarehouseModule { }