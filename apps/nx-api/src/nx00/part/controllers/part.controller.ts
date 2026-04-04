/**
 * File: apps/nx-api/src/nx00/part/controllers/part.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PART-CTRL-001：Part CRUD（依 nx00_role_view／NX00_PART）
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

import { PartService } from '../services/part.service';
import type { CreatePartBody, SetActiveBody, UpdatePartBody } from '../dto/part.dto';

@Controller('part')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class PartController {
    constructor(private readonly part: PartService) { }

    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.PART, 'read')
    async list(@Query() query: any, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.part.list(
            {
                q: typeof query.q === 'string' ? query.q : undefined,
                partBrandId: typeof query.partBrandId === 'string' ? query.partBrandId : undefined,
                isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
                page: query.page ? Number(query.page) : 1,
                pageSize: query.pageSize ? Number(query.pageSize) : 20,
            },
            { tenantScopeId },
        );
    }

    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.PART, 'read')
    async get(@Param('id') id: string, @Req() req: any) {
        assertTenantScopedOrPlatformAdmin(req?.user);
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.part.get(id, { tenantScopeId });
    }

    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.PART, 'create')
    async create(@Body() body: CreatePartBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        const tenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.part.create(body, { actorUserId, tenantId, ipAddr, userAgent });
    }

    @Put(':id')
    @RequireNx00ViewPermission(NX00_VIEW.PART, 'update')
    async update(@Param('id') id: string, @Body() body: UpdatePartBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        const tenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.part.update(id, body, { actorUserId, tenantId, ipAddr, userAgent });
    }

    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.PART, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        const tenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.part.setActive(id, body, { actorUserId, tenantId, ipAddr, userAgent });
    }
}
