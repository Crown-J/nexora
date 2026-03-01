/**
 * File: apps/nx-api/src/nx00/warehouse/warehouse.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-WAREHOUSE-MODULE-001：Warehouse Module（LITE 統一單數命名）
 */

import { Module } from '@nestjs/common';
import { WarehouseController } from './controllers/warehouse.controller';
import { WarehouseService } from './services/warehouse.service';

@Module({
    controllers: [WarehouseController],
    providers: [WarehouseService],
})
export class WarehouseModule { }