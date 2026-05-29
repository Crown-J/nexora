import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { Nx10Module } from '../nx10/nx10.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TranslatorErrorFilter } from '../shared/filters/translator-error.filter';

import { CoEstimateController } from './co-estimate/co-estimate.controller';
import { CoEstimateService } from './co-estimate/co-estimate.service';
import { CreditGuardController } from './credit-guard/credit-guard.controller';
import { CreditGuardService } from './credit-guard/credit-guard.service';
import { PartnerGradeHistoryController } from './partner-grade-history/partner-grade-history.controller';
import { PartnerGradeHistoryService } from './partner-grade-history/partner-grade-history.service';
import { QuoteController } from './quote/quote.controller';
import { SalesPerformanceController } from './sales-performance/sales-performance.controller';
import { SalesPerformanceService } from './sales-performance/sales-performance.service';
import { QuoteService } from './quote/quote.service';
import { SalesReturnController } from './sales-return/sales-return.controller';
import { SalesReturnService } from './sales-return/sales-return.service';
import { SoController } from './so/so.controller';
import { SoService } from './so/so.service';
import { RefreshmentDocCreator } from './so/translator/refreshment-doc-creator';
import { TransferSourceResolver } from './so/translator/transfer-source-resolver';
import { SoTranslatorController } from './so/translator/translator.controller';
import { Nx04SoTranslatorService } from './so/translator/translator.service';

@Module({
  imports: [PrismaModule, Nx10Module],
  controllers: [
    QuoteController,
    SoController,
    SoTranslatorController,
    SalesReturnController,
    CreditGuardController,
    SalesPerformanceController,
    CoEstimateController,
    PartnerGradeHistoryController,
  ],
  providers: [
    QuoteService,
    SoService,
    SalesReturnService,
    Nx04SoTranslatorService,
    TransferSourceResolver,
    RefreshmentDocCreator,
    CreditGuardService,
    SalesPerformanceService,
    CoEstimateService,
    PartnerGradeHistoryService,
    { provide: APP_FILTER, useClass: TranslatorErrorFilter },
  ],
})
export class Nx04Module {}
