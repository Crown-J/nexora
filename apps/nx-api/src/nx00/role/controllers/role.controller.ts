/**
 * File: apps/nx-api/src/nx00/role/controllers/role.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-CTRL-001：Role CRUD endpoints (ADMIN only)
 *
 * Notes:
 * - 由 roles.controller.ts 複製重構為單數命名（LITE 統一）
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
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { RoleService } from '../services/role.service';
import type { CreateRoleBody, SetActiveBody, UpdateRoleBody } from '../dto/role.dto';

@Controller('role')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RoleController {
    constructor(private readonly role: RoleService) { }

    /**
     * @CODE nxapi_nx00_role_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.role.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_role_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.role.get(id);
    }

    /**
     * @CODE nxapi_nx00_role_create_001
     */
    @Post()
    async create(@Body() body: CreateRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        // audit context（若後端有 proxy/ingress，req.ip 可能是 proxy ip；之後可再統一從 x-forwarded-for 取值）
        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.role.create(body, { actorUserId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_role_update_001
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdateRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        // audit context
        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.role.update(id, body, { actorUserId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_role_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        // audit context
        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.role.setActive(id, body, { actorUserId, ipAddr, userAgent });
    }
}