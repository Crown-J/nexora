/**
 * File: apps/nx-api/src/nx00/partner/controllers/partner.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PARTNER-CTRL-001：Partner CRUD（依 nx00_role_view／NX00_PARTNER）
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

import { PartnerService } from '../services/partner.service';
import type { CreatePartnerBody, SetActiveBody, UpdatePartnerBody } from '../dto/partner.dto';

@Controller('partner')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class PartnerController {
    constructor(private readonly partner: PartnerService) { }

    @Get()
    @RequireNx00ViewPermission(NX00_VIEW.PARTNER, 'read')
    async list(@Query() query: any, @Req() req: any) {
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.partner.list(
            {
                q: typeof query.q === 'string' ? query.q : undefined,
                partnerType: typeof query.partnerType === 'string' ? (query.partnerType as any) : undefined,
                isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
                page: query.page ? Number(query.page) : 1,
                pageSize: query.pageSize ? Number(query.pageSize) : 20,
            },
            { tenantScopeId },
        );
    }

    @Get(':id')
    @RequireNx00ViewPermission(NX00_VIEW.PARTNER, 'read')
    async get(@Param('id') id: string, @Req() req: any) {
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.partner.get(id, { tenantScopeId });
    }

    @Post()
    @RequireNx00ViewPermission(NX00_VIEW.PARTNER, 'create')
    async create(@Body() body: CreatePartnerBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        const tenantId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.partner.create(body, { actorUserId, tenantId, ipAddr, userAgent });
    }

    @Put(':id')
    @RequireNx00ViewPermission(NX00_VIEW.PARTNER, 'update')
    async update(@Param('id') id: string, @Body() body: UpdatePartnerBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.partner.update(id, body, { actorUserId, ipAddr, userAgent });
    }

    @Patch(':id/active')
    @RequireNx00ViewPermission(NX00_VIEW.PARTNER, 'toggleActive')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.partner.setActive(id, body, { actorUserId, ipAddr, userAgent });
    }
}
