// apps/nx-api/src/nx01/part-version/part-version.controller.ts
// 對應規格：docs/nx01/spec/intent/nx01-17-part-version-relation.md v1.0
// part_version 是 read-only API（write 由 part.service.update tx 同步寫）
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { ListPartVersionQueryDto } from './dto/part-version.dto';
import { PartVersionService } from './part-version.service';

@Controller('nx01/part-versions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class PartVersionController {
  constructor(private readonly svc: PartVersionService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListPartVersionQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }
}
