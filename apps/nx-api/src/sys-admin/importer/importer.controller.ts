// apps/nx-api/src/sys-admin/importer/importer.controller.ts
// v1.2 對齊軌 C3：匯入 controller

import {
  BadRequestException,
  Body,
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

  /// 上傳預覽（不寫入 DB）
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

  /// 確認匯入（依 batchId + 原檔案）
  /// 實務上應 cache 檔案在 server、這裡簡化 client 再上傳一次
  @Post('confirm/:batchId')
  @UseInterceptors(FileInterceptor('file'))
  async confirm(
    @CurrentUser() user: RequestUser,
    @Param('batchId') batchId: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer },
  ) {
    if (!file) throw new BadRequestException('file is required');
    return this.svc.confirmImport(user, batchId, file.buffer);
  }
}
