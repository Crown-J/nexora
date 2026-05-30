// apps/nx-api/src/sys-admin/sys-admin.module.ts
// v1.2 對齊軌 C：伊諾瓦運營端 module（SYSADMIN 跨租戶管理）

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class SysAdminModule {}
