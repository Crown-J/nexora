// apps/nx-api/src/sys-admin/sys-admin.module.ts
// v1.2 對齊軌 C：伊諾瓦運營端 module（SYSADMIN 跨租戶管理）+ 精靈（所有 user）

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { WizardController } from './wizard/wizard.controller';
import { WizardService } from './wizard/wizard.service';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingController, WizardController],
  providers: [OnboardingService, WizardService],
})
export class SysAdminModule {}
