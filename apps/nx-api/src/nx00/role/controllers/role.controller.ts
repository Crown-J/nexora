/**
 * File: apps/nx-api/src/nx00/role/controllers/role.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-CTRL-001：Role CRUD endpoints (ADMIN only)
 *
 * Notes:
 * - 由 roles.controller.ts 複製重構為單數命名（LITE 統一）
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
        return this.role.create(body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_role_update_001
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdateRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.role.update(id, body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_role_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.role.setActive(id, body, actorUserId);
    }
}