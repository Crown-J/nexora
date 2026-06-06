// apps/nx-api/src/nx01/address-catalog/address-catalog.controller.ts
// 02 對齊第二批 A 軌 CP3 2026-06-06：地址型錄 read-only controller
import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import { AddressCatalogService } from './address-catalog.service';

@Controller('nx01/address-catalog')
@UseGuards(JwtAuthGuard)
export class AddressCatalogController {
  constructor(private readonly svc: AddressCatalogService) {}

  /** GET /nx01/address-catalog/cities?countryId=TWN_ID */
  @Get('cities')
  cities(@Query('countryId') countryId?: string, @Query('isActive') isActive?: string) {
    return this.svc.listCities({
      countryId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  /** GET /nx01/address-catalog/districts?cityId=X */
  @Get('districts')
  districts(@Query('cityId') cityId: string, @Query('isActive') isActive?: string) {
    return this.svc.listDistricts({
      cityId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }
}
