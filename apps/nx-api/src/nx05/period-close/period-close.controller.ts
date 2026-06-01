import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx05FinanceAccessGuard } from '../../shared/nx05/nx05-finance-access.guard';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';

import { CreatePeriodCloseDto, PatchPeriodCloseDto } from './dto/period-close.dto';
import { PeriodCloseService } from './period-close.service';

@Controller('nx05/period-close')
@UseGuards(JwtAuthGuard, RolesGuard, Nx05FinanceAccessGuard)
@Roles('SYSADMIN', 'OWNER')
export class PeriodCloseController {
  constructor(private readonly svc: PeriodCloseService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx05ListQueryDto) {
    return this.svc.list(user, q);
  }

  /**
   * v1.2 階段 F P3 F：401 雙月一期彙整預覽
   * GET /nx05/period-close/period/:yp/preview（yp 格式 YYYY-EE、例 '2026-03'=5-6 月）
   */
  @Get('period/:yp/preview')
  previewPeriod401(@CurrentUser() user: RequestUser, @Param('yp') yp: string) {
    return this.svc.previewPeriod401(user, yp);
  }

  /**
   * v1.2 階段 F P5 A：401 媒體申報 TXT 兩檔輸出
   * GET /nx05/period-close/period/:yp/txt-export
   * - 回傳兩個檔案 base64 內容 + 檔名 + 彙整摘要
   * - 前端 decode 後分別存檔（{統編}.TXT + {統編}.TET_U）
   */
  @Get('period/:yp/txt-export')
  export401Txt(@CurrentUser() user: RequestUser, @Param('yp') yp: string) {
    return this.svc.export401Txt(user, yp);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePeriodCloseDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchPeriodCloseDto) {
    return this.svc.patch(user, id, dto);
  }

  /**
   * v1.2 階段 F P3 E：標記該關帳所屬 401 期已上報
   * POST /nx05/period-close/:id/mark-filed
   * - 業務檢查：所屬期內兩個月關帳都齊（兩筆 CLOSED row）才可上報
   * - 寫 reportFiledAt + reportFiledBy、整期鎖死（period-lock 自動生效）
   */
  @Post(':id/mark-filed')
  markFiled(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { remark?: string },
  ) {
    return this.svc.markFiled(user, id, body?.remark);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}
