/**
 * File: apps/nx-api/src/nx00/role/controllers/role.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-CTRL-001：Role CRUD（讀寫依 nx00_role_view／NX00_ROLE）
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
import { assertTenantScopedOrPlatformAdmin } from '../../utils/assert-tenant-read-context';

import { RoleService } from '../services/role.service';
import type { CreateRoleBody, SetActiveBody, UpdateRoleBody } from '../dto/role.dto';

@Controller('role')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class RoleController {
    constructor(private readonly role: RoleService) { }

    /**
     * @CODE nxapi_nx00_role_list_001
     */
    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.ROLE, 'read')
    async list(@Query() query: any, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.role.list(
            {
                q: typeof query.q === 'string' ? query.q : undefined,
                page: query.page ? Number(query.page) : 1,
                pageSize: query.pageSize ? Number(query.pageSize) : 20,
            },
            { tenantScopeId },
        );
    }

    /**
     * @CODE nxapi_nx00_role_get_001
     */
    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.ROLE, 'read')
    async get(@Param('id') id: string, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.role.get(id, { tenantScopeId });
    }

    /**
     * @CODE nxapi_nx00_role_create_001
     */
    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.ROLE, 'create')
    async create(@Body() body: CreateRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        const tenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.role.create(body, { actorUserId, tenantId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_role_update_001
     */
    @Put(':id')
    @RequireNx00ViewPermission(NX00_VIEW.ROLE, 'update')
    async update(@Param('id') id: string, @Body() body: UpdateRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.role.update(id, body, { actorUserId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_role_set_active_001
     */
    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.ROLE, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.role.setActive(id, body, { actorUserId, ipAddr, userAgent });
    }
}
