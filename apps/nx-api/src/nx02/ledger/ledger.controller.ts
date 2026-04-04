/**
 * File: apps/nx-api/src/nx02/ledger/ledger.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-LED-CTRL-001：GET /nx02/ledger
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/strategies/jwt.strategy';

import { assertNx02TenantId } from '../utils/assert-nx02-tenant';

import { LedgerService } from './ledger.service';

function splitCsv(s: string | undefined): string[] | undefined {
  if (!s || !String(s).trim()) return undefined;
  return String(s)
    .split(',')
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
}

@Controller('nx02/ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledger: LedgerService) { }

  /**
   * @FUNCTION_CODE NX02-LED-CTRL-001-F01
   */
  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query('q') q?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('movementType') movementType?: string,
    @Query('sourceDocType') sourceDocType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
  ) {
    const tenantId = assertNx02TenantId(user);
    const page = Math.max(1, Number(pageStr) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeStr) || 20));
    const mt = splitCsv(movementType);
    const st = splitCsv(sourceDocType);
    return this.ledger.list(tenantId, {
      q,
      warehouseId: warehouseId?.trim() || undefined,
      movementTypes: mt,
      sourceDocTypes: st,
      dateFrom,
      dateTo,
      page,
      pageSize,
    });
  }
}
