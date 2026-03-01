/**
 * File: apps/nx-api/src/nx00/location/controllers/location.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOCATION-CTRL-001：Location CRUD endpoints (ADMIN only)
 *
 * Notes:
 * - 為寫入 AuditLog，統一傳入 actorUserId + ipAddr + userAgent
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
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { LocationService } from '../services/location.service';
import type { CreateLocationBody, SetActiveBody, UpdateLocationBody } from '../dto/location.dto';

@Controller('location')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class LocationController {
    constructor(private readonly location: LocationService) { }

    /**
     * @CODE nxapi_nx00_location_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.location.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            warehouseId: typeof query.warehouseId === 'string' ? query.warehouseId : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_location_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.location.get(id);
    }

    /**
     * @CODE nxapi_nx00_location_create_001
     */
    @Post()
    async create(@Body() body: CreateLocationBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.location.create(body, { actorUserId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_location_update_001
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdateLocationBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.location.update(id, body, { actorUserId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_location_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.location.setActive(id, body, { actorUserId, ipAddr, userAgent });
    }
}