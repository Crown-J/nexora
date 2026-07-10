// apps/nx-api/src/nx02/nx02.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { PrismaModule } from '../prisma/prisma.module';
import { Nx02ErrorFilter } from '../shared/filters/nx02-error.filter';

import { DemandController } from './demand/demand.controller';
import { DemandService } from './demand/demand.service';
import { PartnerPartController } from './partner-part/partner-part.controller';
import { PartnerPartService } from './partner-part/partner-part.service';
import { PoController } from './po/po.controller';
import { PoService } from './po/po.service';
import { PriceComparisonController } from './price-comparison/price-comparison.controller';
import { PriceComparisonService } from './price-comparison/price-comparison.service';
import { PurchaseReturnController } from './purchase-return/purchase-return.controller';
import { PurchaseReturnService } from './purchase-return/purchase-return.service';
import { PurchaseStageController } from './purchase-stage/purchase-stage.controller';
import { PurchaseStageService } from './purchase-stage/purchase-stage.service';
import { PurchaseSuggestionController } from './purchase-suggestion/purchase-suggestion.controller';
import { PurchaseSuggestionService } from './purchase-suggestion/purchase-suggestion.service';
import { QtController } from './qt/qt.controller';
import { Nx02QtService } from './qt/qt.service';
import { RfqGreetingTemplateController } from './rfq-greeting-template/rfq-greeting-template.controller';
import { RfqGreetingTemplateService } from './rfq-greeting-template/rfq-greeting-template.service';
import { RfqController } from './rfq/rfq.controller';
import { RfqService } from './rfq/rfq.service';
import { RrController } from './rr/rr.controller';
import { RrService } from './rr/rr.service';
import { TiController } from './ti/ti.controller';
import { TiService } from './ti/ti.service';
import { WarrantyClaimAttachmentService } from './warranty-claim/warranty-claim-attachment.service';
import { WarrantyClaimController } from './warranty-claim/warranty-claim.controller';
import { WarrantyClaimService } from './warranty-claim/warranty-claim.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    RfqController,
    PoController,
    RrController,
    TiController,
    PurchaseReturnController,
    QtController,
    PartnerPartController,
    PurchaseSuggestionController,
    DemandController,
    PriceComparisonController,
    PurchaseStageController,
    WarrantyClaimController,
    RfqGreetingTemplateController,
  ],
  providers: [
    RfqService,
    PoService,
    RrService,
    TiService,
    PurchaseReturnService,
    Nx02QtService,
    PartnerPartService,
    PurchaseSuggestionService,
    DemandService,
    PriceComparisonService,
    PurchaseStageService,
    WarrantyClaimService,
    WarrantyClaimAttachmentService,
    RfqGreetingTemplateService,
    { provide: APP_FILTER, useClass: Nx02ErrorFilter },
  ],
  // W5 異常鏈 Step 3 2026-07-11：export 給 Nx03Module IssueReportService.dispose 一鍵開單用
  exports: [PurchaseReturnService, WarrantyClaimService],
})
export class Nx02Module {}
