import { Controller, Get, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx10ProPlanGuard } from '../../shared/nx10/nx10-pro-plan.guard';

import { Nx10MedalsService } from './nx10-medals.service';

@Controller('nx10/medals')
@UseGuards(JwtAuthGuard, Nx10ProPlanGuard)
export class Nx10MedalsController {
  constructor(private readonly svc: Nx10MedalsService) {}

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.svc.me(user);
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.svc.listAll(user);
  }
}
