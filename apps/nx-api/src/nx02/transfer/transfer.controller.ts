/**
 * File: apps/nx-api/src/nx02/transfer/transfer.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-XFER-CTRL-001：調撥單 REST（JWT + PLUS）
 *
 * @FUNCTION_CODE NX02-XFER-CTRL-001-F01
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import type { RequestUser } from '../../auth/strategies/jwt.strategy';

import { assertNx02TenantId } from '../utils/assert-nx02-tenant';
import { PlusPlanGuard } from '../guards/plus-plan.guard';

import type { CreateTransferBodyDto, PatchTransferBodyDto } from './dto/transfer.dto';
import { TransferService } from './transfer.service';

@Controller('nx02/transfer')
@UseGuards(JwtAuthGuard, PlusPlanGuard)
export class TransferController {
  constructor(private readonly transfer: TransferService) { }

  /**
   * @FUNCTION_CODE NX02-XFER-CTRL-001-F01
   */
  @Get()
  async list(
    @Req() req: { user?: RequestUser },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.transfer.list(tenantId, {
      page: page ? parseInt(page, 10) || 1 : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) || 20 : 20,
      status,
      warehouseId,
    });
  }

  /**
   * @FUNCTION_CODE NX02-XFER-CTRL-001-F02
   */
  @Get(':id')
  async getOne(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.transfer.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX02-XFER-CTRL-001-F03
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: { user?: RequestUser },
    @Body() body: CreateTransferBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.transfer.create(tenantId, req.user?.sub, body);
  }

  /**
   * @FUNCTION_CODE NX02-XFER-CTRL-001-F04
   */
  @Patch(':id')
  async patch(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchTransferBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.transfer.patch(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX02-XFER-CTRL-001-F05
   */
  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  async post(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.transfer.post(tenantId, req.user?.sub, id);
  }

  /**
   * @FUNCTION_CODE NX02-XFER-CTRL-001-F06
   */
  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  async voidDoc(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.transfer.voidDoc(tenantId, req.user?.sub, id);
  }
}
