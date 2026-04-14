import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { FeatureFlagController } from './feature-flag/feature-flag.controller';
import { FeatureFlagService } from './feature-flag/feature-flag.service';
import { SubscriptionController } from './subscription/subscription.controller';
import { SubscriptionService } from './subscription/subscription.service';
import { TenantController } from './tenant/tenant.controller';
import { TenantService } from './tenant/tenant.service';

@Module({
  imports: [PrismaModule],
  controllers: [TenantController, SubscriptionController, FeatureFlagController],
  providers: [TenantService, SubscriptionService, FeatureFlagService],
})
export class Nx99Module {}
