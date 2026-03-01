/**
 * File: apps/nx-api/src/nx00/partner/controllers/partner.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PARTNER-CTRL-001：Partner CRUD endpoints (ADMIN only)
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

import { PartnerService } from '../services/partner.service';
import type { CreatePartnerBody, SetActiveBody, UpdatePartnerBody } from '../dto/partner.dto';

@Controller('partner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PartnerController {
    constructor(private readonly partner: PartnerService) { }

    /**
     * @CODE nxapi_nx00_partner_list_001
     */
    @Get()
    async list(@Query() query: any) {
        return this.partner.list({
            q: typeof query.q === 'string' ? query.q : undefined,
            partnerType: typeof query.partnerType === 'string' ? (query.partnerType as any) : undefined,
            isActive: query.isActive === undefined ? undefined : String(query.isActive) === 'true',
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
        });
    }

    /**
     * @CODE nxapi_nx00_partner_get_001
     */
    @Get(':id')
    async get(@Param('id') id: string) {
        return this.partner.get(id);
    }

    /**
     * @CODE nxapi_nx00_partner_create_001
     */
    @Post()
    async create(@Body() body: CreatePartnerBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.partner.create(body, { actorUserId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_partner_update_001
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: UpdatePartnerBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.partner.update(id, body, { actorUserId, ipAddr, userAgent });
    }

    /**
     * @CODE nxapi_nx00_partner_set_active_001
     */
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
        const actorUserId = req?.user?.sub as string | undefined;

        const ipAddr = (req?.ip as string | undefined) ?? null;
        const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

        return this.partner.setActive(id, body, { actorUserId, ipAddr, userAgent });
    }
}