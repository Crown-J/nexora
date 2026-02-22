/**
 * File: apps/nx-api/src/nx00/parts/parts.controller.ts
 * Project: NEXORA (Monorepo)
 * Purpose: NX00-API-002 Parts CRUD endpoints (ADMIN only)
 * Notes:
 * - RBAC: JwtAuthGuard + RolesGuard + @Roles('ADMIN')
 * - Query parse 風格對齊 users.controller.ts（手動 parse query）
 * - actorUserId 由 req.user.sub 注入到 service（created_by / updated_by）
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

import { Nx00PartsService } from './parts.service';
import type { CreatePartBody, SetPartActiveBody, UpdatePartBody } from './parts.dto';

type SortBy = 'partNo' | 'nameZh' | 'createdAt';
type SortDir = 'asc' | 'desc';

type PartsListQuery = {
  keyword?: string;
  brandId?: string;
  functionGroupId?: string;
  statusId?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
  sortBy: SortBy;
  sortDir: SortDir;
};

function parseBoolean(value: any): boolean | undefined {
  /**
   * @CODE nxapi_nx00_parts_query_parse_bool_001
   */
  if (typeof value !== 'string') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function parseNumber(value: any, fallback: number): number {
  /**
   * @CODE nxapi_nx00_parts_query_parse_number_001
   */
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseSortBy(value: any, fallback: SortBy): SortBy {
  /**
   * @CODE nxapi_nx00_parts_query_parse_sort_by_001
   */
  if (typeof value !== 'string') return fallback;
  if (value === 'partNo' || value === 'nameZh' || value === 'createdAt') return value;
  return fallback;
}

function parseSortDir(value: any, fallback: SortDir): SortDir {
  /**
   * @CODE nxapi_nx00_parts_query_parse_sort_dir_001
   */
  if (typeof value !== 'string') return fallback;
  if (value === 'asc' || value === 'desc') return value;
  return fallback;
}

function parseListQuery(query: any): PartsListQuery {
  /**
   * @CODE nxapi_nx00_parts_query_parse_list_001
   */
  return {
    keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
    brandId: typeof query.brandId === 'string' ? query.brandId : undefined,
    functionGroupId: typeof query.functionGroupId === 'string' ? query.functionGroupId : undefined,
    statusId: typeof query.statusId === 'string' ? query.statusId : undefined,
    isActive: parseBoolean(query.isActive),
    page: parseNumber(query.page, 1),
    pageSize: parseNumber(query.pageSize, 20),
    sortBy: parseSortBy(query.sortBy, 'partNo'),
    sortDir: parseSortDir(query.sortDir, 'asc'),
  };
}

function getActorUserId(req: any): string | undefined {
  /**
   * @CODE nxapi_nx00_parts_actor_user_id_001
   */
  return (req?.user?.sub as string | undefined) || undefined;
}

@Controller('nx00/parts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class Nx00PartsController {
  constructor(private readonly parts: Nx00PartsService) {}

  /**
   * @CODE nxapi_nx00_parts_list_002
   */
  @Get()
  async list(@Query() query: any) {
    return this.parts.list(parseListQuery(query));
  }

  /**
   * @CODE nxapi_nx00_parts_get_002
   */
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.parts.get(id);
  }

  /**
   * @CODE nxapi_nx00_parts_create_002
   */
  @Post()
  async create(@Body() body: CreatePartBody, @Req() req: any) {
    return this.parts.create(body, getActorUserId(req));
  }

  /**
   * @CODE nxapi_nx00_parts_update_002
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdatePartBody, @Req() req: any) {
    return this.parts.update(id, body, getActorUserId(req));
  }

  /**
   * @CODE nxapi_nx00_parts_set_active_002
   */
  @Patch(':id/active')
  async setActive(@Param('id') id: string, @Body() body: SetPartActiveBody, @Req() req: any) {
    return this.parts.setActive(id, body, getActorUserId(req));
  }
}
