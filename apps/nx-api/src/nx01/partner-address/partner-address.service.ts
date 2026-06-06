// apps/nx-api/src/nx01/partner-address/partner-address.service.ts
// 02 對齊第二批 A 軌 CP3 2026-06-06：partner_address 衛星 CRUD service
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { CreatePartnerAddressDto, UpdatePartnerAddressDto } from './dto/partner-address.dto';

const SEL = {
  id: true,
  tenantId: true,
  partnerId: true,
  addressType: true,
  label: true,
  isDefault: true,
  countryId: true,
  cityId: true,
  districtId: true,
  postalCode: true,
  streetName: true,
  lane: true,
  alley: true,
  buildingNo: true,
  buildingSubNo: true,
  floor: true,
  roomNo: true,
  freeformAddress: true,
  recipientName: true,
  recipientPhone: true,
  note: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  city: { select: { code: true, name: true } },
  district: { select: { code: true, name: true } },
  country: { select: { code: true, name: true } },
} as const;

@Injectable()
export class PartnerAddressService {
  constructor(private readonly prisma: PrismaService) {}

  /** 列出 partner 所有地址（收帳 + 送貨）、依 addressType + isDefault 排序 */
  async list(user: RequestUser, partnerId: string) {
    const tenantId = requireTenantId(user);
    await this.assertPartner(tenantId, partnerId);
    const rows = await this.prisma.nx01PartnerAddress.findMany({
      where: { tenantId, partnerId, isActive: true },
      orderBy: [{ addressType: 'asc' }, { isDefault: 'desc' }, { createdAt: 'asc' }],
      select: SEL,
    });
    return { rows };
  }

  async create(user: RequestUser, partnerId: string, dto: CreatePartnerAddressDto) {
    const tenantId = requireTenantId(user);
    await this.assertPartner(tenantId, partnerId);

    // 收帳地址同 partner 內最多 1 筆（DB 也有 partial unique index）
    if (dto.addressType === 'BILLING') {
      const dup = await this.prisma.nx01PartnerAddress.findFirst({
        where: { tenantId, partnerId, addressType: 'BILLING', isActive: true },
        select: { id: true },
      });
      if (dup) throw new ConflictException('該客戶已有收帳地址、請改成編輯既有那筆');
    }

    // 若指定 isDefault=true、先把同 type 其他 default 清掉（同 type 內 isDefault unique）
    if (dto.isDefault) {
      await this.prisma.nx01PartnerAddress.updateMany({
        where: { tenantId, partnerId, addressType: dto.addressType, isDefault: true, isActive: true },
        data: { isDefault: false, updatedBy: user.sub },
      });
    }

    const row = await this.prisma.nx01PartnerAddress.create({
      data: {
        tenantId,
        partnerId,
        addressType: dto.addressType,
        label: dto.label?.trim() || null,
        isDefault: dto.isDefault ?? (dto.addressType === 'BILLING'),
        countryId: dto.countryId?.trim() || null,
        cityId: dto.cityId?.trim() || null,
        districtId: dto.districtId?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
        streetName: dto.streetName?.trim() || null,
        lane: dto.lane?.trim() || null,
        alley: dto.alley?.trim() || null,
        buildingNo: dto.buildingNo?.trim() || null,
        buildingSubNo: dto.buildingSubNo?.trim() || null,
        floor: dto.floor?.trim() || null,
        roomNo: dto.roomNo?.trim() || null,
        freeformAddress: dto.freeformAddress?.trim() || null,
        recipientName: dto.recipientName?.trim() || null,
        recipientPhone: dto.recipientPhone?.trim() || null,
        note: dto.note?.trim() || null,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
    return row;
  }

  async update(user: RequestUser, partnerId: string, addressId: string, dto: UpdatePartnerAddressDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartnerAddress.findFirst({
      where: { id: addressId, tenantId, partnerId },
      select: { id: true, addressType: true, isDefault: true },
    });
    if (!existing) throw new NotFoundException('Address not found');

    // 改 isDefault=true → 清同 type 其他 default
    if (dto.isDefault === true && !existing.isDefault) {
      await this.prisma.nx01PartnerAddress.updateMany({
        where: { tenantId, partnerId, addressType: existing.addressType, isDefault: true, isActive: true, NOT: { id: addressId } },
        data: { isDefault: false, updatedBy: user.sub },
      });
    }

    const row = await this.prisma.nx01PartnerAddress.update({
      where: { id: addressId },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
        ...(dto.cityId !== undefined ? { cityId: dto.cityId } : {}),
        ...(dto.districtId !== undefined ? { districtId: dto.districtId } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.streetName !== undefined ? { streetName: dto.streetName } : {}),
        ...(dto.lane !== undefined ? { lane: dto.lane } : {}),
        ...(dto.alley !== undefined ? { alley: dto.alley } : {}),
        ...(dto.buildingNo !== undefined ? { buildingNo: dto.buildingNo } : {}),
        ...(dto.buildingSubNo !== undefined ? { buildingSubNo: dto.buildingSubNo } : {}),
        ...(dto.floor !== undefined ? { floor: dto.floor } : {}),
        ...(dto.roomNo !== undefined ? { roomNo: dto.roomNo } : {}),
        ...(dto.freeformAddress !== undefined ? { freeformAddress: dto.freeformAddress } : {}),
        ...(dto.recipientName !== undefined ? { recipientName: dto.recipientName } : {}),
        ...(dto.recipientPhone !== undefined ? { recipientPhone: dto.recipientPhone } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    return row;
  }

  async remove(user: RequestUser, partnerId: string, addressId: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartnerAddress.findFirst({
      where: { id: addressId, tenantId, partnerId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Address not found');
    // 真刪（地址純衛星、無歷史單據參照、可硬刪）
    await this.prisma.nx01PartnerAddress.delete({ where: { id: addressId } });
    return { ok: true };
  }

  private async assertPartner(tenantId: string, partnerId: string) {
    const p = await this.prisma.nx01Partner.findFirst({ where: { id: partnerId, tenantId }, select: { id: true } });
    if (!p) throw new BadRequestException('Partner not found in tenant');
  }
}
