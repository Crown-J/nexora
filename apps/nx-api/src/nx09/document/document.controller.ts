import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx09ProPlanGuard } from '../../shared/nx09/nx09-pro-plan.guard';

import { CreateDocumentDto, PatchDocumentDto } from './document.dto';
import { Nx09DocumentService } from './document.service';
import { Nx09DocumentListQueryDto } from './nx09-document-list-query.dto';

@Controller('nx09/documents')
@UseGuards(JwtAuthGuard, Nx09ProPlanGuard)
export class Nx09DocumentController {
  constructor(private readonly svc: Nx09DocumentService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx09DocumentListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDocumentDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchDocumentDto) {
    return this.svc.patchVersion(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}
