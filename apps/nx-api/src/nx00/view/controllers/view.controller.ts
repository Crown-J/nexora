/**
 * File: apps/nx-api/src/nx00/view/controllers/view.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-VIEW-CTRL-001：View 主檔（列表／讀取：NX00_ROLE_VIEW 瀏覽；變更仍限 ADMIN）
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

import { NX00_VIEW } from '../../rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../rbac/require-nx00-view-permission.decorator';
import { assertTenantScopedOrPlatformAdmin } from '../../utils/assert-tenant-read-context';

import { ViewService } from '../services/view.service';
import type { CreateViewBody, SetActiveBody, UpdateViewBody } from '../dto/view.dto';

@Controller('view')
@UseGuards(JwtAuthGuard, RolesGuard, Nx00ViewPermissionGuard)
export class ViewController {
    constructor(private readonly view: ViewService) { }

    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.ROLE_VIEW, 'read')
    async list(@Query() query: any, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.view.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            moduleCode: typeof query.moduleCode === 'string' ? query.moduleCode : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.ROLE_VIEW, 'read')
    async get(@Param('id') id: string, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        return this.view.get(id);
    }

    @Post()
    @Roles('ADMIN')
    async create(@Body() body: CreateViewBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.view.create(body, actorUserId);
    }

    @Put(':id')
    @Roles('ADMIN')
    async update(@Param('id') id: string, @Body() body: UpdateViewBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.view.update(id, body, actorUserId);
    }

    @Patch(':id/active')
    @Roles('ADMIN')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.view.setActive(id, body, actorUserId);
    }
}
