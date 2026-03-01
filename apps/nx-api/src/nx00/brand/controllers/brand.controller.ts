/**
 * File: apps/nx-api/src/nx00/brand/controllers/brand.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-BRAND-CTRL-001：Brand CRUD endpoints (ADMIN only)
 *
 * Notes:
 * - 為寫入 AuditLog，統一傳入 actorUserId + ipAddr + userAgent
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

import { BrandService } from '../services/brand.service';
import type { CreateBrandBody, SetActiveBody, UpdateBrandBody } from '../dto/brand.dto';

@Controller('brand')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BrandController {
    constructor(private readonly brand: BrandService) { }

    /**
     * @CODE nxapi_nx00_brand_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.brand.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_brand_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.brand.get(id);
    }

    /**
     * @CODE nxapi_nx00_brand_create_001
     */
    @Post()
    async create(@Body() body: CreateBrandBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.brand.create(body, { actorUserId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_brand_update_001
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdateBrandBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.brand.update(id, body, { actorUserId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_brand_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.brand.setActive(id, body, { actorUserId, ipAddr, userAgent });
    }
}