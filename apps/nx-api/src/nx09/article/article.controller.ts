import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx09ProPlanGuard } from '../../shared/nx09/nx09-pro-plan.guard';

import { CreateArticleDto, PatchArticleDto } from './article.dto';
import { Nx09ArticleService } from './article.service';
import { Nx09ArticleListQueryDto } from './nx09-article-list-query.dto';

@Controller('nx09/articles')
@UseGuards(JwtAuthGuard, Nx09ProPlanGuard)
export class Nx09ArticleController {
  constructor(private readonly svc: Nx09ArticleService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx09ArticleListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateArticleDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchArticleDto) {
    return this.svc.patch(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}
