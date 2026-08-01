import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { assertTransferable } from '../../shared/nx01/partner-account-gate';
import { resolveCurrencyId } from '../../shared/nx02/nx02-currency';
import { allocDocNo } from '../../shared/nx02/nx02-doc-no';
import { Nx02ListQueryDto } from '../../shared/nx02/nx02-list-query.dto';
import { assertRrStatusTransition, RrStatus } from '../../shared/nx02/nx02-state-machine';
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { applyQtyInWithLedger } from '../../shared/nx03/nx03-inventory';
import { createApFromPostedRr } from '../../shared/nx05/nx05-create-ap-from-rr';
import { postRrToGl } from '../../shared/nx05/nx05-post-rr-to-gl';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateRrDto, CreateRrItemDto, PatchRrItemDto, UpdateRrDto } from './dto/rr.dto';

const RR_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  supplierId: true,
  rfqId: true,
  poId: true,
  tiId: true,
  currencyId: true,
  status: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  remark: true,
  voidedAt: true,
  voidedBy: true,
  postedAt: true,
  postedBy: true,
  rrDate: true,
  // T6 進貨對齊批次 2026-06-08：提貨單號（國外進口用）
  deliveryOrderNo: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  // NX02-RR-SHELL 2026-07-10：單據模板 enrich——關聯名稱由 flattenRrRefs 攤平（比照 SoService）
  supplier: { select: { code: true, name: true } },
  warehouse: { select: { code: true, name: true } },
  po: { select: { docNo: true } },
  ti: { select: { docNo: true } },
  rfq: { select: { docNo: true } },
} as const;

const RR_ITEM_SEL = {
  id: true,
  rrId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  locationId: true,
  qty: true,
  unitCost: true,
  // M2-a 加：原始外幣單價（審計）/ 攤分進口費 / 實際入庫成本（過帳用）
  originalUnitCost: true,
  allocatedImportFee: true,
  actualUnitCost: true,
  lineAmount: true,
  expectedQty: true,
  actualQty: true,
  // T2-b 進貨對齊批次 2026-06-07：驗收欄位（瑕疵 / 批號 / 保固到期）
  defectQty: true,
  defectType: true,
  defectDesc: true,
  batchNo: true,
  warrantyExpiredAt: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  // T8 進貨對齊批次 2026-06-08：runtime JOIN 廠牌料號（mapRrDetail 平鋪為 secCode）
  part: { select: { secCode: true } },
} as const;

// W5 異常鏈 Step 1 2026-07-11：RrItem.defectType 短碼 → 中文標籤（IR description 用）
const DEFECT_TYPE_LABEL: Record<string, string> = {
  D: '外觀損壞',
  F: '功能異常',
  W: '規格不符',
  O: '其他',
};

// NX02-RR-SHELL 2026-07-10：把 RR_SEL 帶的 supplier/warehouse/po/ti/rfq 關聯攤平成
//   supplierCode/supplierName/warehouseCode/warehouseName/poDocNo/tiDocNo/rfqDocNo（比照 SoService）。
//   剝掉關聯物件本身、避免回傳巢狀重複。createdByName 由呼叫端另補（需查 user）。
function flattenRrRefs<T extends Record<string, unknown>>(rest: T) {
  const { supplier, warehouse, po, ti, rfq, ...plain } = rest as Record<string, unknown> & {
    supplier?: { code?: string; name?: string } | null;
    warehouse?: { code?: string; name?: string } | null;
    po?: { docNo?: string } | null;
    ti?: { docNo?: string } | null;
    rfq?: { docNo?: string } | null;
  };
  return {
    ...plain,
    supplierCode: supplier?.code ?? null,
    supplierName: supplier?.name ?? null,
    warehouseCode: warehouse?.code ?? null,
    warehouseName: warehouse?.name ?? null,
    poDocNo: po?.docNo ?? null,
    tiDocNo: ti?.docNo ?? null,
    rfqDocNo: rfq?.docNo ?? null,
  };
}

