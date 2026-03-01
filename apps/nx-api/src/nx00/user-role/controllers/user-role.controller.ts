/**
 * File: apps/nx-api/src/nx00/user-role/controllers/user-role.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-ROLE-CTRL-001：UserRole endpoints (ADMIN only)
 *
 * Notes:
 * - assign：指派角色
 * - revoke：撤銷（soft revoke：revoked_at + is_active=false）
 * - setPrimary：設為主角色（同 user 只能有一個 primary）
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

import { UserRoleService } from '../services/user-role.service';
import type { AssignUserRoleBody, RevokeUserRoleBody, SetActiveBody, SetPrimaryBody } from '../dto/user-role.dto';

@Controller('user-role')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UserRoleController {
    constructor(private readonly userRole: UserRoleService) { }

    /**
     * @CODE nxapi_nx00_user_role_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.userRole.list({
            userId: typeof query.userId === 'string' ? query.userId : undefined,
            roleId: typeof query.roleId === 'string' ? query.roleId : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_user_role_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.userRole.get(id);
    }

    /**
     * @CODE nxapi_nx00_user_role_assign_001
     */
    @Post()
    async assign(@Body() body: AssignUserRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.userRole.assign(body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_user_role_revoke_001
     */
    @Patch(':id/revoke')
    async revoke(@Param('id') id: string, @Body() body: RevokeUserRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.userRole.revoke(id, body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_user_role_set_primary_001
     */
    @Patch(':id/primary')
    async setPrimary(@Param('id') id: string, @Body() body: SetPrimaryBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.userRole.setPrimary(id, body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_user_role_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.userRole.setActive(id, body, actorUserId);
    }
}