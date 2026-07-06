import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { PrismaModule } from '../prisma/prisma.module';
import { TranslatorErrorFilter } from '../shared/filters/translator-error.filter';

import { BundleController } from './bundle/bundle.controller';
import { BundleService } from './bundle/bundle.service';
import { CoEstimateController } from './co-estimate/co-estimate.controller';
import { CoEstimateService } from './co-estimate/co-estimate.service';
import { CreditGuardController } from './credit-guard/credit-guard.controller';
import { CreditGuardService } from './credit-guard/credit-guard.service';
import { Nx04IssueReportController } from './issue-report/issue-report.controller';
import { Nx04IssueReportService } from './issue-report/issue-report.service';
import { PartnerGradeHistoryController } from './partner-grade-history/partner-grade-history.controller';
import { PartnerGradeHistoryService } from './partner-grade-history/partner-grade-history.service';
import { PromotionEngineService } from './promotion/promotion-engine.service';
import { PromotionController } from './promotion/promotion.controller';
import { PromotionService } from './promotion/promotion.service';
import { QuoteController } from './quote/quote.controller';
import { InquiryRecordController, QuoteRecordController } from './record/record.controller';
import { RecordService } from './record/record.service';
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
  imports: [PrismaModule],
  controllers: [
    QuoteController,
    QuoteRecordController,
    InquiryRecordController,
    SoController,
    SoTranslatorController,
    SalesReturnController,
    CreditGuardController,
    SalesPerformanceController,
    CoEstimateController,
    PartnerGradeHistoryController,
    Nx04IssueReportController,
    PromotionController,
    BundleController,
  ],
  providers: [
    QuoteService,
    RecordService,
    SoService,
    SalesReturnService,
    Nx04SoTranslatorService,
    TransferSourceResolver,
    RefreshmentDocCreator,
    CreditGuardService,
    SalesPerformanceService,
    CoEstimateService,
    PartnerGradeHistoryService,
    Nx04IssueReportService,
    PromotionService,
    PromotionEngineService,
    BundleService,
    { provide: APP_FILTER, useClass: TranslatorErrorFilter },
  ],
  // F1 特價售出 2026-06-08：export SoService 給 NX03 IssueReportService.dispose('X') 建特價 SO 用
  // F1-E 引擎 2026-06-09：export PromotionEngineService 給 SoService 開單時取建議價 + 警示用
  exports: [SoService, PromotionEngineService],
})
export class Nx04Module {}
