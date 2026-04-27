// apps/nx-api/src/nx02/nx02.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { PrismaModule } from '../prisma/prisma.module';
import { Nx02ErrorFilter } from '../shared/filters/nx02-error.filter';

import { PoController } from './po/po.controller';
import { PoService } from './po/po.service';
import { PurchaseReturnController } from './purchase-return/purchase-return.controller';
import { PurchaseReturnService } from './purchase-return/purchase-return.service';
import { QtController } from './qt/qt.controller';
import { Nx02QtService } from './qt/qt.service';
import { RfqController } from './rfq/rfq.controller';
import { RfqService } from './rfq/rfq.service';
import { RrController } from './rr/rr.controller';
import { RrService } from './rr/rr.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    RfqController,
    PoController,
    RrController,
    PurchaseReturnController,
    QtController,
  ],
  providers: [
    RfqService,
    PoService,
    RrService,
    PurchaseReturnService,
    Nx02QtService,
    { provide: APP_FILTER, useClass: Nx02ErrorFilter },
  ],
})
export class Nx02Module {}
