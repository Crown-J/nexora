// apps/nx-ui/src/features/nx01/partner/supplier-supply/SupplierSupplyPage.tsx
// 供應商供貨對應（案例 4 / Step 6 Commit B）
//
// 執行長拍板採 B 建模：
//   - 紀錄粒度 = 零件（採購端查「誰供這顆零件」一張 join 表）
//   - 品牌作為批次操作工具：「加入品牌」一次帶該品牌全品項
//   - UI 上按品牌 accordion 分組顯示
//
// 互動：
//   - 左欄 flat list：供應商
//   - 右欄 grouped：按品牌 accordion，每組標頭：
//       · 品牌名 + 「已供 N / 共 M」徽章
//       · 「全部加入」（補齊該品牌未匯入的品項）
//       · 「移除此品牌」（清掉該供應商在該品牌的全部對應）
//   - shell add 鈕「加入品牌」→ 開 SelectBrandModal
//   - 成員列 ✕ 移除單品項；⭐ 切換主要供應商
'use client';

import { useCallback, useMemo, useState } from 'react';
import { Box, Filter, Star, Truck } from 'lucide-react';

import { MasterBatchShell } from '@design/components/master-batch';
import type { MasterBatchConfig, MemberGroup } from '@design/components/master-batch';
import { cn } from '@design/utils/cn';

import { SelectBrandModal } from './SelectBrandModal';
import {
  BRANDS,
  SUPPLIERS,
  SUPPLY_SEED,
  brandOf,
  partOf,
  partsInBrand,
  type BrandMock,
  type SupplierMock,
  type SupplyRecord,
} from './mock-data';

