/**
 * File: apps/nx-api/src/nx00/lookups/lookups.controller.ts
 * Project: NEXORA (Monorepo)
 * Purpose: NX00-API-002 Lookups endpoints (ADMIN only)
 * Notes:
 * - RBAC: JwtAuthGuard + RolesGuard + @Roles('ADMIN')
 * - query: isActive=true/false（可選）
 * - 風格對齊 users.controller.ts：手動 parse query，但避免重複（抽 parseBoolean）
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { Nx00LookupsService } from '../services/lookups.service';

function parseBoolean(value: any): boolean | undefined {
  /**
   * @CODE nxapi_nx00_lookups_query_parse_bool_001
   */
  if (typeof value !== 'string') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

@Controller('nx00')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class Nx00LookupsController {
  constructor(private readonly lookups: Nx00LookupsService) {}

  /**
   * @CODE nxapi_nx00_lookups_brands_002
   */
  @Get('brands')
  async brands(@Query() query: any) {
    return this.lookups.brands(parseBoolean(query.isActive));
  }

  /**
   * @CODE nxapi_nx00_lookups_function_groups_002
   */
  @Get('function-groups')
  async functionGroups(@Query() query: any) {
    return this.lookups.functionGroups(parseBoolean(query.isActive));
  }

  /**
   * @CODE nxapi_nx00_lookups_part_statuses_002
   */
  @Get('part-statuses')
  async partStatuses(@Query() query: any) {
    return this.lookups.partStatuses(parseBoolean(query.isActive));
  }
}
