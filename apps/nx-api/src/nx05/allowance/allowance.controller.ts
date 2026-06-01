import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx05FinanceAccessGuard } from '../../shared/nx05/nx05-finance-access.guard';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';

import { AllowanceService } from './allowance.service';
import { CreateAllowanceDto, PatchAllowanceDto } from './dto/allowance.dto';

@Controller('nx05/allowance')
@UseGuards(JwtAuthGuard, RolesGuard, Nx05FinanceAccessGuard)
@Roles('SYSADMIN', 'OWNER')
export class AllowanceController {
  constructor(private readonly svc: AllowanceService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx05ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateAllowanceDto) {
    return this.svc.create(user, dto);
  }

  /**
   * v1.2 階段 F P5 E：人工開折讓（DRAFT、待主管核可）
   * POST /nx05/allowance/manual
   */
  @Post('manual')
  createManual(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      allowanceType: 'P' | 'S';
      partnerId: string;
      allowanceDate: string;
      totalAmount: number | string;
      refArId?: string;
      refApId?: string;
      remark?: string;
    },
  ) {
    return this.svc.createManual(user, body);
  }

  /**
   * v1.2 階段 F P5 E：主管核可折讓（DRAFT → APPROVED + 寫沖銷）
   * POST /nx05/allowance/:id/approve
   */
  @Post(':id/approve')
  approve(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.approve(user, id);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchAllowanceDto) {
    return this.svc.patch(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}