export function SupplierSupplyPage() {
  const [supply, setSupply] = useState<Record<string, SupplyRecord[]>>(SUPPLY_SEED);
  const [brandModalSupplierId, setBrandModalSupplierId] = useState<string | null>(null);

  // ---------- 內部工具 ----------
  const recordsOf = useCallback(
    (supplierId: string): SupplyRecord[] => supply[supplierId] ?? [],
    [supply],
  );

  const handleAddBrandParts = useCallback(
    (supplierId: string, brandId: string) => {
      setSupply((prev) => {
        const existing = new Set((prev[supplierId] ?? []).map((r) => r.partCode));
        const newRecords: SupplyRecord[] = partsInBrand(brandId)
          .filter((p) => !existing.has(p.code))
          .map((p) => ({
            partCode: p.code,
            vendorCode: '',
            price: null,
            lead: null,
            moq: null,
            primary: false,
          }));
        if (newRecords.length === 0) return prev;
        return {
          ...prev,
          [supplierId]: [...(prev[supplierId] ?? []), ...newRecords],
        };
      });
    },
    [],
  );

  const handleRemoveBrand = useCallback((supplierId: string, brandId: string) => {
    setSupply((prev) => ({
      ...prev,
      [supplierId]: (prev[supplierId] ?? []).filter((r) => {
        const p = partOf(r.partCode);
        return p?.brand !== brandId;
      }),
    }));
  }, []);

  const handleTogglePrimary = useCallback((supplierId: string, partCode: string) => {
    setSupply((prev) => ({
      ...prev,
      [supplierId]: (prev[supplierId] ?? []).map((r) =>
        r.partCode === partCode ? { ...r, primary: !r.primary } : r,
      ),
    }));
  }, []);

  // ---------- config ----------
  const config = useMemo<MasterBatchConfig<SupplierMock, SupplyRecord>>(
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
      subjects: () => SUPPLIERS,
      subjectId: (s) => s.id,
      subjectTitle: (s) => s.name,
      subjectSearch: (s, q) => s.name.includes(q) || s.id.toLowerCase().includes(q),
      subjectCount: (s) => recordsOf(s.id).length,

      rightMode: 'grouped',
      // grouped 模式下 members 仍要 implement（types required）、用 flatten 提供
      members: (s) => recordsOf(s.id),
      memberId: (r) => r.partCode,
      renderMember: (r, _i, _focused, supplier) => (
        <SupplyRow
          record={r}
          onTogglePrimary={() => handleTogglePrimary(supplier.id, r.partCode)}
        />
      ),
      memberGroups: (s) => buildMemberGroups(s.id, recordsOf(s.id), handleAddBrandParts, handleRemoveBrand),

      onAdd: (s) => setBrandModalSupplierId(s.id),
      onRemoveMember: (s, partCode, ctx) => {
        setSupply((prev) => ({
          ...prev,
          [s.id]: (prev[s.id] ?? []).filter((r) => r.partCode !== partCode),
        }));
        const p = partOf(partCode);
        ctx.showToast(`已從「${s.name}」移除 ${p?.name ?? partCode}`, 'success');
      },
      emptyText: () => ({
        title: '這家供應商還沒有供貨品項',
        desc: '點右上「加入品牌」選一個品牌 → 自動匯入該品牌全品項、再個別剔除不供的。',
      }),
    }),
    [handleAddBrandParts, handleRemoveBrand, handleTogglePrimary, recordsOf],
  );

  // ---------- 計算「該供應商未對應」的品牌（給 SelectBrandModal） ----------
  const availableBrandsForModal = useMemo<BrandMock[]>(() => {
    if (!brandModalSupplierId) return [];
    const existingBrandIds = new Set(
      recordsOf(brandModalSupplierId)
        .map((r) => partOf(r.partCode)?.brand)
        .filter((x): x is string => !!x),
    );
    return BRANDS.filter((b) => !existingBrandIds.has(b.id));
  }, [brandModalSupplierId, recordsOf]);

  const handleBrandConfirm = useCallback(
    (brand: BrandMock) => {
      if (!brandModalSupplierId) return;
      handleAddBrandParts(brandModalSupplierId, brand.id);
      setBrandModalSupplierId(null);
    },
    [brandModalSupplierId, handleAddBrandParts],
  );

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
  records: SupplyRecord[],
  onAddRemaining: (supplierId: string, brandId: string) => void,
  onRemoveBrand: (supplierId: string, brandId: string) => void,
): MemberGroup<SupplyRecord>[] {
  // 按 part.brand 分組
  const groupsMap = new Map<string, SupplyRecord[]>();
  records.forEach((r) => {
    const p = partOf(r.partCode);
    if (!p) return;
    const arr = groupsMap.get(p.brand) ?? [];
    arr.push(r);
    groupsMap.set(p.brand, arr);
  });
  return Array.from(groupsMap.entries()).map(([brandId, recs]) => {
    const brand = brandOf(brandId);
    const totalInBrand = partsInBrand(brandId).length;
    const supplied = recs.length;
    const fullyCovered = supplied >= totalInBrand;
    return {
      key: brandId,
      label: brand?.name ?? brandId,
      members: recs,
      meta: (
        <span className="font-mono tabular-nums">
          已供 {supplied} / 共 {totalInBrand}
        </span>
      ),
      actions: (
        <>
          {!fullyCovered ? (
            <button
              type="button"
              onClick={() => onAddRemaining(supplierId, brandId)}
              title={`補齊「${brand?.name}」剩餘 ${totalInBrand - supplied} 個品項`}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2 text-[11px] font-semibold text-[#E8A020] transition-colors hover:bg-[#E8A020]/20"
            >
              全部加入
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onRemoveBrand(supplierId, brandId)}
            title={`清掉「${brand?.name}」全部 ${supplied} 個品項`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background/60 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive"
          >
            移除此品牌
          </button>
        </>
      ),
    };
  });
}

/* ============ 供貨品項列（read-only 顯示 + ⭐ primary toggle） ============ */
function SupplyRow({
  record,
  onTogglePrimary,
}: {
  record: SupplyRecord;
  onTogglePrimary: () => void;
}) {
  const part = partOf(record.partCode);
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 flex-none place-items-center rounded-md bg-[#E8A020]/14 text-[#E8A020]">
        <Box className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{part?.name ?? record.partCode}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span className="font-mono text-foreground/85">{record.partCode}</span>
          {part ? <span>· {part.origin}</span> : null}
          {record.vendorCode ? (
            <span>· 廠商料號 <span className="font-mono text-foreground/75">{record.vendorCode}</span></span>
          ) : null}
          {record.price != null ? <span>· NT$ {record.price.toLocaleString('en-US')}</span> : null}
          {record.lead != null ? <span>· {record.lead} 天</span> : null}
          {record.moq != null ? <span>· MOQ {record.moq}</span> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePrimary();
        }}
        title={record.primary ? '取消主要供應商' : '設為主要供應商'}
        aria-label={record.primary ? '取消主要供應商' : '設為主要供應商'}
        className={cn(
          'inline-flex h-7 flex-none items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors',
          record.primary
            ? 'border-[#E8A020]/45 bg-[#E8A020]/15 text-[#E8A020] hover:bg-[#E8A020]/22'
            : 'border-border bg-background/60 text-muted-foreground hover:border-[#E8A020]/45 hover:bg-[#E8A020]/12 hover:text-[#E8A020]',
        )}
      >
        <Star className="size-3.5" />
        {record.primary ? '主要' : '設主要'}
      </button>
    </div>
  );
}
