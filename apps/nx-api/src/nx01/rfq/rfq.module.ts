/**
 * File: apps/nx-api/src/nx01/rfq/rfq.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-API-RFQ-MODULE-001：RFQ 模組
 */

import { Module } from '@nestjs/common';
import { RfqController } from './controllers/rfq.controller';
import { RfqService } from './services/rfq.service';
import { AuditLogModule } from '../../nx00/audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [RfqController],
  providers: [RfqService],
})
export class RfqModule {}

