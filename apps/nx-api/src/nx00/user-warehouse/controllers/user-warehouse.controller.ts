/**
 * File: apps/nx-api/src/nx00/user-warehouse/controllers/user-warehouse.controller.ts
 *
 * Purpose:
 * - NX00-API-USER-WH-CTRL-001：使用者據點對應 API（ADMIN）
 */

import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { UserWarehouseService } from '../services/user-warehouse.service';
import type { AssignUserWarehouseBody, RevokeUserWarehouseBody } from '../dto/user-warehouse.dto';

@Controller('user-warehouse')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UserWarehouseController {
    constructor(private readonly userWarehouse: UserWarehouseService) {}

    @Get()
    async list(@Query() query: Record<string, string | undefined>) {
        return this.userWarehouse.list({
            userId: typeof query.userId === 'string' ? query.userId : undefined,
            warehouseId: typeof query.warehouseId === 'string' ? query.warehouseId : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.userWarehouse.get(id);
    }

    @Post()
    async assign(@Body() body: AssignUserWarehouseBody, @Req() req: any) {
        const actorUserId = req?.user?.sub;
        const ipAddr = req?.ip ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
        return this.userWarehouse.assign(body, { actorUserId, ipAddr, userAgent });
    }

    @Patch(':id/revoke')
    async revoke(
        @Param('id') id: string,
        @Body() body: RevokeUserWarehouseBody,
        @Req() req: any,
    ) {
        const actorUserId = req?.user?.sub;
        const ipAddr = req?.ip ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
        return this.userWarehouse.revoke(id, body, { actorUserId, ipAddr, userAgent });
    }
}