@Injectable()
export class RrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx02ListQueryDto): Prisma.Nx02RrWhereInput {
    const where: Prisma.Nx02RrWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      // NX02-RR-SHELL：搜尋含 單號/備註/供應商編號/供應商名稱/來源採購單號（比照 SoService 加關聯搜尋）
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
        { supplier: { code: { contains: s, mode: 'insensitive' } } },
        { supplier: { name: { contains: s, mode: 'insensitive' } } },
        { po: { docNo: { contains: s, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  private assertRrItemsEditable(status: string) {
    if (status !== RrStatus.DRAFT && status !== RrStatus.INSPECTING) {
      throw new BadRequestException('RR line items are not editable in current status');
    }
  }

  private lineAmount(qty: PrismaNs.Decimal, unit: PrismaNs.Decimal) {
    return qty.mul(unit).toDecimalPlaces(2);
  }

  private async loadPartSnapshot(tx: Prisma.TransactionClient, tenantId: string, partId: string) {
    const p = await tx.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { code: true, name: true, warrantyMonths: true },
    });
    if (!p) throw new NotFoundException(`Part ${partId} not found`);
    return { partNo: p.code, partName: p.name, warrantyMonths: p.warrantyMonths };
  }

  /**
   * T2-b 進貨對齊批次 2026-06-07：保固到期日自動算。
   * warrantyMonths=0 視為「不保固」回 null；否則 rrDate + warrantyMonths 月。
   */
  private calcWarrantyExpiredAt(rrDate: Date, warrantyMonths: number): Date | null {
    if (!warrantyMonths || warrantyMonths <= 0) return null;
    const d = new Date(rrDate);
    d.setMonth(d.getMonth() + warrantyMonths);
    return d;
  }

  /**
   * T2-b 進貨對齊批次 2026-06-07：批號自動產（YYYYMM + 3 碼 lineNo）。
   * 例：rrDate=2026-06-07, lineNo=1 → "202606001"
   */
  private genBatchNo(rrDate: Date, lineNo: number): string {
    const y = rrDate.getFullYear();
    const m = String(rrDate.getMonth() + 1).padStart(2, '0');
    const n = String(lineNo).padStart(3, '0');
    return `${y}${m}${n}`;
  }

  /**
   * T2-b 進貨對齊批次 2026-06-07：驗收欄位業務規則驗證。
   * - defectQty 為負 → 拒
   * - defectQty>0 必填 defectType + defectDesc（schema 註解明示）
   * - defectQty>0 且 actualQty 存在 → defectQty <= actualQty（驗收後才知道實際瑕疵）
   * - defectType 必須在 [D, F, W, O] 之內（dto 已守、service 不重複）
   */
  private validateDefect(args: {
    partNo: string;
    defectQty?: number | null;
    defectType?: string | null;
    defectDesc?: string | null;
    actualQty?: number | null;
  }): void {
    const dq = args.defectQty;
    if (dq == null) return;
    if (dq < 0) throw new BadRequestException(`${args.partNo} defectQty 不可為負`);
    if (dq === 0) return;
    if (!args.defectType?.trim()) {
      throw new BadRequestException(`${args.partNo} defectQty>0 必填 defectType（D/F/W/O）`);
    }
    if (!args.defectDesc?.trim()) {
      throw new BadRequestException(`${args.partNo} defectQty>0 必填 defectDesc`);
    }
    if (args.actualQty != null && dq > args.actualQty) {
      throw new BadRequestException(`${args.partNo} defectQty (${dq}) 不可超過 actualQty (${args.actualQty})`);
    }
  }

  private async recalcRrTotals(tx: Prisma.TransactionClient, rrId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx02RrItem.findMany({ where: { rrId }, select: { lineAmount: true } });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx02Rr.update({
      where: { id: rrId },
      data: { subtotal: sub, taxAmount: tax, totalAmount: total },
    });
  }

  /**
   * M1 配套：取 part 當下最新 active version（effectiveTo IS NULL、versionNo desc）
   * Q-S1=B 漸進：partVersion 表為 null 也 OK（NX01-17 未完全 backfill 既有 part）
   */
  private async loadActivePartVersionId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partId: string,
  ): Promise<string | null> {
    const v = await tx.nx01PartVersion.findFirst({
      where: { tenantId, partId, effectiveTo: null },
      orderBy: { versionNo: 'desc' },
      select: { id: true },
    });
    return v?.id ?? null;
  }

