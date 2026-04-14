import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { DeliveryController } from './delivery/delivery.controller';
import { DnLogisticsService } from './dn-logistics.service';
import { IntlShippingController } from './intl-shipping/intl-shipping.controller';
import { PickupController } from './pickup/pickup.controller';
import { ReturnPickupController } from './return-pickup/return-pickup.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryController, PickupController, IntlShippingController, ReturnPickupController],
  providers: [DnLogisticsService],
})
export class Nx06Module {}
