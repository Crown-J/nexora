/**
 * File: apps/nx-api/src/nx00/warehouse/controllers/warehouse.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-WAREHOUSE-CTRL-001：Warehouse CRUD（依 nx00_role_view／NX00_WAREHOUSE）
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

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

import { NX00_VIEW } from '../../rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../rbac/require-nx00-view-permission.decorator';

import { WarehouseService } from '../services/warehouse.service';
import type { CreateWarehouseBody, SetActiveBody, UpdateWarehouseBody } from '../dto/warehouse.dto';

@Controller('warehouse')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class WarehouseController {
    constructor(private readonly warehouse: WarehouseService) { }

    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.WAREHOUSE, 'read')
    async list(@Query() query: any) {
        return this.warehouse.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.WAREHOUSE, 'read')
    async get(@Param('id') id: string) {
        return this.warehouse.get(id);
    }

    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.WAREHOUSE, 'create')
    async create(@Body() body: CreateWarehouseBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        const tenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.warehouse.create(body, { actorUserId, tenantId, ipAddr, userAgent });
    }

    @Put(':id')
    @RequireNx00ViewPermission(NX00_VIEW.WAREHOUSE, 'update')
    async update(@Param('id') id: string, @Body() body: UpdateWarehouseBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.warehouse.update(id, body, { actorUserId, ipAddr, userAgent });
    }

    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.WAREHOUSE, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.warehouse.setActive(id, body, { actorUserId, ipAddr, userAgent });
    }
}
