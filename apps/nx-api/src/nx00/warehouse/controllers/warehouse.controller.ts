/**
 * File: apps/nx-api/src/nx00/warehouse/controllers/warehouse.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-WAREHOUSE-CTRL-001：Warehouse CRUD endpoints (ADMIN only)
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

import { WarehouseService } from '../services/warehouse.service';
import type { CreateWarehouseBody, SetActiveBody, UpdateWarehouseBody } from '../dto/warehouse.dto';

@Controller('warehouse')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class WarehouseController {
    constructor(private readonly warehouse: WarehouseService) { }

    /**
     * @CODE nxapi_nx00_warehouse_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.warehouse.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_warehouse_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.warehouse.get(id);
    }

    /**
     * @CODE nxapi_nx00_warehouse_create_001
     */
    @Post()
    async create(@Body() body: CreateWarehouseBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.warehouse.create(body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_warehouse_update_001
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdateWarehouseBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.warehouse.update(id, body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_warehouse_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.warehouse.setActive(id, body, actorUserId);
    }
}