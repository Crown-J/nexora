/**
 * File: apps/nx-api/src/nx00/user-role/controllers/user-role.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-ROLE-CTRL-001：UserRole（依 nx00_role_view／NX00_USER_ROLE）
 */

import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

import { NX00_VIEW } from '../../rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../rbac/require-nx00-view-permission.decorator';
import { assertTenantScopedOrPlatformAdmin } from '../../utils/assert-tenant-read-context';

import { UserRoleService } from '../services/user-role.service';
import type {
    AssignUserRoleBody,
    RevokeUserRoleBody,
    SetActiveBody,
    SetPrimaryBody,
} from '../dto/user-role.dto';

function mutationCtx(req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    const actorTenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
    return { actorUserId, actorTenantId, ipAddr, userAgent };
}

@Controller('user-role')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class UserRoleController {
    constructor(private readonly userRole: UserRoleService) { }

    /**
     * @CODE nxapi_nx00_user_role_list_001
     */
    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.USER_ROLE, 'read')
    async list(@Query() query: any, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.userRole.list(
            {
                userId: typeof query.userId === 'string' ? query.userId : undefined,
                roleId: typeof query.roleId === 'string' ? query.roleId : undefined,
                isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
                page: query.page ? Number(query.page) : 1,
                pageSize: query.pageSize ? Number(query.pageSize) : 20,
            },
            { tenantScopeId },
        );
    }

    /**
     * @CODE nxapi_nx00_user_role_get_001
     */
    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.USER_ROLE, 'read')
    async get(@Param('id') id: string, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.userRole.get(id, { tenantScopeId });
    }

    /**
     * @CODE nxapi_nx00_user_role_assign_001
     */
    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.USER_ROLE, 'create')
    async assign(@Body() body: AssignUserRoleBody, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.userRole.assign(body, mutationCtx(req));
    }

    /**
     * @CODE nxapi_nx00_user_role_revoke_001
     */
    @Patch(':id/revoke')
    @RequireNx00ViewPermission(NX00_VIEW.USER_ROLE, 'update')
    async revoke(@Param('id') id: string, @Body() body: RevokeUserRoleBody, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.userRole.revoke(id, body, mutationCtx(req));
    }

    /**
     * @CODE nxapi_nx00_user_role_set_primary_001
     */
    @Patch(':id/primary')
    @RequireNx00ViewPermission(NX00_VIEW.USER_ROLE, 'update')
    async setPrimary(@Param('id') id: string, @Body() body: SetPrimaryBody, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.userRole.setPrimary(id, body, mutationCtx(req));
    }

    /**
     * @CODE nxapi_nx00_user_role_set_active_001
     */
    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.USER_ROLE, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.userRole.setActive(id, body, mutationCtx(req));
    }
}
