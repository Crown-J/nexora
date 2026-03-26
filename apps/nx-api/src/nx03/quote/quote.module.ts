/**
 * File: apps/nx-api/src/nx03/quote/quote.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03-API-QUOTE-MODULE-001：QUOTE 模組
 */

import { Module } from '@nestjs/common';
import { QuoteController } from './controllers/quote.controller';
import { QuoteService } from './services/quote.service';
import { AuditLogModule } from '../../nx00/audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}

