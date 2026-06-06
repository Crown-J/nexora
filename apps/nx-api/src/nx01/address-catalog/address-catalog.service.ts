// apps/nx-api/src/nx01/address-catalog/address-catalog.service.ts
// 02 對齊第二批 A 軌 CP3 2026-06-06：地址型錄 read-only service（city / district）
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AddressCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** 縣市清單（全域字典、TWN 預設 22 筆）。AddressPicker 第一層下拉用。 */
  async listCities(query?: { countryId?: string; isActive?: boolean }) {
    const where: Record<string, unknown> = {};
    if (query?.countryId?.trim()) where.countryId = query.countryId.trim();
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    else where.isActive = true;
    const rows = await this.prisma.nx01City.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        nameEn: true,
        countryId: true,
        sortOrder: true,
        isActive: true,
      },
    });
    return { rows };
  }

  /** 鄉鎮清單（依 cityId filter）。選縣市後第二層下拉用、含 postalCode 自動帶。 */
  async listDistricts(query: { cityId: string; isActive?: boolean }) {
    const where: Record<string, unknown> = {};
    if (!query.cityId?.trim()) return { rows: [] };
    where.cityId = query.cityId.trim();
    if (query.isActive !== undefined) where.isActive = query.isActive;
    else where.isActive = true;
    const rows = await this.prisma.nx01District.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        cityId: true,
        code: true,
        name: true,
        nameEn: true,
        postalCode: true,
        sortOrder: true,
        isActive: true,
      },
    });
    return { rows };
  }
}
