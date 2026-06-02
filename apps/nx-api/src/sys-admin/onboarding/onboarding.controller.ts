// apps/nx-api/src/sys-admin/onboarding/onboarding.controller.ts
// v1.2 對齊軌 C：開戶後台 controller
// 平台/租戶層分離軌 Phase 3：守衛從 RolesGuard('SYSADMIN') 改成 PlatformAdminGuard。
// LOGO 上傳軌：upload-logo endpoint 支援開戶頁圖檔上傳（選檔即傳）。
//
// 路由：
// - POST /sys-admin/onboarding/upload-logo  → 上傳 LOGO 拿 storage_key（multipart）
// - POST /sys-admin/onboarding/create-tenant → 開戶（JSON、含 logoStorageKey?）

import { BadRequestException, Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';

import { FileUploadService } from '../../shared/file-upload/file-upload.service';
import type { PlatformRequestUser } from '../../platform-auth/strategies/platform-jwt.strategy';
import { PlatformAdminGuard } from '../../shared/guards/platform-admin.guard';

import { CreateOnboardingDto } from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

/** 允許作為 LOGO 上傳的 MIME 類型（FileUploadConfig 預設更寬、此處再收窄到 image-only） */
const LOGO_ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

@Controller('sys-admin/onboarding')
@UseGuards(PlatformAdminGuard)
export class OnboardingController {
  constructor(
    private readonly svc: OnboardingService,
    private readonly fileUpload: FileUploadService,
  ) {}

  /// 上傳 LOGO：開戶頁選檔即觸發、回 storage_key 讓前端帶在 create-tenant payload
  /// - 限 image MIME（png/jpeg/gif/webp）、額外於此再驗一次（FileUploadConfig 預設較寬）
  /// - 用 platform admin id 當 storage prefix（開戶當下還沒有 tenantId）
  @Post('upload-logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Req() req: Request,
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string; size: number } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    if (!LOGO_ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`LOGO 限 PNG/JPEG/GIF/WebP 圖檔（收到 ${file.mimetype}）`);
    }
    const actor = req.user as PlatformRequestUser;
    const meta = await this.fileUpload.upload({
      tenantId: actor.sub, // platform admin id (PLATADMN... 格式符合 ^[A-Z0-9]{15}$)
      module: 'onboarding',
      file: {
        originalFilename: file.originalname,
        buffer: file.buffer,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
    return {
      storageKey: meta.storageKey,
      size: meta.size,
      mimeType: meta.mimeType,
      origFilename: meta.origFilename,
    };
  }

  /// 開通新客戶租戶（v1.2 §2.2）
  /// 自動建：租戶 + 負責人帳號 + OWNER 角色指派 + 主據點 + 主倉
  /// 寄通知 Email（測試環境 console.log）
  @Post('create-tenant')
  createTenant(@Req() req: Request, @Body() dto: CreateOnboardingDto) {
    const actor = req.user as PlatformRequestUser;
    return this.svc.createTenantAndOwner(actor.sub, dto);
  }
}
