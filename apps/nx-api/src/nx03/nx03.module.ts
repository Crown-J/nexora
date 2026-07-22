// apps/nx-api/src/nx03/nx03.module.ts
import { Module } from '@nestjs/common';

import { Nx02Module } from '../nx02/nx02.module';
import { Nx04Module } from '../nx04/nx04.module';
import { PrismaModule } from '../prisma/prisma.module';

import { ArCalculatorService } from './auto-replenish/ar-calculator.service';
import { ArSchedulerService } from './auto-replenish/ar-scheduler.service';
import { ArSuggestionWriterService } from './auto-replenish/ar-suggestion-writer.service';
import { AutoReplenishController } from './auto-replenish/auto-replenish.controller';
import { PartReplacementService } from './auto-replenish/part-replacement.service';
import { BrandAllocationRuleController } from './brand-allocation-rule/brand-allocation-rule.controller';
import { BrandAllocationRuleService } from './brand-allocation-rule/brand-allocation-rule.service';
import { ConversionController } from './conversion/conversion.controller';
import { ConversionService } from './conversion/conversion.service';
import { DisposalController } from './disposal/disposal.controller';
import { DisposalService } from './disposal/disposal.service';
import { InboundController } from './inbound/inbound.controller';
import { InboundService } from './inbound/inbound.service';
import { InitController } from './init/init.controller';
import { InitService } from './init/init.service';
import { IssueReportController } from './issue-report/issue-report.controller';
import { IssueReportService } from './issue-report/issue-report.service';
import { OutboundController } from './outbound/outbound.controller';
import { OutboundService } from './outbound/outbound.service';
import { PartStockSettingController } from './part-stock-setting/part-stock-setting.controller';
import { PartStockSettingService } from './part-stock-setting/part-stock-setting.service';
import { PackPoolController } from './pack-pool/pack-pool.controller';
import { PackPoolService } from './pack-pool/pack-pool.service';
import { ParcelController } from './parcel/parcel.controller';
import { ParcelService } from './parcel/parcel.service';
import { PickPoolController } from './pick-pool/pick-pool.controller';
import { PickPoolService } from './pick-pool/pick-pool.service';
import { PkController } from './pk/pk.controller';
import { PkService } from './pk/pk.service';
import { PlController } from './pl/pl.controller';
import { PlService } from './pl/pl.service';
import { StockBalanceController } from './stock-balance/stock-balance.controller';
import { StockBalanceService } from './stock-balance/stock-balance.service';
import { StockLedgerController } from './stock-ledger/stock-ledger.controller';
import { StockLedgerService } from './stock-ledger/stock-ledger.service';
import { StockQueryController } from './stock-query/stock-query.controller';
import { StockQueryService } from './stock-query/stock-query.service';
import { StockReservationController } from './stock-reservation/stock-reservation.controller';
import { Nx03StockReservationService } from './stock-reservation/stock-reservation.service';
import { StockTakeController } from './stocktake/stocktake.controller';
import { StockTakeService } from './stocktake/stocktake.service';
import { TransferController } from './transfer/transfer.controller';
import { TransferService } from './transfer/transfer.service';

@Module({
  // F1 特價售出 2026-06-08：import Nx04Module 取 SoService（給 IssueReportService.dispose('X') 用）
  // Nx04Module 不依賴 Nx03Module、無 circular、可直接 import
  // W5 異常鏈 Step 3 2026-07-11：import Nx02Module 取 PurchaseReturnService/WarrantyClaimService
  // （dispose 一鍵開單用；Nx02Module 只依賴 PrismaModule、無 circular）
  imports: [PrismaModule, Nx02Module, Nx04Module],
  controllers: [
    StockBalanceController,
    StockLedgerController,
    StockQueryController,
    StockReservationController,
    PartStockSettingController,
    BrandAllocationRuleController,
    AutoReplenishController,
    InitController,
    DisposalController,
    ConversionController,
    IssueReportController,
    PkController,
    PickPoolController,
    PlController,
    ParcelController,
    PackPoolController,
    InboundController,
    OutboundController,
    StockTakeController,
    TransferController,
  ],
  providers: [
    StockBalanceService,
    StockLedgerService,
    StockQueryService,
    Nx03StockReservationService,
    PartStockSettingService,
    BrandAllocationRuleService,
    PartReplacementService,
    ArCalculatorService,
    ArSuggestionWriterService,
    ArSchedulerService,
    InitService,
    DisposalService,
    ConversionService,
    IssueReportService,
    PkService,
    PickPoolService,
    PlService,
    ParcelService,
    PackPoolService,
    InboundService,
    OutboundService,
    StockTakeService,
    TransferService,
  ],
})
export class Nx03Module {}
