/**
 * File: apps/nx-api/src/nx00/brand/controllers/brand.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-BRAND-CTRL-001：Brand CRUD（依 nx00_role_view／NX00_BRAND）
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

import { BrandService } from '../services/brand.service';
import type { CreateBrandBody, SetActiveBody, UpdateBrandBody } from '../dto/brand.dto';

@Controller('brand')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class BrandController {
    constructor(private readonly brand: BrandService) { }

    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.BRAND, 'read')
    async list(@Query() query: any) {
        return this.brand.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.BRAND, 'read')
    async get(@Param('id') id: string) {
        return this.brand.get(id);
    }

    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.BRAND, 'create')
    async create(@Body() body: CreateBrandBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        const tenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.brand.create(body, { actorUserId, tenantId, ipAddr, userAgent });
    }

    @Put(':id')
    @RequireNx00ViewPermission(NX00_VIEW.BRAND, 'update')
    async update(@Param('id') id: string, @Body() body: UpdateBrandBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.brand.update(id, body, { actorUserId, ipAddr, userAgent });
    }

    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.BRAND, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.brand.setActive(id, body, { actorUserId, ipAddr, userAgent });
    }
}
