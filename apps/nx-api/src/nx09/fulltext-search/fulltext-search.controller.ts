// apps/nx-api/src/nx09/fulltext-search/fulltext-search.controller.ts
// NX09 全文搜尋 controller

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ModuleAccessGuard } from '../../shared/module-access/module-access.guard';
import { RequiresModule } from '../../shared/module-access/requires-module.decorator';

import { Nx09FulltextSearchService, type SearchScope } from './fulltext-search.service';

@Controller('nx09/search')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleAccessGuard)
@RequiresModule('NX09')
export class Nx09FulltextSearchController {
  constructor(private readonly svc: Nx09FulltextSearchService) {}

  /**
   * ⭐ EIP 全文搜尋（Crown Q3=b、業界中小 ERP 罕見）。
   * scope: km | doc | manual | all
   */
  @Get()
  search(
    @CurrentUser() user: RequestUser,
    @Query('q') q: string,
    @Query('scope') scope?: SearchScope,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 20;
    return this.svc.search(user, q, scope ?? 'all', Number.isFinite(parsedLimit) ? parsedLimit : 20);
  }
}
