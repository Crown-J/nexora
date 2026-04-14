import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { PoController } from './po/po.controller';
import { PoService } from './po/po.service';
import { PurchaseReturnController } from './purchase-return/purchase-return.controller';
import { PurchaseReturnService } from './purchase-return/purchase-return.service';
import { RfqController } from './rfq/rfq.controller';
import { RfqService } from './rfq/rfq.service';
import { RrController } from './rr/rr.controller';
import { RrService } from './rr/rr.service';

@Module({
  imports: [PrismaModule],
  controllers: [RfqController, PoController, RrController, PurchaseReturnController],
  providers: [RfqService, PoService, RrService, PurchaseReturnService],
})
export class Nx02Module {}
