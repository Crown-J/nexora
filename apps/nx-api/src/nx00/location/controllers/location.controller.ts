/**
 * File: apps/nx-api/src/nx00/location/controllers/location.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOCATION-CTRL-001：Location CRUD（依 nx00_role_view／NX00_LOCATION）
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

import { LocationService } from '../services/location.service';
import type { CreateLocationBody, SetActiveBody, UpdateLocationBody } from '../dto/location.dto';

@Controller('location')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class LocationController {
    constructor(private readonly location: LocationService) { }

    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.LOCATION, 'read')
    async list(@Query() query: any) {
        return this.location.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            warehouseId: typeof query.warehouseId === 'string' ? query.warehouseId : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.LOCATION, 'read')
    async get(@Param('id') id: string) {
        return this.location.get(id);
    }

    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.LOCATION, 'create')
    async create(@Body() body: CreateLocationBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.location.create(body, { actorUserId, ipAddr, userAgent });
    }

    @Put(':id')
    @RequireNx00ViewPermission(NX00_VIEW.LOCATION, 'update')
    async update(@Param('id') id: string, @Body() body: UpdateLocationBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.location.update(id, body, { actorUserId, ipAddr, userAgent });
    }

    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.LOCATION, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.location.setActive(id, body, { actorUserId, ipAddr, userAgent });
    }
}
