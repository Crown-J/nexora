// apps/nx-api/src/nx06/nx06.module.ts
// NX06 物流模組 module（NX06-IMPL-01 階段註冊）

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { DeliveryController } from './delivery/delivery.controller';
import { DispatchController } from './dispatch/dispatch.controller';
import { DispatchService } from './dispatch/dispatch.service';
import { DnLogisticsService } from './dn-logistics.service';
import { IntlShippingController } from './intl-shipping/intl-shipping.controller';
import { LalamoveIntegrationController } from './lalamove-integration/lalamove-integration.controller';
import { LalamoveIntegrationService } from './lalamove-integration/lalamove-integration.service';
import { PickupController } from './pickup/pickup.controller';
import { PrinterIntegrationController } from './printer-integration/printer-integration.controller';
import { PrinterIntegrationService } from './printer-integration/printer-integration.service';
import { ReturnPickupController } from './return-pickup/return-pickup.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    DeliveryController,
    PickupController,
    IntlShippingController,
    ReturnPickupController,
    DispatchController,
    PrinterIntegrationController,
    LalamoveIntegrationController,
  ],
  providers: [
    DnLogisticsService,
    DispatchService,
    PrinterIntegrationService,
    LalamoveIntegrationService,
  ],
})
export class Nx06Module {}
