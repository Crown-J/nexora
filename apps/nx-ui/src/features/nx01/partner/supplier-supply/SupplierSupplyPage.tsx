// apps/nx-ui/src/features/nx01/partner/supplier-supply/SupplierSupplyPage.tsx
// 供應商供貨對應（接真 API、2026-06-22 重寫）
//
// 後端對齊 nx02_partner_part（partner ↔ part 中間表）：
//   - partner = nx01_partner where partner_type='S' 純供應商
//   - 供貨記錄 = nx02_partner_part（partnerId, partId, isPrimary, supplierPartNo,
//                  defaultUnitCost, defaultLeadDays, moq, source, validFrom/To, remark）
//
// 執行長 2026-06-22 拍板：
//   - isPrimary 不唯一（同零件可多家主供）
//   - 按品牌分組 accordion 顯示
//   - 「加入品牌」一次帶該品牌全品項
//   - 「移除此品牌」清掉該供應商在該品牌的全部對應
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Filter, Star, Truck } from 'lucide-react';

import { MasterBatchShell } from '@design/components/master-batch';
import type { MasterBatchConfig, MemberGroup } from '@design/components/master-batch';
import { cn } from '@design/utils/cn';

import { listPartners, type PartnerDto } from '@data/endpoints/nx01/api/partner';
import { listBrands, type BrandDto } from '@data/endpoints/nx01/api/brand';
import { listParts, type PartDto } from '@data/endpoints/nx01/api/part';
import {
  createPartnerPart,
  listPartnerParts,
  softDeletePartnerPart,
  updatePartnerPart,
  type PartnerPartDto,
} from '@data/endpoints/nx02/api/partner-part';

import { SelectBrandModal } from './SelectBrandModal';

