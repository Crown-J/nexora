import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { ListFeatureFlagsQueryDto } from './dto/feature-flag.dto';
import { FeatureFlagService } from './feature-flag.service';

@Controller('nx99/feature-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListFeatureFlagsQueryDto) {
    return this.featureFlagService.list(user, query);
  }
}
