// apps/nx-api/src/nx06/nx06.module.ts
// NX06 物流模組 module（NX06-IMPL-01 + IMPL-02 階段註冊）

import { Module } from '@nestjs/common';

import { Nx04Module } from '../nx04/nx04.module';
import { Nx10Module } from '../nx10/nx10.module';
import { PrismaModule } from '../prisma/prisma.module';

import { DeliveryController } from './delivery/delivery.controller';
import { DispatchController } from './dispatch/dispatch.controller';
import { DispatchService } from './dispatch/dispatch.service';
import { DnLogisticsService } from './dn-logistics.service';
import { DnOpsController } from './dn-ops/dn-ops.controller';
import { DriverMobileController } from './driver-mobile/driver-mobile.controller';
import { DriverMobileService } from './driver-mobile/driver-mobile.service';
import { DynamicHandoverController } from './dynamic-handover/dynamic-handover.controller';
import { DynamicHandoverService } from './dynamic-handover/dynamic-handover.service';
import { IntlShippingController } from './intl-shipping/intl-shipping.controller';
import { LalamoveIntegrationController } from './lalamove-integration/lalamove-integration.controller';
import { LalamoveIntegrationService } from './lalamove-integration/lalamove-integration.service';
import { PickupController } from './pickup/pickup.controller';
import { PrinterIntegrationController } from './printer-integration/printer-integration.controller';
import { PrinterIntegrationService } from './printer-integration/printer-integration.service';
import { ReturnPickupController } from './return-pickup/return-pickup.controller';
import { RouteOptimizationController } from './route-optimization/route-optimization.controller';
import { RouteOptimizationService } from './route-optimization/route-optimization.service';
import { WebPushController } from './web-push/web-push.controller';
import { WebPushService } from './web-push/web-push.service';

@Module({
  imports: [PrismaModule, Nx10Module, Nx04Module],
  controllers: [
    DeliveryController,
    PickupController,
    IntlShippingController,
    ReturnPickupController,
    DispatchController,
    PrinterIntegrationController,
    LalamoveIntegrationController,
    DnOpsController,
    RouteOptimizationController,
    DynamicHandoverController,
    WebPushController,
    DriverMobileController,
  ],
  providers: [
    DnLogisticsService,
    DispatchService,
    PrinterIntegrationService,
    LalamoveIntegrationService,
    RouteOptimizationService,
    DynamicHandoverService,
    WebPushService,
    DriverMobileService,
  ],
})
export class Nx06Module {}
