// apps/nx-api/src/platform-tenants/platform-tenants.module.ts
// 平台層 vs 租戶層分離軌 Phase 4：PlatformTenantsModule
//
// 跟既有 Nx99TenantModule（RolesGuard 租戶 owner 自用）並存、不耦合

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PlatformTenantsController } from './controllers/platform-tenants.controller';
import { PlatformTenantsService } from './services/platform-tenants.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformTenantsController],
  providers: [PlatformTenantsService],
})
export class PlatformTenantsModule {}
