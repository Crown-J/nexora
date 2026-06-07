// apps/nx-api/src/nx01/user-photo/user-photo.controller.ts
// 02 第四批 軌 1 2026-06-07：使用者大頭貼 sub-resource controller（singular、單張）
import { Body, Controller, Delete, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { UploadUserPhotoDto } from './dto/user-photo.dto';
import { UserPhotoService } from './user-photo.service';

@Controller('nx01/users/:userId/photo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class UserPhotoController {
  constructor(private readonly svc: UserPhotoService) {}

  @Post()
  upload(
    @CurrentUser() actor: RequestUser,
    @Param('userId') userId: string,
    @Body() dto: UploadUserPhotoDto,
  ) {
    return this.svc.upload(actor, userId, dto);
  }

  @Delete()
  remove(@CurrentUser() actor: RequestUser, @Param('userId') userId: string) {
    return this.svc.remove(actor, userId);
  }

  @Get('raw')
  async download(
    @CurrentUser() actor: RequestUser,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.svc.download(actor, userId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.send(buffer);
  }
}
