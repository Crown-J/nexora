// apps/nx-api/src/nx01/phonetic-dictionary/phonetic-dictionary.controller.ts
// 對應規格：docs/nx01/spec/intent/nx01-10-phonetic-search.md v1.0 §2.2 / §6
// SYSADMIN 限定：全域字典維護（不含 tenantId）
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreatePhoneticDictionaryDto,
  ListPhoneticDictionaryQueryDto,
  UpdatePhoneticDictionaryDto,
} from './dto/phonetic-dictionary.dto';
import { PhoneticDictionaryService } from './phonetic-dictionary.service';

@Controller('nx01/phonetic-dictionary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PhoneticDictionaryController {
  constructor(private readonly svc: PhoneticDictionaryService) {}

  /**
   * 02 真正完工軌 2026-06-07：重建本租戶 partner + part 的 phonetic_index
   * 用途：灌完字典 seed 後、把既有資料 re-sync（既有 row 之前是 char fallback、現在改為注音）
   * 業務員不需用、為 OWNER 一次性操作
   */
  @Post('rebuild-index')
  rebuildIndex(@CurrentUser() user: RequestUser) {
    return this.svc.rebuildIndexForTenant(user);
  }

  @Get()
  list(@Query() q: ListPhoneticDictionaryQueryDto) {
    return this.svc.list(q);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePhoneticDictionaryDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePhoneticDictionaryDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
