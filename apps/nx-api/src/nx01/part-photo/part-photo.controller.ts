// apps/nx-api/src/nx01/part-photo/part-photo.controller.ts
// 02 第三批 T4 2026-06-07：零件照片 sub-resource controller
import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { UpdatePartPhotoDto, UploadPartPhotoDto } from './dto/part-photo.dto';
import { PartPhotoService } from './part-photo.service';

@Controller('nx01/parts/:partId/photos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartPhotoController {
  constructor(private readonly svc: PartPhotoService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Param('partId') partId: string) {
    return this.svc.list(user, partId);
  }

  @Post()
  upload(
    @CurrentUser() user: RequestUser,
    @Param('partId') partId: string,
    @Body() dto: UploadPartPhotoDto,
  ) {
    return this.svc.upload(user, partId, dto);
  }

  @Patch(':photoId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('partId') partId: string,
    @Param('photoId') photoId: string,
    @Body() dto: UpdatePartPhotoDto,
  ) {
    return this.svc.update(user, partId, photoId, dto);
  }

  @Delete(':photoId')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('partId') partId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.svc.remove(user, partId, photoId);
  }

  @Get(':photoId/raw')
  async download(
    @CurrentUser() user: RequestUser,
    @Param('partId') partId: string,
    @Param('photoId') photoId: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.svc.download(user, partId, photoId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.send(buffer);
  }
}
