import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

import { NX00_VIEW } from '../../rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../rbac/require-nx00-view-permission.decorator';

import { CarBrandService } from '../services/car-brand.service';
import type { CreateCarBrandBody, SetActiveBody, UpdateCarBrandBody } from '../dto/car-brand.dto';

@Controller('car-brand')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class CarBrandController {
    constructor(private readonly carBrand: CarBrandService) {}

    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.CAR_BRAND, 'read')
    async list(@Query() query: any) {
        return this.carBrand.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 50,
        });
    }

    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.CAR_BRAND, 'read')
    async get(@Param('id') id: string) {
        return this.carBrand.get(id);
    }

    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.CAR_BRAND, 'create')
    async create(@Body() body: CreateCarBrandBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        const tenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.carBrand.create(body, {
            actorUserId,
            tenantId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Put(':id')
    @RequireNx00ViewPermission(NX00_VIEW.CAR_BRAND, 'update')
    async update(@Param('id') id: string, @Body() body: UpdateCarBrandBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.carBrand.update(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }

    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.CAR_BRAND, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;
        return this.carBrand.setActive(id, body, {
            actorUserId,
            ipAddr: (req?.ip as string | undefined) ?? null,
            userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        });
    }
}
