// apps/nx-api/src/sys-admin/importer/importer.controller.ts
// v1.2 對齊軌 C-FU：匯入 controller（confirm 改用 cached file、不再要 client 傳檔）

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import { ImporterService } from './importer.service';

@Controller('importer')
@UseGuards(JwtAuthGuard)
export class ImporterController {
  constructor(private readonly svc: ImporterService) {}

  /// 下載範本（Excel）
  @Get('template/:importType')
  downloadTemplate(@Param('importType') importType: string, @Res() res: Response) {
    const { fileName, buffer } = this.svc.generateTemplate(importType);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  }

  /// 上傳預覽（cache 檔案、不寫入主檔）
  @Post('preview/:importType')
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @CurrentUser() user: RequestUser,
    @Param('importType') importType: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer },
  ) {
    if (!file) throw new BadRequestException('file is required');
    return this.svc.preview(user, importType, file.originalname, file.buffer);
  }

  /// 確認匯入（用 batchId 從 cache 拉檔案、不用 client 再傳）
  /// FU-import-07：解決原本「客戶要再上傳一次」的爛體驗
  @Post('confirm/:batchId')
  async confirm(@CurrentUser() user: RequestUser, @Param('batchId') batchId: string) {
    return this.svc.confirmImport(user, batchId);
  }
}
