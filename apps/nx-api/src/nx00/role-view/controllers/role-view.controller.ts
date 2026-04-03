/**
 * File: apps/nx-api/src/nx00/role-view/controllers/role-view.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-VIEW-CTRL-001：RoleView（依 nx00_role_view／NX00_ROLE_VIEW）
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

import { RoleViewService } from '../services/role-view.service';
import type {
    GrantRoleViewBody,
    RevokeRoleViewBody,
    SetActiveBody,
    UpdateRoleViewPermsBody,
    UpsertRoleViewDto,
} from '../dto/role-view.dto';

function roleViewCtx(req: any) {
    return {
        actorUserId: req?.user?.sub as string | undefined,
        actorTenantId: (req?.user?.tenantId as string | null | undefined) ?? null,
        ipAddr: (req?.ip as string | undefined) ?? null,
        userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
    };
}

@Controller('role-view')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class RoleViewController {
    constructor(private readonly roleView: RoleViewService) { }

    /**
     * @CODE nxapi_nx00_role_view_list_001
     */
    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.ROLE_VIEW, 'read')
    async list(@Query() query: any, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.roleView.list(
            {
                roleId: typeof query.roleId === 'string' ? query.roleId : undefined,
                viewId: typeof query.viewId === 'string' ? query.viewId : undefined,
                moduleCode: typeof query.moduleCode === 'string' ? query.moduleCode : undefined,
                isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
                page: query.page ? Number(query.page) : 1,
                pageSize: query.pageSize ? Number(query.pageSize) : 20,
            },
            { tenantScopeId },
        );
    }

    /**
     * @CODE nxapi_nx00_role_view_grant_001
     */
    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.ROLE_VIEW, 'create')
    async grant(@Body() body: GrantRoleViewBody, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.roleView.grant(body, roleViewCtx(req));
    }

    /**
     * @CODE nxapi_nx00_role_view_update_perms_001
     */
    @Patch(':id/perms')
    @RequireNx00ViewPermission(NX00_VIEW.ROLE_VIEW, 'update')
    async updatePerms(@Param('id') id: string, @Body() body: UpdateRoleViewPermsBody, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.roleView.updatePerms(id, body, roleViewCtx(req));
    }

    /**
     * @CODE nxapi_nx00_role_view_revoke_001
     */
    @Patch(':id/revoke')
    @RequireNx00ViewPermission(NX00_VIEW.ROLE_VIEW, 'update')
    async revoke(@Param('id') id: string, @Body() body: RevokeRoleViewBody, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.roleView.revoke(id, body, roleViewCtx(req));
    }

    /**
     * @CODE nxapi_nx00_role_view_set_active_001
     */
    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.ROLE_VIEW, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.roleView.setActive(id, body, roleViewCtx(req));
    }

    /**
     * @CODE nxapi_nx00_role_view_get_by_role_001
     */
    @Get('role/:roleId')
    @RequireNx00ViewPermission(NX00_VIEW.ROLE_VIEW, 'read')
    async getByRoleId(@Param('roleId') roleId: string, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.roleView.getByRoleId(roleId, { tenantScopeId });
    }

    /**
     * @CODE nxapi_nx00_role_view_upsert_by_role_001
     */
    @Put('role/:roleId')
    @RequireNx00ViewPermission(NX00_VIEW.ROLE_VIEW, 'update')
    async upsertByRoleId(@Param('roleId') roleId: string, @Body() body: UpsertRoleViewDto, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.roleView.upsertByRoleId(roleId, body.items ?? [], roleViewCtx(req));
    }
}
