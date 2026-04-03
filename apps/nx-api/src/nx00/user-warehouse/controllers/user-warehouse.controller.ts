/**
 * File: apps/nx-api/src/nx00/user-warehouse/controllers/user-warehouse.controller.ts
 *
 * Purpose:
 * - NX00-API-USER-WH-CTRL-001：使用者據點對應 API（依 nx00_role_view／NX00_USER_WAREHOUSE）
 */

import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

import { NX00_VIEW } from '../../rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../rbac/require-nx00-view-permission.decorator';

import { UserWarehouseService } from '../services/user-warehouse.service';
import type { AssignUserWarehouseBody, RevokeUserWarehouseBody } from '../dto/user-warehouse.dto';

@Controller('user-warehouse')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class UserWarehouseController {
    constructor(private readonly userWarehouse: UserWarehouseService) {}

    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.USER_WAREHOUSE, 'read')
    async list(@Query() query: Record<string, string | undefined>, @Req() req: any) {
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.userWarehouse.list(
            {
                userId: typeof query.userId === 'string' ? query.userId : undefined,
                warehouseId: typeof query.warehouseId === 'string' ? query.warehouseId : undefined,
                isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
                page: query.page ? Number(query.page) : 1,
                pageSize: query.pageSize ? Number(query.pageSize) : 20,
            },
            { tenantScopeId },
        );
    }

    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.USER_WAREHOUSE, 'read')
    async get(@Param('id') id: string, @Req() req: any) {
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.userWarehouse.get(id, { tenantScopeId });
    }

    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.USER_WAREHOUSE, 'create')
    async assign(@Body() body: AssignUserWarehouseBody, @Req() req: any) {
        const actorUserId = req?.user?.sub;
        const ipAddr = req?.ip ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
        return this.userWarehouse.assign(body, { actorUserId, ipAddr, userAgent });
    }

    @Patch(':id/revoke')
    @RequireNx00ViewPermission(NX00_VIEW.USER_WAREHOUSE, 'update')
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
