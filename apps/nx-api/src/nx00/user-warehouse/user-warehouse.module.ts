/**
 * File: apps/nx-api/src/nx00/user-warehouse/user-warehouse.module.ts
 */

import { Module } from '@nestjs/common';
import { UserWarehouseController } from './controllers/user-warehouse.controller';
import { UserWarehouseService } from './services/user-warehouse.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [UserWarehouseController],
    providers: [UserWarehouseService],
})
export class UserWarehouseModule {}
