/**
 * File: apps/nx-api/src/nx00/lookup/controllers/lookup.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOOKUP-CTRL-001：Lookup endpoints（下拉資料來源）
 *
 * Notes:
 * - 只回傳下拉需要欄位（select 精簡）
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { LookupService } from '../services/lookup.service';

@Controller('lookup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class LookupController {
    constructor(private readonly lookup: LookupService) { }

    /**
     * @CODE nxapi_nx00_lookup_brand_001
     * GET /lookup/brand?isActive=true
     */
    @Get('brand')
    async brand(@Query() query: any) {
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        return this.lookup.brand(isActive);
    }

    /**
     * @CODE nxapi_nx00_lookup_warehouse_001
     * GET /lookup/warehouse?isActive=true
     */
    @Get('warehouse')
    async warehouse(@Query() query: any) {
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        return this.lookup.warehouse(isActive);
    }

    /**
     * @CODE nxapi_nx00_lookup_location_001
     * GET /lookup/location?warehouseId=...&isActive=true
     */
    @Get('location')
    async location(@Query() query: any) {
        const warehouseId = typeof query.warehouseId === 'string' ? query.warehouseId : undefined;
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        return this.lookup.location({ warehouseId, isActive });
    }

    /**
     * @CODE nxapi_nx00_lookup_role_001
     * GET /lookup/role?isActive=true
     */
    @Get('role')
    async role(@Query() query: any) {
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        return this.lookup.role(isActive);
    }

    /**
     * @CODE nxapi_nx00_lookup_partner_001
     * GET /lookup/partner?partnerType=BOTH&isActive=true
     */
    @Get('partner')
    async partner(@Query() query: any) {
        const partnerType = typeof query.partnerType === 'string' ? query.partnerType : undefined;
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        return this.lookup.partner({ partnerType, isActive });
    }
}