// apps/nx-api/src/nx01/phonetic-dictionary/phonetic-dictionary.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-10-phonetic-search.md v1.0 §2.2 / §5
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { syncPhoneticIndex } from '../../shared/nx01/sync-phonetic-index';

import type {
  CreatePhoneticDictionaryDto,
  ListPhoneticDictionaryQueryDto,
  UpdatePhoneticDictionaryDto,
} from './dto/phonetic-dictionary.dto';

const SEL = {
  id: true,
  character: true,
  primaryPhonetic: true,
  altPhonetics: true,
  primaryInitial: true,
  usageFreq: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class PhoneticDictionaryService {
  constructor(private readonly prisma: PrismaService) {}

  private whereList(q: ListPhoneticDictionaryQueryDto): Prisma.Nx01PhoneticDictionaryWhereInput {
    const where: Prisma.Nx01PhoneticDictionaryWhereInput = {};
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ character: { contains: s } }, { primaryPhonetic: { contains: s } }];
    }
    if (q.primaryInitial?.trim()) {
      where.primaryInitial = q.primaryInitial.trim();
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(q: ListPhoneticDictionaryQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01PhoneticDictionary.count({ where }),
      this.prisma.nx01PhoneticDictionary.findMany({
        where,
        orderBy: [{ primaryInitial: 'asc' }, { character: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(id: string) {
    const row = await this.prisma.nx01PhoneticDictionary.findUnique({ where: { id }, select: SEL });
    if (!row) throw new NotFoundException('Phonetic dictionary entry not found');
    return row;
  }

  async create(user: RequestUser, dto: CreatePhoneticDictionaryDto) {
    const character = dto.character.trim();
    const dup = await this.prisma.nx01PhoneticDictionary.findUnique({
      where: { character },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Character already exists in dictionary');
    return this.prisma.nx01PhoneticDictionary.create({
      data: {
        character,
        primaryPhonetic: dto.primaryPhonetic.trim(),
        altPhonetics: dto.altPhonetics ?? [],
        primaryInitial: dto.primaryInitial.trim(),
        usageFreq: dto.usageFreq ?? 0,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  async update(user: RequestUser, id: string, dto: UpdatePhoneticDictionaryDto) {
    const existing = await this.prisma.nx01PhoneticDictionary.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Phonetic dictionary entry not found');
    return this.prisma.nx01PhoneticDictionary.update({
      where: { id },
      data: {
        ...(dto.primaryPhonetic !== undefined
          ? { primaryPhonetic: dto.primaryPhonetic.trim() }
          : {}),
        ...(dto.altPhonetics !== undefined ? { altPhonetics: dto.altPhonetics } : {}),
        ...(dto.primaryInitial !== undefined
          ? { primaryInitial: dto.primaryInitial.trim() }
          : {}),
        ...(dto.usageFreq !== undefined ? { usageFreq: dto.usageFreq } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const existing = await this.prisma.nx01PhoneticDictionary.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Phonetic dictionary entry not found');
    return this.prisma.nx01PhoneticDictionary.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
  }

  /**
   * 02 真正完工軌 2026-06-07：重建本租戶 partner + part 的 phonetic_index
   *
   * 用途：灌字典 seed 後、把既有 partner.name / part.name 的索引 re-sync
   *       （既有 row 之前用 char fallback、字典灌完後改用注音）
   *
   * 跳過 isManual=true 的 row（業務員手動改過的不覆蓋、syncPhoneticIndex 內部已守）
   */
  async rebuildIndexForTenant(user: RequestUser) {
    const tenantId = requireTenantId(user);

    const partners = await this.prisma.nx01Partner.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, shortName: true },
    });
    for (const p of partners) {
      await syncPhoneticIndex(this.prisma, {
        tenantId,
        sourceTable: 'nx01_partner',
        sourceId: p.id,
        sourceField: 'name',
        sourceText: [p.name, p.shortName].filter(Boolean).join(' '),
        userId: user.sub,
      });
    }

    const parts = await this.prisma.nx01Part.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    });
    for (const part of parts) {
      await syncPhoneticIndex(this.prisma, {
        tenantId,
        sourceTable: 'nx01_part',
        sourceId: part.id,
        sourceField: 'name',
        sourceText: part.name,
        userId: user.sub,
      });
    }

    return {
      ok: true,
      partnersIndexed: partners.length,
      partsIndexed: parts.length,
    };
  }
}
