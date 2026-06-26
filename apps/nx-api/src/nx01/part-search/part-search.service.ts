// apps/nx-api/src/nx01/part-search/part-search.service.ts
// F2 料號即時搜尋 service（執行長 2026-06-17 拍板）
//
// 七支查詢全部 read-only、不寫任何資料、不會觸發 audit log。
// 全公司任何登入使用者可呼叫（controller 不掛 @Roles、RolesGuard 看到沒設角色直接放行）。
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { searchPhoneticSourceIds } from '../../shared/nx01/sync-phonetic-index';
import { PartPhotoService } from '../part-photo/part-photo.service';

import type { PartSearchQueryDto } from './dto/part-search.dto';

/** 料號正規化：去 [空格 # - * .] 後 lowercase，讓 VAG-03H / VAG 03H / 03H.115.562 都比對到。*/
function normalizeCode(s: string): string {
  return s.replace(/[\s#\-*.]/g, '').toLowerCase();
}

/** 結果總筆數硬上限（執行長拍板：超過會 limitReached=true、UI 提示加條件）*/
const HARD_RESULT_LIMIT = 500;

@Injectable()
export class PartSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partPhotoSvc: PartPhotoService,
  ) {}

  /** 產品圖片 list（proxy 既有 PartPhotoService、放寬給 F2 全公司可用）*/
  async listPhotos(user: RequestUser, partId: string) {
    return this.partPhotoSvc.list(user, partId);
  }

  /** 產品圖片 binary（proxy 既有 PartPhotoService）*/
  async downloadPhoto(user: RequestUser, partId: string, photoId: string) {
    return this.partPhotoSvc.download(user, partId, photoId);
  }

  /**
   * F2 廠牌 / 族群主檔下拉（全公司可用）。
   * 既有 /nx01/brands / /nx01/part-groups 限 SYSADMIN/OWNER、業務員撈不到、
   * 本 endpoint 走 JwtAuthGuard 只讀回 id/code/name 三欄、不洩漏其他敏感欄位。
   * 執行長 2026-06-17 第四次回饋:F2 全公司用、不該因主檔權限載不到而失效。
   */
  async getMasterOptions(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const [brands, partGroups] = await Promise.all([
      this.prisma.nx01Brand.findMany({
        where: { tenantId, isPart: true, isActive: true },
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        select: { id: true, code: true, name: true },
        take: 200,
      }),
      this.prisma.nx01PartGroup.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        select: { id: true, code: true, name: true },
        take: 200,
      }),
    ]);
    return { brands, partGroups };
  }

  /**
   * 安全量 / 最高量 / 建議補貨量 (per 倉位)
   * 對應 Nx03PartStockSetting，執行長原始需求 4 進貨專用「安全量與最高量」。
   */
  async getStockSettings(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx03PartStockSetting.findMany({
      where: { tenantId, partId, isActive: true },
      orderBy: { warehouse: { sortNo: 'asc' } },
      select: {
        minQty: true,
        maxQty: true,
        reorderQty: true,
        remark: true,
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
    return {
      rows: rows.map((r) => ({
        warehouseId: r.warehouse.id,
        warehouseCode: r.warehouse.code,
        warehouseName: r.warehouse.name,
        minQty: r.minQty.toString(),
        maxQty: r.maxQty.toString(),
        reorderQty: r.reorderQty.toString(),
        remark: r.remark,
      })),
    };
  }

  /** F2 主搜尋：四欄篩選 + 公司總庫存帶出。四欄全空拒收。*/
  async search(user: RequestUser, q: PartSearchQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = Math.min(q.pageSize ?? 50, 100);
    const skip = (page - 1) * pageSize;

    const brandId = q.brandId?.trim();
    const brandQuery = q.brandQuery?.trim();
    const partGroupId = q.partGroupId?.trim();
    const partGroupQuery = q.partGroupQuery?.trim();
    const keyword = q.keyword?.trim();
    const partNo = q.partNo?.trim();
    const modelQuery = q.modelQuery?.trim();

    if (!brandId && !brandQuery && !partGroupId && !partGroupQuery && !keyword && !partNo && !modelQuery) {
      throw new BadRequestException('至少需提供一個篩選條件（廠牌 / 品名 / 族群 / 料號 / 車型）');
    }

    const where: Prisma.Nx01PartWhereInput = { tenantId };
    if (!q.includeInactive) where.isActive = true;
    if (brandId) where.brandId = brandId;
    if (partGroupId) where.partGroupId = partGroupId;

    // 廠牌關鍵字（執行長 2026-06-17 拍板四欄都 input）：brand.code/name contains
    if (brandQuery) {
      const brands = await this.prisma.nx01Brand.findMany({
        where: {
          tenantId,
          isPart: true,
          OR: [
            { code: { contains: brandQuery, mode: 'insensitive' } },
            { name: { contains: brandQuery, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        take: 100,
      });
      if (brands.length === 0) {
        return { page, pageSize, total: 0, rawTotal: 0, limitReached: false, rows: [] };
      }
      where.brandId = { in: brands.map((b) => b.id) };
    }

    // 族群關鍵字：part_group.code/name contains
    if (partGroupQuery) {
      const pgs = await this.prisma.nx01PartGroup.findMany({
        where: {
          tenantId,
          OR: [
            { code: { contains: partGroupQuery, mode: 'insensitive' } },
            { name: { contains: partGroupQuery, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        take: 100,
      });
      if (pgs.length === 0) {
        return { page, pageSize, total: 0, rawTotal: 0, limitReached: false, rows: [] };
      }
      where.partGroupId = { in: pgs.map((g) => g.id) };
    }

    const ANDs: Prisma.Nx01PartWhereInput[] = [];

    // 品名 / 注音聲母碼（OR：name contains 或 phoneticCode 命中）
    if (keyword) {
      const phoneticIds = await searchPhoneticSourceIds(this.prisma, tenantId, 'nx01_part', keyword);
      const orConds: Prisma.Nx01PartWhereInput[] = [
        { name: { contains: keyword, mode: 'insensitive' } },
      ];
      if (phoneticIds.length > 0) orConds.push({ id: { in: phoneticIds } });
      ANDs.push({ OR: orConds });
    }

    // 使用料號（正規化 raw query：code / oldCode / secCode / oemCode）
    if (partNo) {
      const norm = `%${normalizeCode(partNo)}%`;
      const matched = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM nx01_part WHERE tenant_id = $1 AND (
           regexp_replace(lower(code), '[ #\\-*.]', '', 'g') LIKE $2
           OR regexp_replace(lower(coalesce(old_code,'')), '[ #\\-*.]', '', 'g') LIKE $2
           OR regexp_replace(lower(coalesce(sec_code,'')), '[ #\\-*.]', '', 'g') LIKE $2
           OR id IN (SELECT part_id FROM nx01_part_oem_code WHERE tenant_id = $1 AND regexp_replace(lower(oem_code), '[ #\\-*.]', '', 'g') LIKE $2)
         )`,
        tenantId,
        norm,
      );
      if (matched.length === 0) {
        return { page, pageSize, total: 0, rawTotal: 0, limitReached: false, rows: [] };
      }
      ANDs.push({ id: { in: matched.map((m) => m.id) } });
    }

    // 車型關鍵字（執行長 2026-06-26 F2 加車型）：model.code/name contains → 經 part_model 關聯篩出適用該車型之 part
    if (modelQuery) {
      const models = await this.prisma.nx01Model.findMany({
        where: {
          tenantId,
          OR: [
            { code: { contains: modelQuery, mode: 'insensitive' } },
            { name: { contains: modelQuery, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        take: 200,
      });
      if (models.length === 0) {
        return { page, pageSize, total: 0, rawTotal: 0, limitReached: false, rows: [] };
      }
      ANDs.push({
        rev_Nx01PartModel_partId: { some: { modelId: { in: models.map((m) => m.id) } } },
      });
    }

    if (ANDs.length > 0) where.AND = ANDs;

    const [rawTotal, rows] = await Promise.all([
      this.prisma.nx01Part.count({ where }),
      this.prisma.nx01Part.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          code: true,
          name: true,
          secCode: true,
          isActive: true,
          isOem: true,
          spec: true,
          brand: { select: { code: true, name: true } },
          partGroup: { select: { code: true, name: true } },
        },
      }),
    ]);

    // 公司總庫存（跨倉位 SUM）
    const partIds = rows.map((r) => r.id);
    const balances = partIds.length
      ? await this.prisma.nx03StockBalance.groupBy({
          by: ['partId'],
          where: { tenantId, partId: { in: partIds } },
          _sum: { onHandQty: true, availableQty: true },
        })
      : [];
    const stockMap = new Map(
      balances.map((b) => [
        b.partId,
        {
          onHand: b._sum?.onHandQty?.toString() ?? '0',
          available: b._sum?.availableQty?.toString() ?? '0',
        },
      ]),
    );

    const limitReached = rawTotal > HARD_RESULT_LIMIT;
    const total = Math.min(rawTotal, HARD_RESULT_LIMIT);

    const flatRows = rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      secCode: r.secCode,
      spec: r.spec,
      brandCode: r.brand?.code ?? null,
      brandName: r.brand?.name ?? null,
      partGroupCode: r.partGroup?.code ?? null,
      partGroupName: r.partGroup?.name ?? null,
      isActive: r.isActive,
      isOem: r.isOem,
      onHandTotal: stockMap.get(r.id)?.onHand ?? '0',
      availableTotal: stockMap.get(r.id)?.available ?? '0',
    }));

    // 通用件群組樹模式（執行長 2026-06-24 F2 視窗 1 重做：結果以「主件→替代品」歸組顯示）
    // 1. 取出命中 part 屬於的所有 compat group
    // 2. 每個 group 撈完整 members（含未命中的主件 + 其他替代品、給上下文）
    // 3. 未屬任何 group 的命中 part → ungrouped 自成一筆（一律標 PRIMARY）
    if (q.groupByCompat) {
      const tree = await this.buildCompatGroupTree(tenantId, flatRows);
      return {
        page,
        pageSize,
        total,
        rawTotal,
        limitReached,
        rows: flatRows,
        groups: tree.groups,
        ungrouped: tree.ungrouped,
      };
    }

    return {
      page,
      pageSize,
      total,
      rawTotal,
      limitReached,
      rows: flatRows,
    };
  }

  /**
   * 通用件群組樹：把搜尋命中的 part 依 Nx01PartCompatGroupMember 歸組。
   * 命中 part 若屬於 ≥1 個 group → 取「第一個 group」作主歸宿（避免重複展示）。
   *   - 群組頭顯示該 group 的 PRIMARY（若 group 無 PRIMARY、用 sortNo 最前的 ALT 當頭、role 標 ALT）
   *   - 替代品依 sortNo 排列、完整列出（不限定是否在搜尋結果裡）
   *   - 「命中」的 member 加 isMatch=true 旗標、UI 可高亮
   * 命中 part 不屬於任何 group → ungrouped、視為單筆主件。
   */
  private async buildCompatGroupTree(
    tenantId: string,
    hits: Array<{
      id: string;
      code: string;
      name: string;
      secCode: string | null;
      spec: string | null;
      brandCode: string | null;
      brandName: string | null;
      partGroupCode: string | null;
      partGroupName: string | null;
      isActive: boolean;
      isOem: boolean;
      onHandTotal: string;
      availableTotal: string;
    }>,
  ) {
    if (hits.length === 0) return { groups: [], ungrouped: [] };

    const hitIds = hits.map((h) => h.id);
    // 撈這些 part 屬於的所有 group（不限 isActive、讓上下文完整）
    const memberships = await this.prisma.nx01PartCompatGroupMember.findMany({
      where: { tenantId, partId: { in: hitIds } },
      select: { groupId: true, partId: true, role: true, sortNo: true },
    });

    // 命中 part → 對應的 groupIds（取第一個作主歸宿、避免重複）
    const partToPrimaryGroup = new Map<string, string>();
    const groupIds = new Set<string>();
    for (const m of memberships) {
      if (!partToPrimaryGroup.has(m.partId)) {
        partToPrimaryGroup.set(m.partId, m.groupId);
      }
      groupIds.add(m.groupId);
    }

    // 撈所有相關 group 的完整 members + group 本身
    const [groups, allMembers] = await Promise.all([
      this.prisma.nx01PartCompatGroup.findMany({
        where: { tenantId, id: { in: Array.from(groupIds) } },
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        select: { id: true, code: true, name: true, remark: true },
      }),
      this.prisma.nx01PartCompatGroupMember.findMany({
        where: { tenantId, groupId: { in: Array.from(groupIds) } },
        orderBy: [{ role: 'asc' }, { sortNo: 'asc' }],
        select: {
          groupId: true,
          partId: true,
          role: true,
          isBidirectional: true,
          sortNo: true,
          part: {
            select: {
              id: true,
              code: true,
              name: true,
              secCode: true,
              spec: true,
              isActive: true,
              isOem: true,
              brand: { select: { code: true, name: true } },
              partGroup: { select: { code: true, name: true } },
            },
          },
        },
      }),
    ]);

    // 補撈：完整 member 中、非命中 part 的庫存（給 UI 一致顯示）
    const allMemberPartIds = Array.from(new Set(allMembers.map((m) => m.partId)));
    const extraIds = allMemberPartIds.filter((id) => !hitIds.includes(id));
    const extraStock = extraIds.length
      ? await this.prisma.nx03StockBalance.groupBy({
          by: ['partId'],
          where: { tenantId, partId: { in: extraIds } },
          _sum: { onHandQty: true, availableQty: true },
        })
      : [];
    const extraStockMap = new Map(
      extraStock.map((b) => [
        b.partId,
        {
          onHand: b._sum?.onHandQty?.toString() ?? '0',
          available: b._sum?.availableQty?.toString() ?? '0',
        },
      ]),
    );
    const hitsMap = new Map(hits.map((h) => [h.id, h]));

    // 組樹：每個 group 一個節點
    const groupNodes = groups.map((g) => {
      const members = allMembers
        .filter((m) => m.groupId === g.id)
        .map((m) => {
          const hit = hitsMap.get(m.partId);
          const stock = hit
            ? { onHand: hit.onHandTotal, available: hit.availableTotal }
            : (extraStockMap.get(m.partId) ?? { onHand: '0', available: '0' });
          return {
            id: m.part.id,
            code: m.part.code,
            name: m.part.name,
            secCode: m.part.secCode,
            spec: m.part.spec,
            brandCode: m.part.brand?.code ?? null,
            brandName: m.part.brand?.name ?? null,
            partGroupCode: m.part.partGroup?.code ?? null,
            partGroupName: m.part.partGroup?.name ?? null,
            isActive: m.part.isActive,
            isOem: m.part.isOem,
            onHandTotal: stock.onHand,
            availableTotal: stock.available,
            role: m.role, // 1=PRIMARY 主件 / 2=ALT 替代品
            isBidirectional: m.isBidirectional,
            isMatch: hitsMap.has(m.partId),
          };
        });
      const primary = members.find((m) => m.role === 1) ?? members[0];
      const alts = members.filter((m) => m.id !== primary?.id);
      return {
        groupId: g.id,
        groupCode: g.code,
        groupName: g.name,
        remark: g.remark,
        primary,
        alts,
      };
    });

    // 命中 part 不屬於任何 group → ungrouped（自成單筆、視為主件）
    const ungrouped = hits.filter((h) => !partToPrimaryGroup.has(h.id));

    return { groups: groupNodes, ungrouped };
  }

  /**
   * F2 視窗 2 主視窗右欄通用件群組（執行長 2026-06-25 拍板）。
   * 給定 partId、回傳該 part 屬於的所有 group + 主件/替代品成員 + 各 member 庫存。
   * 不屬任何 group 時回 groups=[]。
   */
  async getCompatGroupForPart(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);

    // 查 partId 屬於哪些 group
    const memberships = await this.prisma.nx01PartCompatGroupMember.findMany({
      where: { tenantId, partId },
      select: { groupId: true },
    });
    if (memberships.length === 0) return { groups: [] };

    const groupIds = Array.from(new Set(memberships.map((m) => m.groupId)));

    const [groups, allMembers] = await Promise.all([
      this.prisma.nx01PartCompatGroup.findMany({
        where: { tenantId, id: { in: groupIds } },
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        select: { id: true, code: true, name: true, remark: true },
      }),
      this.prisma.nx01PartCompatGroupMember.findMany({
        where: { tenantId, groupId: { in: groupIds } },
        orderBy: [{ role: 'asc' }, { sortNo: 'asc' }],
        select: {
          groupId: true,
          partId: true,
          role: true,
          isBidirectional: true,
          sortNo: true,
          part: {
            select: {
              id: true,
              code: true,
              name: true,
              secCode: true,
              spec: true,
              isActive: true,
              isOem: true,
              brand: { select: { code: true, name: true } },
              partGroup: { select: { code: true, name: true } },
            },
          },
        },
      }),
    ]);

    // 撈所有 member 的庫存（公司總）
    const memberPartIds = Array.from(new Set(allMembers.map((m) => m.partId)));
    const stockAgg = memberPartIds.length
      ? await this.prisma.nx03StockBalance.groupBy({
          by: ['partId'],
          where: { tenantId, partId: { in: memberPartIds } },
          _sum: { onHandQty: true, availableQty: true },
        })
      : [];
    const stockMap = new Map(
      stockAgg.map((s) => [
        s.partId,
        {
          onHand: s._sum?.onHandQty?.toString() ?? '0',
          available: s._sum?.availableQty?.toString() ?? '0',
        },
      ]),
    );

    return {
      groups: groups.map((g) => {
        const members = allMembers
          .filter((m) => m.groupId === g.id)
          .map((m) => ({
            id: m.part.id,
            code: m.part.code,
            name: m.part.name,
            secCode: m.part.secCode,
            spec: m.part.spec,
            isActive: m.part.isActive,
            isOem: m.part.isOem,
            brandCode: m.part.brand?.code ?? null,
            brandName: m.part.brand?.name ?? null,
            partGroupCode: m.part.partGroup?.code ?? null,
            partGroupName: m.part.partGroup?.name ?? null,
            onHandTotal: stockMap.get(m.partId)?.onHand ?? '0',
            availableTotal: stockMap.get(m.partId)?.available ?? '0',
            role: m.role,
            isBidirectional: m.isBidirectional,
          }));
        const primary = members.find((m) => m.role === 1) ?? members[0];
        const alts = members.filter((m) => m.id !== primary?.id);
        return {
          groupId: g.id,
          groupCode: g.code,
          groupName: g.name,
          remark: g.remark,
          primary,
          alts,
        };
      }),
    };
  }

  /** 基本資料 + 正廠對應料號（供右側基本資料區）*/
  async getDetail(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    const part = await this.prisma.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        secCode: true,
        oldCode: true,
        spec: true,
        isOem: true,
        cost: true,
        priceA: true,
        priceB: true,
        priceC: true,
        priceD: true,
        warrantyMonths: true,
        returnPolicy: true,
        lastPurchaseAt: true,
        lastSaleAt: true,
        isActive: true,
        brand: { select: { id: true, code: true, name: true } },
        partGroup: { select: { id: true, code: true, name: true } },
        country: { select: { code: true } },
      },
    });
    if (!part) throw new NotFoundException('Part not found');

    const oemCodes = await this.prisma.nx01PartOemCode.findMany({
      where: { tenantId, partId },
      orderBy: { sortNo: 'asc' },
      select: {
        id: true,
        brandId: true,
        oemCode: true,
        remark: true,
        brand: { select: { code: true, name: true } },
      },
    });

    return {
      id: part.id,
      code: part.code,
      name: part.name,
      secCode: part.secCode,
      oldCode: part.oldCode,
      spec: part.spec,
      isOem: part.isOem,
      isActive: part.isActive,
      cost: part.cost?.toString() ?? null,
      priceA: part.priceA?.toString() ?? null,
      priceB: part.priceB?.toString() ?? null,
      priceC: part.priceC?.toString() ?? null,
      priceD: part.priceD?.toString() ?? null,
      warrantyMonths: part.warrantyMonths,
      returnPolicy: part.returnPolicy,
      lastPurchaseAt: part.lastPurchaseAt,
      lastSaleAt: part.lastSaleAt,
      brand: part.brand,
      partGroup: part.partGroup,
      countryCode: part.country?.code ?? null,
      oemCodes: oemCodes.map((o) => ({
        id: o.id,
        oemCode: o.oemCode,
        remark: o.remark,
        brandCode: o.brand?.code ?? null,
        brandName: o.brand?.name ?? null,
      })),
    };
  }

  /** 庫存概況：公司總 / 各倉位（onHand / available / reserved / inTransit + lastIn/Out）*/
  async getStockSummary(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    const balances = await this.prisma.nx03StockBalance.findMany({
      where: { tenantId, partId, isActive: true },
      orderBy: { warehouse: { sortNo: 'asc' } },
      select: {
        onHandQty: true,
        reservedQty: true,
        availableQty: true,
        inTransitQty: true,
        lastInAt: true,
        lastOutAt: true,
        lastMoveAt: true,
        avgCost: true,
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    let companyOnHand = 0;
    let companyAvailable = 0;
    let companyReserved = 0;
    let companyInTransit = 0;
    for (const b of balances) {
      companyOnHand += Number(b.onHandQty);
      companyAvailable += Number(b.availableQty);
      companyReserved += Number(b.reservedQty);
      companyInTransit += Number(b.inTransitQty);
    }

    return {
      company: {
        onHand: companyOnHand.toString(),
        available: companyAvailable.toString(),
        reserved: companyReserved.toString(),
        inTransit: companyInTransit.toString(),
      },
      warehouses: balances.map((b) => ({
        warehouseId: b.warehouse.id,
        warehouseCode: b.warehouse.code,
        warehouseName: b.warehouse.name,
        onHand: b.onHandQty.toString(),
        available: b.availableQty.toString(),
        reserved: b.reservedQty.toString(),
        inTransit: b.inTransitQty.toString(),
        avgCost: b.avgCost.toString(),
        lastInAt: b.lastInAt,
        lastOutAt: b.lastOutAt,
        lastMoveAt: b.lastMoveAt,
      })),
    };
  }

  /** 進貨紀錄+比價：Nx02RrItem 近 50 筆（含廠商 / 單價 / 批號 / 狀態）*/
  async getPurchaseHistory(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx02RrItem.findMany({
      where: { partId, rr: { tenantId } },
      orderBy: { rr: { rrDate: 'desc' } },
      take: 50,
      select: {
        id: true,
        qty: true,
        unitCost: true,
        actualUnitCost: true,
        lineAmount: true,
        batchNo: true,
        rr: {
          select: {
            id: true,
            docNo: true,
            rrDate: true,
            status: true,
            supplier: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    return {
      rows: rows.map((r) => ({
        rrItemId: r.id,
        rrId: r.rr.id,
        docNo: r.rr.docNo,
        rrDate: r.rr.rrDate,
        status: r.rr.status,
        supplierCode: r.rr.supplier.code,
        supplierName: r.rr.supplier.name,
        qty: r.qty.toString(),
        unitCost: r.unitCost.toString(),
        actualUnitCost: r.actualUnitCost.toString(),
        lineAmount: r.lineAmount.toString(),
        batchNo: r.batchNo,
      })),
    };
  }

  /** 銷貨+報價紀錄（成交+未成交）+ ABCD 建議報價 */
  async getSalesHistory(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    const [soItems, quoteItems, part] = await Promise.all([
      this.prisma.nx04SoItem.findMany({
        where: { partId, so: { tenantId } },
        orderBy: { so: { soDate: 'desc' } },
        take: 50,
        select: {
          id: true,
          qty: true,
          unitPrice: true,
          lineAmount: true,
          so: {
            select: {
              id: true,
              docNo: true,
              soDate: true,
              status: true,
              customer: { select: { id: true, code: true, name: true } },
            },
          },
        },
      }),
      this.prisma.nx04QuoteItem.findMany({
        where: { partId, quote: { tenantId } },
        orderBy: { quote: { quoteDate: 'desc' } },
        take: 50,
        select: {
          id: true,
          qty: true,
          unitPrice: true,
          minPrice: true,
          isSelected: true,
          transferredQty: true,
          quote: {
            select: {
              id: true,
              docNo: true,
              quoteDate: true,
              status: true,
              customer: { select: { id: true, code: true, name: true } },
            },
          },
        },
      }),
      this.prisma.nx01Part.findFirst({
        where: { id: partId, tenantId },
        select: { priceA: true, priceB: true, priceC: true, priceD: true, cost: true },
      }),
    ]);

    return {
      suggestedPrices: {
        cost: part?.cost?.toString() ?? null,
        priceA: part?.priceA?.toString() ?? null,
        priceB: part?.priceB?.toString() ?? null,
        priceC: part?.priceC?.toString() ?? null,
        priceD: part?.priceD?.toString() ?? null,
      },
      sales: soItems.map((r) => ({
        soItemId: r.id,
        soId: r.so.id,
        docNo: r.so.docNo,
        soDate: r.so.soDate,
        status: r.so.status,
        customerCode: r.so.customer.code,
        customerName: r.so.customer.name,
        qty: r.qty.toString(),
        unitPrice: r.unitPrice.toString(),
        lineAmount: r.lineAmount.toString(),
      })),
      quotes: quoteItems.map((q) => ({
        quoteItemId: q.id,
        quoteId: q.quote.id,
        docNo: q.quote.docNo,
        quoteDate: q.quote.quoteDate,
        status: q.quote.status,
        customerCode: q.quote.customer.code,
        customerName: q.quote.customer.name,
        qty: q.qty.toString(),
        unitPrice: q.unitPrice.toString(),
        minPrice: q.minPrice?.toString() ?? null,
        isSelected: q.isSelected,
        transferredQty: q.transferredQty.toString(),
      })),
    };
  }

  /** 庫存出入紀錄（含調撥/出入/盤點/退貨）：Nx03StockLedger 近 100 筆 */
  async getStockHistory(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx03StockLedger.findMany({
      where: { tenantId, partId },
      orderBy: { movementDate: 'desc' },
      take: 100,
      select: {
        id: true,
        movementDate: true,
        movementType: true,
        qtyIn: true,
        qtyOut: true,
        unitCost: true,
        balanceQty: true,
        sourceModule: true,
        sourceDocType: true,
        sourceDocId: true,
        warehouse: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, code: true } },
      },
    });
    return {
      rows: rows.map((r) => ({
        id: r.id,
        movementDate: r.movementDate,
        movementType: r.movementType,
        qtyIn: r.qtyIn.toString(),
        qtyOut: r.qtyOut.toString(),
        unitCost: r.unitCost.toString(),
        balanceQty: r.balanceQty.toString(),
        sourceModule: r.sourceModule,
        sourceDocType: r.sourceDocType,
        sourceDocId: r.sourceDocId,
        warehouseCode: r.warehouse.code,
        warehouseName: r.warehouse.name,
        locationCode: r.location.code,
      })),
    };
  }

  /**
   * 相關零件（Nx01PartRelation 雙向）。
   * 執行長 Q3=A：不分子類型、UI 全部歸「🔗 相關零件」一區。
   * Schema 既有 relationType 1~5（改號/同款/改版周邊/組合包/拆解包）服務原意、本端不過濾。
   */
  async getRelatedParts(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    const relations = await this.prisma.nx01PartRelation.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ partIdFrom: partId }, { partIdTo: partId }],
      },
      orderBy: { sortNo: 'asc' },
      take: 50,
      select: {
        id: true,
        partIdFrom: true,
        partIdTo: true,
        relationType: true,
        remark: true,
        relPartIdFrom: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            brand: { select: { code: true, name: true } },
          },
        },
        relPartIdTo: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            brand: { select: { code: true, name: true } },
          },
        },
      },
    });

    const peers = relations.map((r) => {
      const peer = r.partIdFrom === partId ? r.relPartIdTo : r.relPartIdFrom;
      return {
        relationId: r.id,
        relationType: r.relationType,
        remark: r.remark,
        partId: peer.id,
        code: peer.code,
        name: peer.name,
        isActive: peer.isActive,
        brandCode: peer.brand?.code ?? null,
        brandName: peer.brand?.name ?? null,
      };
    });

    const peerIds = peers.map((p) => p.partId);
    const stockAgg = peerIds.length
      ? await this.prisma.nx03StockBalance.groupBy({
          by: ['partId'],
          where: { tenantId, partId: { in: peerIds } },
          _sum: { onHandQty: true, availableQty: true },
        })
      : [];
    const stockMap = new Map(
      stockAgg.map((s) => [
        s.partId,
        {
          onHand: s._sum?.onHandQty?.toString() ?? '0',
          available: s._sum?.availableQty?.toString() ?? '0',
        },
      ]),
    );

    return {
      rows: peers.map((p) => ({
        ...p,
        onHandTotal: stockMap.get(p.partId)?.onHand ?? '0',
        availableTotal: stockMap.get(p.partId)?.available ?? '0',
      })),
    };
  }
}
