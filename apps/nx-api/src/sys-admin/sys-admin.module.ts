// apps/nx-api/src/sys-admin/sys-admin.module.ts
// v1.2 對齊軌 C：伊諾瓦運營端 module + 精靈 + 匯入器 + 系統參數

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { FileUploadModule } from '../shared/file-upload/file-upload.module';

import { ImporterController } from './importer/importer.controller';
import { ImporterService } from './importer/importer.service';
import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { SystemParamController } from './system-param/system-param.controller';
import { SystemParamService } from './system-param/system-param.service';
import { WizardController } from './wizard/wizard.controller';
import { WizardService } from './wizard/wizard.service';

@Module({
  imports: [PrismaModule, FileUploadModule],
  controllers: [
    OnboardingController,
    WizardController,
    ImporterController,
    SystemParamController,
  ],
  providers: [
    OnboardingService,
    WizardService,
    ImporterService,
    SystemParamService,
  ],
})
export class SysAdminModule {}
