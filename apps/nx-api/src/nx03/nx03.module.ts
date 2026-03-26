/**
 * File: apps/nx-api/src/nx03/nx03.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03-API-ROOT-001：NX03 銷售域聚合（QUOTE / SO）
 */

import { Module } from '@nestjs/common';
import { QuoteModule } from './quote/quote.module';
import { SalesOrderModule } from './sales-order/sales-order.module';

@Module({
  imports: [QuoteModule, SalesOrderModule],
})
export class Nx03Module {}

