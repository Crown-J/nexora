import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

import { NX00_VIEW } from '../../rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../rbac/require-nx00-view-permission.decorator';

import { BrandCodeRoleService } from '../services/brand-code-role.service';
import type { CreateBrandCodeRoleBody, SetActiveBody, UpdateBrandCodeRoleBody } from '../dto/brand-code-role.dto';

@Controller('brand-code-role')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class BrandCodeRoleController {
    constructor(private readonly svc: BrandCodeRoleService) { }

    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.PART_BRAND, 'read')
    async list(@Query() query: any, @Req() req: any) {
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.svc.list(
            {
                q: typeof query.q === 'string' ? query.q : undefined,
                isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
                page: query.page ? Number(query.page) : 1,
                pageSize: query.pageSize ? Number(query.pageSize) : 50,
            },
            { tenantScopeId },
        );
    }

    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.PART_BRAND, 'read')
    async get(@Param('id') id: string, @Req() req: any) {
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.svc.get(id, { tenantScopeId });
    }

    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.PART_BRAND, 'create')
    async create(@Body() body: CreateBrandCodeRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.svc.create(body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Put(':id')
    @RequireNx00ViewPermission(NX00_VIEW.PART_BRAND, 'update')
    async update(@Param('id') id: string, @Body() body: UpdateBrandCodeRoleBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.svc.update(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.PART_BRAND, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.svc.setActive(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }
}
