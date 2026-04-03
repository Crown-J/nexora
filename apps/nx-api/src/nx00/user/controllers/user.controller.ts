/**
 * File: apps/nx-api/src/nx00/user/controllers/user.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-CTRL-001：User CRUD（讀寫依 nx00_role_view／NX00_USER）
 *
 * Notes:
 * - 寫入 AuditLog 時需要 actorUserId + ipAddr + userAgent，因此由 Controller 統一取值後傳入 Service
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

import { UserService } from '../services/user.service';
import type { CreateUserBody, SetActiveBody, UpdateUserBody } from '../dto/user.dto';

@Controller('user')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class UserController {
    constructor(private readonly user: UserService) { }

    /**
     * @CODE nxapi_nx00_user_list_001
     */
    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.USER, 'read')
    async list(@Query() query: any, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.user.list(
            {
                q: typeof query.q === 'string' ? query.q : undefined,
                page: query.page ? Number(query.page) : 1,
                pageSize: query.pageSize ? Number(query.pageSize) : 20,
            },
            { tenantScopeId },
        );
    }

    /**
     * @CODE nxapi_nx00_user_get_001
     */
    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.USER, 'read')
    async get(@Param('id') id: string, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.user.get(id, { tenantScopeId });
    }

    /**
     * @CODE nxapi_nx00_user_create_001
     */
    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.USER, 'create')
    async create(@Body() body: CreateUserBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        // audit context（若後端有 proxy/ingress，req.ip 可能是 proxy ip；之後可再統一從 x-forwarded-for 取值）
        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        const tenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.user.create(body, { actorUserId, tenantId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_user_update_001
     */
    @Put(':id')
    @RequireNx00ViewPermission(NX00_VIEW.USER, 'update')
    async update(@Param('id') id: string, @Body() body: UpdateUserBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        // audit context
        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.user.update(id, body, { actorUserId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_user_set_active_001
     */
    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.USER, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        // audit context
        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.user.setActive(id, body, { actorUserId, ipAddr, userAgent });
    }
}
