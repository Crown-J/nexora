/**
 * File: apps/nx-api/src/nx00/roles/controllers/roles.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLES-CTRL-001：Roles CRUD endpoints (ADMIN only)
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

import { RolesService } from '../services/roles.service';
import type { CreateRoleBody, SetActiveBody, UpdateRoleBody } from '../dto/roles.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RolesController {
    constructor(private readonly roles: RolesService) { }

    /**
     * @CODE nxapi_nx00_roles_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.roles.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_roles_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.roles.get(id);
    }

    /**
     * @CODE nxapi_nx00_roles_create_001
     */
    @Post()
    async create(@Body() body: CreateRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.roles.create(body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_roles_update_001
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdateRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.roles.update(id, body, actorUserId);
    }

    /**
     * @CODE nxapi_nx00_roles_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.roles.setActive(id, body, actorUserId);
    }
}