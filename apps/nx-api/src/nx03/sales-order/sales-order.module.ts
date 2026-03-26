/**
 * File: apps/nx-api/src/nx03/sales-order/sales-order.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03-API-SALES-ORDER-MODULE-001：SO 模組
 */

import { Module } from '@nestjs/common';
import { SalesOrderController } from './controllers/sales-order.controller';
import { SalesOrderService } from './services/sales-order.service';
import { AuditLogModule } from '../../nx00/audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [SalesOrderController],
  providers: [SalesOrderService],
})
export class SalesOrderModule {}

