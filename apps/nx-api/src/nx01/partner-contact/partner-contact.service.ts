// apps/nx-api/src/nx01/partner-contact/partner-contact.service.ts
// 02 第三批 T2 2026-06-07：partner 聯絡窗口子表 CRUD service
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { CreatePartnerContactDto, UpdatePartnerContactDto } from './dto/partner-contact.dto';

const SEL = {
  id: true,
  tenantId: true,
  partnerId: true,
  contactName: true,
  jobTitle: true,
  phone: true,
  phoneExt: true,
  mobile: true,
  email: true,
  note: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class PartnerContactService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser, partnerId: string) {
    const tenantId = requireTenantId(user);
    await this.assertPartner(tenantId, partnerId);
    const rows = await this.prisma.nx01PartnerContact.findMany({
      where: { tenantId, partnerId, isActive: true },
      orderBy: [{ sortNo: 'asc' }, { createdAt: 'asc' }],
      select: SEL,
    });
    return { rows };
  }

  async create(user: RequestUser, partnerId: string, dto: CreatePartnerContactDto) {
    const tenantId = requireTenantId(user);
    await this.assertPartner(tenantId, partnerId);
    const row = await this.prisma.nx01PartnerContact.create({
      data: {
        tenantId,
        partnerId,
        contactName: dto.contactName.trim(),
        jobTitle: dto.jobTitle?.trim() || null,
        phone: dto.phone?.trim() || null,
        phoneExt: dto.phoneExt?.trim() || null,
        mobile: dto.mobile?.trim() || null,
        email: dto.email?.trim() || null,
        note: dto.note?.trim() || null,
        sortNo: dto.sortNo ?? 0,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
    return row;
  }

  async update(user: RequestUser, partnerId: string, contactId: string, dto: UpdatePartnerContactDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartnerContact.findFirst({
      where: { id: contactId, tenantId, partnerId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Contact not found');
    const row = await this.prisma.nx01PartnerContact.update({
      where: { id: contactId },
      data: {
        ...(dto.contactName !== undefined ? { contactName: dto.contactName.trim() } : {}),
        ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.phoneExt !== undefined ? { phoneExt: dto.phoneExt } : {}),
        ...(dto.mobile !== undefined ? { mobile: dto.mobile } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    return row;
  }

  async remove(user: RequestUser, partnerId: string, contactId: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartnerContact.findFirst({
      where: { id: contactId, tenantId, partnerId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Contact not found');
    await this.prisma.nx01PartnerContact.delete({ where: { id: contactId } });
    return { ok: true };
  }

  private async assertPartner(tenantId: string, partnerId: string) {
    const p = await this.prisma.nx01Partner.findFirst({ where: { id: partnerId, tenantId }, select: { id: true } });
    if (!p) throw new BadRequestException('Partner not found in tenant');
  }
}
