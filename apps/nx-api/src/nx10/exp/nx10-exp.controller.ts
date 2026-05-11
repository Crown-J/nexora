import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx10ProPlanGuard } from '../../shared/nx10/nx10-pro-plan.guard';

import { Nx10ExpAwardDto } from './dto/nx10-exp-award.dto';
import { Nx10ExpService } from './nx10-exp.service';

@Controller('nx10/exp')
@UseGuards(JwtAuthGuard, Nx10ProPlanGuard, RolesGuard)
export class Nx10ExpController {
  constructor(private readonly svc: Nx10ExpService) {}

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.svc.getMe(user);
  }

  @Post('award')
  @Roles('SYSADMIN', 'OWNER')
  award(@CurrentUser() user: RequestUser, @Body() dto: Nx10ExpAwardDto) {
    return this.svc.award(user, dto);
  }

  @Get(':userId')
  @Roles('SYSADMIN', 'OWNER')
  getOne(@CurrentUser() user: RequestUser, @Param('userId') userId: string) {
    return this.svc.getByUserId(user, userId);
  }
}