export function SupplierSupplyPage() {
  const [suppliers, setSuppliers] = useState<PartnerDto[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  /** Map<partnerId, PartnerPartDto[]> */
  const [supplyMap, setSupplyMap] = useState<Map<string, PartnerPartDto[]>>(new Map());
  /** 每品牌全品項數 — 用於顯示「已供 N / 共 M」、按需 fetch 並 cache */
  const [brandPartsCountMap, setBrandPartsCountMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [brandModalSupplierId, setBrandModalSupplierId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // ---------- 載入 suppliers + brands + all partner-part active ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [supRes, brandRes, ppRes] = await Promise.all([
          listPartners({ partnerType: 'S', isActive: true, pageSize: 200 }),
          listBrands({ isPart: true, isActive: true, pageSize: 200 }),
          listPartnerParts({ isActive: true, pageSize: 100 }),
        ]);
        if (cancelled) return;
        setSuppliers(supRes.items);
        setBrands(brandRes.items);

        // 若 partnerPart 總筆數 > 100、分頁全載
        let allPp: PartnerPartDto[] = ppRes.items;
        if (ppRes.total > ppRes.items.length) {
          const totalPages = Math.ceil(ppRes.total / 100);
          const more = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              listPartnerParts({ isActive: true, pageSize: 100, page: i + 2 }).catch(() => null),
            ),
          );
          for (const r of more) {
            if (r) allPp = allPp.concat(r.items);
          }
        }
        if (cancelled) return;
        const map = new Map<string, PartnerPartDto[]>();
        for (const pp of allPp) {
          const arr = map.get(pp.partnerId) ?? [];
          arr.push(pp);
          map.set(pp.partnerId, arr);
        }
        setSupplyMap(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const triggerReload = useCallback(() => setReloadTick((t) => t + 1), []);

  // ---------- 內部工具 ----------
  const recordsOf = useCallback(
    (supplierId: string): PartnerPartDto[] => supplyMap.get(supplierId) ?? [],
    [supplyMap],
  );

  // 依需求 fetch brand 全品項數（cache）
  const ensureBrandPartsCount = useCallback(
    async (brandId: string) => {
      if (brandPartsCountMap.has(brandId)) return;
      const res = await listParts({ brandId, pageSize: 1, isActive: true } as never).catch(() => null);
      if (!res) return;
      setBrandPartsCountMap((prev) => {
        const next = new Map(prev);
        next.set(brandId, res.total);
        return next;
      });
    },
    [brandPartsCountMap],
  );

  // ---------- 加入品牌：listParts(brandId)、for each create partner-part ----------
  const handleAddBrandParts = useCallback(
    async (supplierId: string, brandId: string) => {
      try {
        // 取該品牌所有 part（active）
        const res = await listParts({ brandId, isActive: true, pageSize: 500 } as never);
        const existingPartIds = new Set(recordsOf(supplierId).map((r) => r.partId));
        const toAdd = res.items.filter((p) => !existingPartIds.has(p.id));
        if (toAdd.length === 0) {
          alert('該品牌全品項都已對應、沒新增的');
          return;
        }
        for (const p of toAdd) {
          await createPartnerPart({
            partnerId: supplierId,
            partId: p.id,
            source: 'M',
          }).catch((e) => {
            // 容錯：個別失敗（如 unique 重複）跳過
            console.warn('createPartnerPart 跳過', p.id, e);
          });
        }
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`加入失敗：${msg}`);
      }
    },
    [recordsOf, triggerReload],
  );

  const handleRemoveBrand = useCallback(
    async (supplierId: string, brandId: string) => {
      try {
        const toRemove = recordsOf(supplierId).filter((r) => r.part?.brandId === brandId);
        for (const r of toRemove) {
          await softDeletePartnerPart(r.id).catch((e) => console.warn('softDelete 跳過', r.id, e));
        }
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`移除品牌失敗：${msg}`);
      }
    },
    [recordsOf, triggerReload],
  );

  const handleTogglePrimary = useCallback(
    async (rowId: string, currentPrimary: boolean) => {
      try {
        await updatePartnerPart(rowId, { isPrimary: !currentPrimary });
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`切換主要供應商失敗：${msg}`);
      }
    },
    [triggerReload],
  );

  // ---------- config ----------
  const config = useMemo<MasterBatchConfig<PartnerDto, PartnerPartDto>>(
    () => ({
      title: '供應商供貨對應',
      category: '分級與供貨設定',
      desc: '紀錄供應商賣什麼品牌、什麼品項。按品牌 accordion 分組；「加入品牌」一次帶該品牌全品項、再個別剔除不供的。',
      subjectIcon: Truck,
      subjectNoun: '供應商',
      memberNoun: '供貨品項',
      memberUnit: '項',
      addLabel: '加入品牌',
      addIcon: Filter,
      searchPlaceholder: '搜尋供應商名稱…',

      leftMode: 'flat',
      subjects: () => suppliers,
      subjectId: (s) => s.id,
      subjectTitle: (s) => s.name,
      subjectSearch: (s, q) => s.name.includes(q) || s.code.toLowerCase().includes(q),
      subjectCount: (s) => recordsOf(s.id).length,

      rightMode: 'grouped',
      members: (s) => recordsOf(s.id),
      memberId: (r) => r.id,
      renderMember: (r, _i, _focused, supplier) => (
        <SupplyRow record={r} onTogglePrimary={() => handleTogglePrimary(r.id, r.isPrimary)} />
      ),
      memberGroups: (s) =>
        buildMemberGroups(
          s.id,
          recordsOf(s.id),
          brandPartsCountMap,
          handleAddBrandParts,
          handleRemoveBrand,
        ),

      onAdd: (s) => setBrandModalSupplierId(s.id),
      onRemoveMember: async (s, rowId, ctx) => {
        const row = recordsOf(s.id).find((r) => r.id === rowId);
        if (!row) return;
        try {
          await softDeletePartnerPart(rowId);
          ctx.showToast(`已從「${s.name}」移除 ${row.part?.name ?? row.partId}`, 'success');
          triggerReload();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          ctx.showToast(`移除失敗：${msg}`, 'danger');
        }
      },
      emptyText: () => ({
        title: '這家供應商還沒有供貨品項',
        desc: '點右上「加入品牌」選一個品牌 → 自動匯入該品牌全品項、再個別剔除不供的。',
      }),
    }),
    [
      suppliers,
      recordsOf,
      brandPartsCountMap,
      handleAddBrandParts,
      handleRemoveBrand,
      handleTogglePrimary,
      triggerReload,
    ],
  );

  // ---------- 計算「該供應商未對應」的品牌（給 SelectBrandModal） ----------
  const availableBrandsForModal = useMemo<BrandDto[]>(() => {
    if (!brandModalSupplierId) return [];
    const existingBrandIds = new Set(
      recordsOf(brandModalSupplierId)
        .map((r) => r.part?.brandId)
        .filter((x): x is string => !!x),
    );
    return brands.filter((b) => !existingBrandIds.has(b.id));
  }, [brandModalSupplierId, recordsOf, brands]);

  // 對 modal 內每個 brand 預載 count（並行、cache 已存在的不重複）
  useEffect(() => {
    if (brandModalSupplierId === null) return;
    availableBrandsForModal.forEach((b) => {
      ensureBrandPartsCount(b.id);
    });
  }, [brandModalSupplierId, availableBrandsForModal, ensureBrandPartsCount]);

  const handleBrandConfirm = useCallback(
    (brand: BrandDto) => {
      if (!brandModalSupplierId) return;
      handleAddBrandParts(brandModalSupplierId, brand.id);
      setBrandModalSupplierId(null);
    },
    [brandModalSupplierId, handleAddBrandParts],
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        載入中…
      </div>
    );
  }

  return (
    <>
      <MasterBatchShell config={config} />

      {brandModalSupplierId !== null ? (
        <SelectBrandModal
          onClose={() => setBrandModalSupplierId(null)}
          availableBrands={availableBrandsForModal}
          onConfirm={handleBrandConfirm}
        />
      ) : null}
    </>
  );
}

