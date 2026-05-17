// apps/nx-api/src/nx10/mentorship/nx10-mentorship.controller.ts
// NX10 Mentorship controller

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx10ProPlanGuard } from '../../shared/nx10/nx10-pro-plan.guard';

import { CreatePairDto, PatchEndDto } from './dto/nx10-mentorship.dto';
import { Nx10MentorshipService } from './nx10-mentorship.service';

@Controller('nx10/mentorship')
@UseGuards(JwtAuthGuard, RolesGuard, Nx10ProPlanGuard)
export class Nx10MentorshipController {
  constructor(private readonly svc: Nx10MentorshipService) {}

  @Get('me')
  listMine(@CurrentUser() user: RequestUser) {
    return this.svc.listMine(user);
  }

  /** HR_ADMIN 指派配對。 */
  @Post()
  @Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
  createPair(@CurrentUser() user: RequestUser, @Body() dto: CreatePairDto) {
    return this.svc.createPair(user, dto);
  }

  /** HR_ADMIN 結束帶新人。 */
  @Patch(':id/end')
  @Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
  patchEnd(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: PatchEndDto,
  ) {
    return this.svc.patchEnd(user, id, dto);
  }

  /** HR_ADMIN 發放獎勵（手動觸發）。 */
  @Post(':id/issue-reward')
  @Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
  issueReward(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.issueReward(user, id);
  }
}
