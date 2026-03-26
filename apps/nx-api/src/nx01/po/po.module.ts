/**
 * File: apps/nx-api/src/nx01/po/po.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-API-PO-MODULE-001：PO 模組
 */

import { Module } from '@nestjs/common';
import { PoController } from './controllers/po.controller';
import { PoService } from './services/po.service';
import { AuditLogModule } from '../../nx00/audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [PoController],
  providers: [PoService],
})
export class PoModule {}

