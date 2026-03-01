/**
 * File: apps/nx-api/src/nx00/role-view/controllers/role-view.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-VIEW-CTRL-001：RoleView endpoints (ADMIN only)
 *
 * Notes:
 * - grant：授予（建立或重新啟用）
 * - revoke：撤銷（soft revoke）
 * - perms：更新 CRUDX 權限
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
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { RoleViewService } from '../services/role-view.service';
import type {
    GrantRoleViewBody,
    RevokeRoleViewBody,
    SetActiveBody,
    UpdateRoleViewPermsBody,
} from '../dto/role-view.dto';

@Controller('role-view')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RoleViewController {
    constructor(private readonly roleView: RoleViewService) { }

    /**
     * @CODE nxapi_nx00_role_view_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.roleView.list({
            roleId: typeof query.roleId === 'string' ? query.roleId : undefined,
            viewId: typeof query.viewId === 'string' ? query.viewId : undefined,
            moduleCode: typeof query.moduleCode === 'string' ? query.moduleCode : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_role_view_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.roleView.get(id);
    }

    /**
     * @CODE nxapi_nx00_role_view_grant_001
     */
    @Post()
    async grant(@Body() body: GrantRoleViewBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.roleView.grant(body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_role_view_update_perms_001
     */
    @Patch(':id/perms')
    async updatePerms(@Param('id') id: string, @Body() body: UpdateRoleViewPermsBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.roleView.updatePerms(id, body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_role_view_revoke_001
     */
    @Patch(':id/revoke')
    async revoke(@Param('id') id: string, @Body() body: RevokeRoleViewBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.roleView.revoke(id, body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_role_view_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.roleView.setActive(id, body, actorUserId);
    }
}