/* ============ 構造 memberGroups ============ */
function buildMemberGroups(
  supplierId: string,
  records: PartnerPartDto[],
  brandPartsCountMap: Map<string, number>,
  onAddRemaining: (supplierId: string, brandId: string) => void,
  onRemoveBrand: (supplierId: string, brandId: string) => void,
): MemberGroup<PartnerPartDto>[] {
  // 按 part.brandId 分組（含 unknown）
  const groupsMap = new Map<string, { brandName: string; rows: PartnerPartDto[] }>();
  for (const r of records) {
    const bid = r.part?.brandId ?? '__no_brand__';
    const bname = r.part?.brand?.name ?? '（無品牌）';
    const g = groupsMap.get(bid) ?? { brandName: bname, rows: [] };
    g.rows.push(r);
    groupsMap.set(bid, g);
  }
  return Array.from(groupsMap.entries()).map(([brandId, g]) => {
    const supplied = g.rows.length;
    const totalInBrand = brandPartsCountMap.get(brandId);
    const fullyCovered = totalInBrand !== undefined && supplied >= totalInBrand;
    return {
      key: brandId,
      label: g.brandName,
      members: g.rows,
      meta: (
        <span className="font-mono tabular-nums">
          {totalInBrand !== undefined ? `已供 ${supplied} / 共 ${totalInBrand}` : `已供 ${supplied}`}
        </span>
      ),
      actions: (
        <>
          {!fullyCovered && brandId !== '__no_brand__' ? (
            <button
              type="button"
              onClick={() => onAddRemaining(supplierId, brandId)}
              title={`補齊「${g.brandName}」剩餘品項`}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2 text-[11px] font-semibold text-[#E8A020] transition-colors hover:bg-[#E8A020]/20"
            >
              全部加入
            </button>
          ) : null}
          {brandId !== '__no_brand__' ? (
            <button
              type="button"
              onClick={() => onRemoveBrand(supplierId, brandId)}
              title={`清掉「${g.brandName}」全部 ${supplied} 個品項`}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background/60 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive"
            >
              移除此品牌
            </button>
          ) : null}
        </>
      ),
    };
  });
}

/* ============ 供貨品項列（顯示 + ⭐ primary toggle） ============ */
function SupplyRow({
  record,
  onTogglePrimary,
}: {
  record: PartnerPartDto;
  onTogglePrimary: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 flex-none place-items-center rounded-md bg-[#E8A020]/14 text-[#E8A020]">
        <Box className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{record.part?.name ?? record.partId}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span className="font-mono text-foreground/85">{record.part?.code ?? record.partId}</span>
          {record.supplierPartNo ? (
            <span>· 廠商料號 <span className="font-mono text-foreground/75">{record.supplierPartNo}</span></span>
          ) : null}
          {record.defaultUnitCost ? <span>· NT$ {record.defaultUnitCost}</span> : null}
          {record.defaultLeadDays != null ? <span>· {record.defaultLeadDays} 天</span> : null}
          {record.moq ? <span>· MOQ {record.moq}</span> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePrimary();
        }}
        title={record.isPrimary ? '取消主要供應商' : '設為主要供應商'}
        aria-label={record.isPrimary ? '取消主要供應商' : '設為主要供應商'}
        className={cn(
          'inline-flex h-7 flex-none items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors',
          record.isPrimary
            ? 'border-[#E8A020]/45 bg-[#E8A020]/15 text-[#E8A020] hover:bg-[#E8A020]/22'
            : 'border-border bg-background/60 text-muted-foreground hover:border-[#E8A020]/45 hover:bg-[#E8A020]/12 hover:text-[#E8A020]',
        )}
      >
        <Star className="size-3.5" />
        {record.isPrimary ? '主要' : '設主要'}
      </button>
    </div>
  );
}
