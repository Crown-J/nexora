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

import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

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
    async brand(@Query() query: any, @Req() req: any) {
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.lookup.brand(isActive, { tenantScopeId });
    }

    /**
     * @CODE nxapi_nx00_lookup_car_brand_001
     * GET /lookup/car-brand?isActive=true
     */
    @Get('car-brand')
    async carBrand(@Query() query: any, @Req() req: any) {
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.lookup.carBrand(isActive, { tenantScopeId });
    }

    /**
     * @CODE nxapi_nx00_lookup_warehouse_001
     * GET /lookup/warehouse?isActive=true
     * 說明：方法級 @Roles() 覆寫 class 的 ADMIN，供庫存等模組一般登入使用者下拉用
     */
    @Get('warehouse')
    @Roles()
    async warehouse(@Query() query: any, @Req() req: any) {
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.lookup.warehouse(isActive, { tenantScopeId });
    }

    /**
     * @CODE nxapi_nx00_lookup_location_001
     * GET /lookup/location?warehouseId=...&isActive=true
     */
    @Get('location')
    async location(@Query() query: any, @Req() req: any) {
        const warehouseId = typeof query.warehouseId === 'string' ? query.warehouseId : undefined;
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.lookup.location({ warehouseId, isActive }, { tenantScopeId });
    }

    /**
     * @CODE nxapi_nx00_lookup_role_001
     * GET /lookup/role?isActive=true
     */
    @Get('role')
    async role(@Query() query: any, @Req() req: any) {
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.lookup.role(isActive, { tenantScopeId });
    }

    /**
     * @CODE nxapi_nx00_lookup_partner_001
     * GET /lookup/partner?partnerType=BOTH&isActive=true
     */
    @Get('partner')
    async partner(@Query() query: any, @Req() req: any) {
        const partnerType = typeof query.partnerType === 'string' ? query.partnerType : undefined;
        const isActive = query.isActive === undefined ? undefined : String(query.isActive) === 'true';
        const tenantScopeId = (req?.user?.tenantId as string | null | undefined) ?? null;
        return this.lookup.partner({ partnerType, isActive }, { tenantScopeId });
    }
}