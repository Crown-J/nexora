// apps/nx-api/src/nx01/part-relation/part-relation.controller.ts
// 對應規格：docs/nx01/spec/intent/nx01-17-part-version-relation.md v1.0 §2 / §6
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CheckReverseHintDto,
  CreatePartRelationDto,
  ListPartRelationQueryDto,
  UpdatePartRelationDto,
} from './dto/part-relation.dto';
import { PartRelationService } from './part-relation.service';

@Controller('nx01/part-relations')
@UseGuards(JwtAuthGuard, RolesGuard)
// drift #5 補：規格 §6.2 PURCHASING + SALES 都可 CRUD
@Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')
export class PartRelationController {
  constructor(private readonly svc: PartRelationService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListPartRelationQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  /**
   * 規格 §2.2.1：create 回傳 PartRelation 直接（對齊 Nx00FlatMasterView generic）
   *   reverseHint 改走 POST /check-reverse-hint endpoint
   */
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartRelationDto) {
    return this.svc.create(user, dto);
  }

  /**
   * 規格 §2.2.3 + §3.3.2 Q2=C：UI create 成功後呼叫此 endpoint 查 reverseHint
   *   relationType=2 + 反向不存在 → UI window.confirm 提示「建議建反向關係 B→A？」
   */
  @Post('check-reverse-hint')
  checkReverseHint(@CurrentUser() user: RequestUser, @Body() dto: CheckReverseHintDto) {
    return this.svc.checkReverseHint(user, {
      partIdFrom: dto.partIdFrom,
      partIdTo: dto.partIdTo,
      relationType: dto.relationType,
    });
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePartRelationDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