  /**
   * RR 過帳：M2-a 升級為「國外費用按金額比例攤分 + actualUnitCost 餵移動平均」。
   *
   * 業務邏輯（Crown 2026-05-28 拍板）：
   *   - 國內 RR（無 Nx02RrImport）：allocatedImportFee=0 / actualUnitCost=unitCost
   *   - 國外 RR（有 Nx02RrImport）：
   *       totalImportCost / exchangeRate from RrImport
   *       totalGoodsAmount = Σ(effectiveQty × unitCost) per item
   *       每 item allocatedImportFee = totalImportCost × (itemGoodsAmount / totalGoodsAmount)（按金額比例、貴的料分多）
   *       actualUnitCost = (unitCost × exchangeRate × effectiveQty + allocatedImportFee) ÷ effectiveQty
   *   - 過帳用 actualUnitCost 餵 applyQtyInWithLedger（移動平均公式既有正確、不動）
   *
   * 其他：
   *   - source 判 tiId：rr.tiId != null → 'G'（同行調貨入庫）；null → 'P'（採購進貨）
   *   - partVersionId 帶入（M1 配套）
   *   - PO receivedQty 回填邏輯保留
   *   - effectiveQty = actualQty ?? qty（業務語意：實收為準）
   */
  private async applyRrPosting(tx: Prisma.TransactionClient, rr: Prisma.Nx02RrGetPayload<{ select: typeof RR_SEL }>, userId: string) {
    const items = await tx.nx02RrItem.findMany({
      where: { rrId: rr.id },
      select: { ...RR_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('RR has no items to post');

    // 同行調貨入庫（tiId!=null）supplier 必須是同行 partner_type='O'
    // partner 改制六分類：C=保養廠 / O=同行 / S=純供應商 / T=外包物流 / B=銀行 / V=一般廠商
    if (rr.tiId) {
      const supplier = await tx.nx01Partner.findFirst({
        where: { id: rr.supplierId, tenantId: rr.tenantId },
        select: { partnerType: true },
      });
      if (!supplier || supplier.partnerType !== 'O') {
        throw new BadRequestException(
          `RR with tiId (同行調貨入庫) supplierId partnerType must be 'O' (同行), got '${supplier?.partnerType ?? 'not found'}'`,
        );
      }
      // 帳戶閘門 v1.3：調貨=買賣、同行須持有 T 調貨付款帳戶（身分判斷之上疊加）
      await assertTransferable(tx, rr.tenantId, rr.supplierId);
    }

    // load RrImport（國外才有、不會 throw、null = 國內 RR）
    const rrImport = await tx.nx02RrImport.findFirst({
      where: { rrId: rr.id },
      select: { totalImportCost: true, exchangeRate: true },
    });
    const totalImportCost = rrImport ? new PrismaNs.Decimal(rrImport.totalImportCost) : new PrismaNs.Decimal(0);
    const exchangeRate = rrImport ? new PrismaNs.Decimal(rrImport.exchangeRate) : new PrismaNs.Decimal(1);

    // pass 1：計算 totalGoodsAmount（按 effectiveQty × unitCost 加總、為攤分基準）
    const itemContexts: Array<{
      item: typeof items[number];
      effectiveQty: PrismaNs.Decimal;
      unitCost: PrismaNs.Decimal;
      itemGoodsAmount: PrismaNs.Decimal;
    }> = [];
    let totalGoodsAmount = new PrismaNs.Decimal(0);
    for (const item of items) {
      const effectiveQty = item.actualQty != null ? new PrismaNs.Decimal(item.actualQty) : new PrismaNs.Decimal(item.qty);
      if (effectiveQty.lte(0)) continue;
      const unitCost = new PrismaNs.Decimal(item.unitCost);
      const itemGoodsAmount = effectiveQty.mul(unitCost);
      totalGoodsAmount = totalGoodsAmount.add(itemGoodsAmount);
      itemContexts.push({ item, effectiveQty, unitCost, itemGoodsAmount });
    }
    if (!itemContexts.length) throw new BadRequestException('Posted quantity must be > 0 (set actualQty or qty on lines)');
    if (totalGoodsAmount.lte(0) && totalImportCost.gt(0)) {
      throw new BadRequestException('Total goods amount is 0 but import cost > 0; cannot allocate');
    }

    // pass 2：攤分 + 算 actualUnitCost + 寫回 RrItem + 過帳
    const sourceDocType = rr.tiId ? 'G' : 'P';
    for (const ctx of itemContexts) {
      const { item, effectiveQty, unitCost, itemGoodsAmount } = ctx;

      // 按金額比例攤分（國內 totalImportCost=0、攤分為 0）
      const allocatedImportFee =
        totalImportCost.gt(0) && totalGoodsAmount.gt(0)
          ? totalImportCost.mul(itemGoodsAmount).div(totalGoodsAmount).toDecimalPlaces(2)
          : new PrismaNs.Decimal(0);

      // actualUnitCost = (unitCost × exchangeRate × qty + allocatedImportFee) ÷ qty
      const actualUnitCost = unitCost
        .mul(exchangeRate)
        .mul(effectiveQty)
        .add(allocatedImportFee)
        .div(effectiveQty)
        .toDecimalPlaces(4);

      // 寫回 RrItem（originalUnitCost = unitCost 純審計、allocatedImportFee + actualUnitCost 算後值）
      await tx.nx02RrItem.update({
        where: { id: item.id },
        data: {
          originalUnitCost: unitCost,
          allocatedImportFee,
          actualUnitCost,
          updatedBy: userId,
        },
      });

      // 過帳用 actualUnitCost 餵移動平均（公式既有正確、unitCost 改名為 actualUnitCost）
      const partVersionId = await this.loadActivePartVersionId(tx, rr.tenantId, item.partId);
      await applyQtyInWithLedger(tx, {
        tenantId: rr.tenantId,
        userId,
        partId: item.partId,
        warehouseId: rr.warehouseId,
        locationId: item.locationId,
        qtyIn: effectiveQty,
        unitCost: actualUnitCost,
        sourceModule: 'NX02',
        sourceDocType,
        sourceDocId: rr.id,
        sourceItemId: item.id,
        partVersionId,
      });

      // PO receivedQty 回填（既有邏輯保留）
      if (rr.poId) {
        const pol = await tx.nx02PoItem.findFirst({
          where: { poId: rr.poId, partId: item.partId },
          orderBy: { lineNo: 'asc' },
        });
        if (pol) {
          const prev = new PrismaNs.Decimal(pol.receivedQty);
          await tx.nx02PoItem.update({
            where: { id: pol.id },
            data: { receivedQty: prev.add(effectiveQty), updatedBy: userId },
          });
        }
      }
    }

    // === W5 異常鏈 Step 1 2026-07-11：驗收異常自動進統一登記簿（Nx03IssueReport）===
    // - 瑕疵（defectQty>0）→ 品質異常 IR（issueType='D'、對齊 SR 壞品既有範式）
    //   瑕疵品照常入庫（帳跟實物走、執行長 2026-07-11 拍板）、處置單過帳才扣帳
    // - 短交（expectedQty>0 且 actualQty<expectedQty）→ 數量短缺 IR（issueType='S'、留痕待追補/折讓）
    //   溢收（actual>expected）本輪不建 IR、遇到再補
    // - relatedDocId 暫存 rrItem.id（對齊 SR 範式、供處置串接回溯原進貨明細；dispose 時會被處置單 ID 覆蓋）
    // - 過帳僅發生一次（INSPECTING→POSTED、POSTED 不可作廢）、無重複建單問題
    for (const item of items) {
      const defectQty = new PrismaNs.Decimal(item.defectQty ?? 0);
      const expectedQty = new PrismaNs.Decimal(item.expectedQty ?? 0);
      const shortQty =
        item.actualQty != null && expectedQty.gt(0)
          ? expectedQty.sub(new PrismaNs.Decimal(item.actualQty))
          : new PrismaNs.Decimal(0);
      if (defectQty.lte(0) && shortQty.lte(0)) continue;

      const partVersionId = await this.loadActivePartVersionId(tx, rr.tenantId, item.partId);
      const irBase = {
        tenantId: rr.tenantId,
        reportDate: new Date(),
        warehouseId: rr.warehouseId,
        locationId: item.locationId,
        partId: item.partId,
        partNo: item.partNo,
        partName: item.partName,
        partVersionId,
        dispositionType: 'N',
        relatedDocId: item.id,
        sourceModule: 'NX02',
        sourceDocType: 'RR',
        sourceDocId: rr.id,
        status: 'REPORTED',
        createdBy: userId,
        updatedBy: userId,
      };
      if (defectQty.gt(0)) {
        const docNo = await allocNx03DocNo(tx, rr.tenantId, 'IR', rr.warehouse.code);
        await tx.nx03IssueReport.create({
          data: {
            ...irBase,
            docNo,
            qty: defectQty,
            issueType: 'D',
            description: `進貨驗收瑕疵 ${item.partNo} qty=${defectQty.toString()}（${DEFECT_TYPE_LABEL[item.defectType ?? 'O'] ?? item.defectType}：${item.defectDesc ?? ''}）`,
          },
        });
      }
      if (shortQty.gt(0)) {
        const docNo = await allocNx03DocNo(tx, rr.tenantId, 'IR', rr.warehouse.code);
        await tx.nx03IssueReport.create({
          data: {
            ...irBase,
            docNo,
            qty: shortQty,
            issueType: 'S',
            description: `進貨短交 ${item.partNo} 應收 ${expectedQty.toString()} 實收 ${item.actualQty != null ? new PrismaNs.Decimal(item.actualQty).toString() : '0'}（待向廠商追補貨/折讓、結果請記結案備註）`,
          },
        });
      }
    }

    // M2-f：RR POSTED → 自動產生應付帳款 AP（LITE 直接路徑：跳過 PO 走 RR 時用）
    // - 冪等：helper 內 dedup（既有 AP_RR 跟 rrId 對應則 skip）
    // - 有 PO 時跳過（PO confirmed 早已建 AP、helper 內部 guard）
    // - 失敗不阻擋 RR 過帳（log + skip、NX05 LITE 未完整、保守處理）
    await createApFromPostedRr(tx, { tenantId: rr.tenantId, rrId: rr.id, userId });

    // ⭐ 總帳脊椎 C2 2026-08-01：進貨驗收接上總帳（只加這一行、⛔ 不動任何營運邏輯）
    // 必須排在最後——存貨金額要跟上面寫下的庫存流水核對。
    // 安全閘：沒設會計期間／國外進貨／金額對不上 → 回傳 skip 理由、⛔ 不擋進貨流程。
    await postRrToGl(tx, { tenantId: rr.tenantId, rrId: rr.id, userId });
  }

  async list(user: RequestUser, q: Nx02ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx02Rr.count({ where }),
      this.prisma.nx02Rr.findMany({
        where,
        orderBy: [{ rrDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        // NX02-RR-SHELL：單據模板列表需 建單人員名 + 項目數
        select: { ...RR_SEL, _count: { select: { rev_Nx02RrItem_rrId: true } } },
      }),
    ]);
    // 建單人員名（批次查 user）
    const creatorIds = [...new Set(rows.map((r) => r.createdBy).filter(Boolean))];
    const creators = creatorIds.length
      ? await this.prisma.nx01User.findMany({ where: { id: { in: creatorIds } }, select: { id: true, userName: true } })
      : [];
    const creatorMap = new Map(creators.map((c) => [c.id, c.userName]));
    const items = rows.map((r) => {
      const { _count, ...rest } = r;
      return {
        ...flattenRrRefs(rest),
        itemCount: _count?.rev_Nx02RrItem_rrId ?? 0,
        createdByName: creatorMap.get(r.createdBy) ?? null,
      };
    });
    // NX02-RR-SHELL：回傳鍵 rows→items（對齊 So/Sr/St 範式；舊 RrListView 讀 .data 本就錯位、Step 4 退場）
    return { page, pageSize, total, items };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx02Rr.findFirst({
      where: { id, tenantId },
      select: { ...RR_SEL, rev_Nx02RrItem_rrId: { orderBy: { lineNo: 'asc' }, select: RR_ITEM_SEL } },
    });
    if (!row) throw new NotFoundException('RR not found');
    // NX02-RR-SHELL：建單人員名（詳情顯示）
    const creator = row.createdBy
      ? await this.prisma.nx01User.findFirst({ where: { id: row.createdBy }, select: { userName: true } })
      : null;
    return { ...this.mapRrDetail(row), createdByName: creator?.userName ?? null };
  }

  private mapRrDetail(
    row: Prisma.Nx02RrGetPayload<{ select: typeof RR_SEL }> & {
      rev_Nx02RrItem_rrId: Prisma.Nx02RrItemGetPayload<{ select: typeof RR_ITEM_SEL }>[];
    },
  ) {
    const { rev_Nx02RrItem_rrId, ...rest } = row;
    return {
      // NX02-RR-SHELL：關聯攤平（供應商/倉庫/來源單號）
      ...flattenRrRefs(rest),
      items: rev_Nx02RrItem_rrId.map((it) => {
        // T8 進貨對齊批次 2026-06-08：平鋪 part.secCode 為 secCode
        const { part, ...itemRest } = it;
        return {
          ...itemRest,
          unitPriceSnapshot: it.unitCost,
          secCode: part?.secCode ?? null,
        };
      }),
    };
  }

  async create(user: RequestUser, dto: CreateRrDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({ where: { id: dto.warehouseId, tenantId }, select: { code: true } });
      if (!wh) throw new NotFoundException('warehouseId not found');
      const sup = await tx.nx01Partner.findFirst({ where: { id: dto.supplierId, tenantId }, select: { id: true } });
      if (!sup) throw new NotFoundException('supplierId not found');
      if (dto.rfqId) {
        const r = await tx.nx02Rfq.findFirst({ where: { id: dto.rfqId, tenantId }, select: { id: true } });
        if (!r) throw new NotFoundException('rfqId not found');
      }
      if (dto.poId) {
        const p = await tx.nx02Po.findFirst({ where: { id: dto.poId, tenantId }, select: { id: true } });
        if (!p) throw new NotFoundException('poId not found');
      }
      // NX02-TI-SHELL：來源同行調貨單（TI 轉進貨）
      if (dto.tiId) {
        const t = await tx.nx02Ti.findFirst({ where: { id: dto.tiId, tenantId }, select: { id: true } });
        if (!t) throw new NotFoundException('tiId not found');
      }
      const docNo = await allocDocNo(tx, tenantId, 'RR', wh.code);
      const taxRate = new PrismaNs.Decimal(dto.taxRate ?? 5);
      const currId = await resolveCurrencyId(tx, dto.currencyId ?? 'TWD');
      const rr = await tx.nx02Rr.create({
        data: {
          tenantId,
          docNo,
          rrDate: new Date(dto.rrDate),
          warehouseId: dto.warehouseId,
          supplierId: dto.supplierId,
          rfqId: dto.rfqId?.trim() || null,
          poId: dto.poId?.trim() || null,
          tiId: dto.tiId?.trim() || null,
          currencyId: currId,
          status: RrStatus.DRAFT,
          taxRate,
          subtotal: new PrismaNs.Decimal(0),
          taxAmount: new PrismaNs.Decimal(0),
          totalAmount: new PrismaNs.Decimal(0),
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: RR_SEL,
      });
      const rrDate = new Date(dto.rrDate);
      let line = 1;
      for (const it of dto.items) {
        const loc = await tx.nx01Location.findFirst({
          where: { id: it.locationId, tenantId, warehouseId: dto.warehouseId },
          select: { id: true },
        });
        if (!loc) throw new BadRequestException('locationId must belong to RR warehouse');
        const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
        const qty = new PrismaNs.Decimal(it.qty);
        const unit = new PrismaNs.Decimal(it.unitPriceSnapshot);
        const expQ = it.expectedQty != null ? new PrismaNs.Decimal(it.expectedQty) : qty;
        const lineAmount = this.lineAmount(qty, unit);
        // T2-b：驗收欄位（瑕疵驗證 / 保固到期 / 批號 預設自動產）
        this.validateDefect({ partNo: snap.partNo, defectQty: it.defectQty, defectType: it.defectType, defectDesc: it.defectDesc, actualQty: it.actualQty });
        const lineNo = line++;
        const batchNo = it.batchNo?.trim() || this.genBatchNo(rrDate, lineNo);
        const warrantyExpiredAt =
          it.warrantyExpiredAt !== undefined
            ? it.warrantyExpiredAt
              ? new Date(it.warrantyExpiredAt)
              : null
            : this.calcWarrantyExpiredAt(rrDate, snap.warrantyMonths);
        await tx.nx02RrItem.create({
          data: {
            rrId: rr.id,
            lineNo,
            partId: it.partId.trim(),
            partNo: snap.partNo,
            partName: snap.partName,
            locationId: it.locationId.trim(),
            qty,
            unitCost: unit,
            // M2-a 初始值：originalUnitCost = unitCost / allocatedImportFee = 0 / actualUnitCost = unitCost
            // posting 時會依 RrImport 重算（國內保留 unitCost、國外換匯+攤分後覆寫 actualUnitCost）
            originalUnitCost: unit,
            allocatedImportFee: new PrismaNs.Decimal(0),
            actualUnitCost: unit,
            lineAmount,
            expectedQty: expQ,
            actualQty: it.actualQty != null ? new PrismaNs.Decimal(it.actualQty) : null,
            // T2-b 驗收欄位
            defectQty: it.defectQty != null ? new PrismaNs.Decimal(it.defectQty) : new PrismaNs.Decimal(0),
            defectType: it.defectType ?? null,
            defectDesc: it.defectDesc?.trim() || null,
            batchNo,
            warrantyExpiredAt,
            remark: it.remark?.trim() || null,
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
      }
      await this.recalcRrTotals(tx, rr.id, taxRate);
      const full = await tx.nx02Rr.findFirst({
        where: { id: rr.id },
        select: { ...RR_SEL, rev_Nx02RrItem_rrId: { orderBy: { lineNo: 'asc' }, select: RR_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'CREATE',
        entityTable: 'nx02_rr',
        entityId: rr.id,
        entityCode: rr.docNo,
        summary: '建立進貨單',
        afterData: full as object,
      });
      return this.mapRrDetail(full!);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateRrDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Rr.findFirst({ where: { id, tenantId }, select: RR_SEL });
    if (!existing) throw new NotFoundException('RR not found');
    if (existing.voidedAt) throw new BadRequestException('RR is voided');

    const taxRate =
      dto.taxRate !== undefined ? new PrismaNs.Decimal(dto.taxRate) : new PrismaNs.Decimal(existing.taxRate);

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertRrStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === RrStatus.POSTED && existing.status === RrStatus.INSPECTING) {
        const head = await tx.nx02Rr.findFirst({ where: { id, tenantId }, select: RR_SEL });
        if (!head) throw new NotFoundException('RR not found');
        await this.applyRrPosting(tx, head, user.sub);
        await tx.nx02Rr.update({
          where: { id },
          data: {
            status: RrStatus.POSTED,
            postedAt: new Date(),
            postedBy: user.sub,
            ...(dto.rrDate !== undefined ? { rrDate: new Date(dto.rrDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.taxRate !== undefined ? { taxRate } : {}),
            // T6：提貨單號（過帳同 patch 路徑也允許寫入、報關行可能晚補）
            ...(dto.deliveryOrderNo !== undefined ? { deliveryOrderNo: dto.deliveryOrderNo?.trim() || null } : {}),
            updatedBy: user.sub,
          },
        });
        // NX02-TI-SHELL 2026-07-11：來源=同行調貨單的進貨過帳 → 回寫鏈（同交易、要嘛全成要嘛全不動）
        //   ① TI 狀態 → C 已完成（應付由本 RR 過帳的 createApFromPostedRr 立、TI 不重複立帳——執行長拍板「帳跟貨走」）
        //   ② 該 TI 連結的 SO 缺貨行 transferStatus → C 補貨完成（業務端看到「貨到了可以出」）
        if (head.tiId) {
          const ti = await tx.nx02Ti.findFirst({
            where: { id: head.tiId, tenantId },
            select: { id: true, status: true },
          });
          if (ti && ti.status !== 'C' && ti.status !== 'V') {
            await tx.nx02Ti.update({
              where: { id: ti.id },
              data: { status: 'C', updatedBy: user.sub },
            });
            const tiItems = await tx.nx02TiItem.findMany({
              where: { tiId: ti.id },
              select: { sourceSoItemId: true },
            });
            const soItemIds = tiItems.map((t) => t.sourceSoItemId).filter(Boolean);
            if (soItemIds.length) {
              await tx.nx04SoItem.updateMany({
                where: { id: { in: soItemIds }, tiId: ti.id },
                data: { transferStatus: 'C', updatedBy: user.sub },
              });
            }
          }
        }
      } else {
        await tx.nx02Rr.update({
          where: { id },
          data: {
            ...(dto.rrDate !== undefined ? { rrDate: new Date(dto.rrDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.taxRate !== undefined ? { taxRate } : {}),
            // T6 進貨對齊批次 2026-06-08：提貨單號（國外進口、報關行核發）
            ...(dto.deliveryOrderNo !== undefined ? { deliveryOrderNo: dto.deliveryOrderNo?.trim() || null } : {}),
            updatedBy: user.sub,
          },
        });
      }
      if (dto.taxRate !== undefined) await this.recalcRrTotals(tx, id, taxRate);
      const full = await tx.nx02Rr.findFirst({
        where: { id },
        select: { ...RR_SEL, rev_Nx02RrItem_rrId: { orderBy: { lineNo: 'asc' }, select: RR_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: dto.status === RrStatus.POSTED ? 'POST' : 'UPDATE',
        entityTable: 'nx02_rr',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === RrStatus.POSTED ? '進貨單過帳' : '修改進貨單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapRrDetail(full!);
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Rr.findFirst({ where: { id, tenantId }, select: RR_SEL });
    if (!existing) throw new NotFoundException('RR not found');
    if (existing.voidedAt) throw new BadRequestException('RR already voided');
    if (existing.status === RrStatus.POSTED) throw new BadRequestException('Cannot void posted RR');
    assertRrStatusTransition(existing.status, RrStatus.CANCELLED);
    await this.prisma.nx02Rr.update({
      where: { id },
      data: { voidedAt: new Date(), voidedBy: user.sub, status: RrStatus.CANCELLED, updatedBy: user.sub },
    });
    const full = await this.prisma.nx02Rr.findFirst({
      where: { id },
      select: { ...RR_SEL, rev_Nx02RrItem_rrId: { orderBy: { lineNo: 'asc' }, select: RR_ITEM_SEL } },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_rr',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢進貨單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return this.mapRrDetail(full!);
  }

  async addItem(user: RequestUser, rrId: string, dto: CreateRrItemDto) {
    const tenantId = requireTenantId(user);
    const rr = await this.prisma.nx02Rr.findFirst({ where: { id: rrId, tenantId }, select: RR_SEL });
    if (!rr) throw new NotFoundException('RR not found');
    if (rr.voidedAt) throw new BadRequestException('RR is voided');
    this.assertRrItemsEditable(rr.status);
    const loc = await this.prisma.nx01Location.findFirst({
      where: { id: dto.locationId, tenantId, warehouseId: rr.warehouseId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException('locationId must belong to RR warehouse');
    const snap = await this.loadPartSnapshot(this.prisma, tenantId, dto.partId.trim());
    const maxLine = await this.prisma.nx02RrItem.aggregate({ where: { rrId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    const qty = new PrismaNs.Decimal(dto.qty);
    const unit = new PrismaNs.Decimal(dto.unitPriceSnapshot);
    const expQ = dto.expectedQty != null ? new PrismaNs.Decimal(dto.expectedQty) : qty;
    const lineAmount = this.lineAmount(qty, unit);
    // T2-b：驗收欄位（瑕疵驗證 / 保固到期 / 批號 預設自動產）
    this.validateDefect({ partNo: snap.partNo, defectQty: dto.defectQty, defectType: dto.defectType, defectDesc: dto.defectDesc, actualQty: dto.actualQty });
    const rrDateForItem = rr.rrDate ?? new Date();
    const batchNo = dto.batchNo?.trim() || this.genBatchNo(rrDateForItem, lineNo);
    const warrantyExpiredAt =
      dto.warrantyExpiredAt !== undefined
        ? dto.warrantyExpiredAt
          ? new Date(dto.warrantyExpiredAt)
          : null
        : this.calcWarrantyExpiredAt(rrDateForItem, snap.warrantyMonths);
    const row = await this.prisma.nx02RrItem.create({
      data: {
        rrId,
        lineNo,
        partId: dto.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        locationId: dto.locationId.trim(),
        qty,
        unitCost: unit,
        // M2-a 初始值（同 create 範式）
        originalUnitCost: unit,
        allocatedImportFee: new PrismaNs.Decimal(0),
        actualUnitCost: unit,
        lineAmount,
        expectedQty: expQ,
        actualQty: dto.actualQty != null ? new PrismaNs.Decimal(dto.actualQty) : null,
        // T2-b 驗收欄位
        defectQty: dto.defectQty != null ? new PrismaNs.Decimal(dto.defectQty) : new PrismaNs.Decimal(0),
        defectType: dto.defectType ?? null,
        defectDesc: dto.defectDesc?.trim() || null,
        batchNo,
        warrantyExpiredAt,
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: RR_ITEM_SEL,
    });
    await this.recalcRrTotals(this.prisma, rrId, new PrismaNs.Decimal(rr.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'CREATE',
      entityTable: 'nx02_rr_item',
      entityId: row.id,
      entityCode: rr.docNo,
      summary: '新增進貨明細',
      afterData: row as object,
    });
    // T8 進貨對齊批次 2026-06-08：平鋪 part.secCode 為 secCode
    const { part, ...rowRest } = row;
    return { ...rowRest, unitPriceSnapshot: row.unitCost, secCode: part?.secCode ?? null };
  }

  async patchItem(user: RequestUser, rrId: string, itemId: string, dto: PatchRrItemDto) {
    const tenantId = requireTenantId(user);
    const rr = await this.prisma.nx02Rr.findFirst({ where: { id: rrId, tenantId }, select: RR_SEL });
    if (!rr) throw new NotFoundException('RR not found');
    if (rr.voidedAt) throw new BadRequestException('RR is voided');
    this.assertRrItemsEditable(rr.status);
    const existing = await this.prisma.nx02RrItem.findFirst({ where: { id: itemId, rrId }, select: RR_ITEM_SEL });
    if (!existing) throw new NotFoundException('RR item not found');
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit =
      dto.unitPriceSnapshot !== undefined ? new PrismaNs.Decimal(dto.unitPriceSnapshot) : new PrismaNs.Decimal(existing.unitCost);
    const lineAmount = this.lineAmount(qty, unit);
    // T2-b：驗收欄位 patch 也守瑕疵業務規則（actualQty 比對也吃 patch 後值）
    const effectiveActualQty =
      dto.actualQty !== undefined ? (dto.actualQty == null ? null : Number(dto.actualQty)) : existing.actualQty != null ? Number(existing.actualQty) : null;
    this.validateDefect({
      partNo: existing.partNo,
      defectQty: dto.defectQty !== undefined ? dto.defectQty : Number(existing.defectQty),
      defectType: dto.defectType !== undefined ? dto.defectType : existing.defectType,
      defectDesc: dto.defectDesc !== undefined ? dto.defectDesc : existing.defectDesc,
      actualQty: effectiveActualQty,
    });
    const row = await this.prisma.nx02RrItem.update({
      where: { id: itemId },
      data: {
        ...(dto.qty !== undefined ? { qty } : {}),
        // M2-a：改 unitCost 時同步 originalUnitCost + actualUnitCost（未過帳前兩者跟 unitCost 同值）
        ...(dto.unitPriceSnapshot !== undefined ? { unitCost: unit, originalUnitCost: unit, actualUnitCost: unit } : {}),
        lineAmount,
        ...(dto.expectedQty !== undefined ? { expectedQty: new PrismaNs.Decimal(dto.expectedQty) } : {}),
        ...(dto.actualQty !== undefined ? { actualQty: dto.actualQty == null ? null : new PrismaNs.Decimal(dto.actualQty) } : {}),
        // T2-b 驗收欄位 patch
        ...(dto.defectQty !== undefined ? { defectQty: new PrismaNs.Decimal(dto.defectQty) } : {}),
        ...(dto.defectType !== undefined ? { defectType: dto.defectType } : {}),
        ...(dto.defectDesc !== undefined ? { defectDesc: dto.defectDesc } : {}),
        ...(dto.batchNo !== undefined ? { batchNo: dto.batchNo } : {}),
        ...(dto.warrantyExpiredAt !== undefined
          ? { warrantyExpiredAt: dto.warrantyExpiredAt ? new Date(dto.warrantyExpiredAt) : null }
          : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: RR_ITEM_SEL,
    });
    await this.recalcRrTotals(this.prisma, rrId, new PrismaNs.Decimal(rr.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'UPDATE',
      entityTable: 'nx02_rr_item',
      entityId: itemId,
      entityCode: rr.docNo,
      summary: '修改進貨明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    // T8 進貨對齊批次 2026-06-08：平鋪 part.secCode 為 secCode
    const { part, ...rowRest } = row;
    return { ...rowRest, unitPriceSnapshot: row.unitCost, secCode: part?.secCode ?? null };
  }

  async removeItem(user: RequestUser, rrId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const rr = await this.prisma.nx02Rr.findFirst({ where: { id: rrId, tenantId }, select: RR_SEL });
    if (!rr) throw new NotFoundException('RR not found');
    if (rr.voidedAt) throw new BadRequestException('RR is voided');
    this.assertRrItemsEditable(rr.status);
    const existing = await this.prisma.nx02RrItem.findFirst({ where: { id: itemId, rrId }, select: RR_ITEM_SEL });
    if (!existing) throw new NotFoundException('RR item not found');
    await this.prisma.nx02RrItem.delete({ where: { id: itemId } });
    await this.recalcRrTotals(this.prisma, rrId, new PrismaNs.Decimal(rr.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_rr_item',
      entityId: itemId,
      entityCode: rr.docNo,
      summary: '刪除進貨明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}
