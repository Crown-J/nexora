// apps/nx-ui/src/features/part-zoned/PartFormZoned.tsx
// v1.2 對齊軌 階段 E P3：part 分區編輯共用 form 元件
//
// 對齊：
// - 決策 3.2（v1.1）：成本保密「不」做 service 層欄位過濾、靠兩道屏障
//   屏障 1：模組權限（進貨成本只放進貨頁、售價只放銷售頁）— 本元件 editableZones 落實
//   屏障 2：主檔中心存取權限（master.product.*）— 路由層 RBAC 負責、本元件不管
// - 決策 3.3：part 衛星表 oemCodes/relations/models/stockSettings（versions 屬庫存稽核、不在主檔 UI 渲染、見 part-zones.ts 註解）
//
// 用於 4 種場景：
//   1) 主檔中心 part 編輯頁（全 4 zone）
//   2) 採購→產品管理（basic + purchase + inventory）
//   3) 銷貨→產品（basic + sales、新建、Alex 2026-05-30 拍板 sale.product.* 權限）
//   4) 庫存→產品維護（basic + inventory）
'use client';

import { useMemo } from 'react';

import { cn } from '@design/utils/cn';
import {
  PART_FIELDS,
  PART_ZONES,
  isFieldVisibleAtPlan,
  normalizePlanTier,
  type PartZone,
} from '@/features/nx01/shell/zones';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { FormField, FormInput } from '@/features/nx01/shell/ui/FormField';
import { KeyboardSelect } from '@/features/nx01/shell/ui/KeyboardSelect';
import { SatelliteSection } from '@/features/nx01/shell/satellite/SatelliteSection';
import { StockSettingsSatellite } from './StockSettingsSatellite';
import type { PartDto, PartOemCodeItem } from '@data/types/shared/master/part';
import { Calculator, Plus, X } from 'lucide-react';

import {
  PART_TYPE_OPTIONS,
  PURCHASE_CATEGORY_OPTIONS,
  TECH_CATEGORY_OPTIONS,
  RETURN_POLICY_OPTIONS,
  type PartDraft,
} from './helpers';

export type RefOption = { value: string; label: string };

export type PartFormZonedProps = {
  mode: 'browse' | 'edit';
  creating: boolean;
  draft: PartDraft;
  setDraft: (next: PartDraft) => void;
  activeZone: PartZone;
  setActiveZone: (z: PartZone) => void;
  /**
   * v1.1 §1：本頁可編 zones。
   * - undefined = 主檔中心、全 zone 可編
   * - Set = 模組頁面固定
   */
  editableZones?: Set<PartZone>;
  refOptions: {
    partBrandId?: RefOption[];
    partGroupId?: RefOption[];
    countryId?: RefOption[];
  };
  /** v1.2 階段 E P5：衛星表渲染需要 part 主 row（id + oemCodes 等） */
  selected?: PartDto | null;
  /**
   * A2：oemCodes 子表 inline 編輯
   * - oemCodesDraft：當前編輯中的子表（staged、存檔時整批送）
   * - onOemCodesChange：替換整批
   */
  oemCodesDraft?: PartOemCodeItem[];
  onOemCodesChange?: (next: PartOemCodeItem[]) => void;
  /**
   * A3：依成本重算 ABCD
   * - 從 customer-grades 取 marginPct 動態計算（取代舊版 hard-code MARGINS）
   * - sales zone 才顯示按鈕
   */
  onRecalcPrices?: () => void;
};

const FK_REF_KEYS: Record<string, keyof PartFormZonedProps['refOptions']> = {
  partBrandId: 'partBrandId',
  partGroupId: 'partGroupId',
  countryId: 'countryId',
};

export function PartFormZoned({
  mode,
  creating,
  draft,
  setDraft,
  activeZone,
  setActiveZone,
  editableZones,
  refOptions,
  selected,
  oemCodesDraft,
  onOemCodesChange,
  onRecalcPrices,
}: PartFormZonedProps) {
  const editing = mode === 'edit';

  // 02 第四批 軌 3a 2026-06-07：版本門檻欄位顯示控制（車型適配等）。
  const { planCode } = useSessionMe();
  const currentPlan = normalizePlanTier(planCode);

  /** 主檔中心 → 全 zone；模組頁 → editableZones 即可見 zones */
  const visibleZones = useMemo<Set<PartZone>>(
    () => editableZones ?? new Set(PART_ZONES.map((z) => z.zone)),
    [editableZones],
  );

  const visibleZoneList = useMemo(
    () => PART_ZONES.filter((z) => visibleZones.has(z.zone)),
    [visibleZones],
  );

  const safeActiveZone = visibleZones.has(activeZone)
    ? activeZone
    : visibleZoneList[0]?.zone ?? 'basic';

  const fieldsForZone = useMemo(
    () =>
      PART_FIELDS.filter((f) => {
        if (f.zone !== safeActiveZone) return false;
        // 02 第四批 軌 3a 2026-06-07：版本門檻 — 低於 minPlan 的 UI 隱藏（資料保留）
        if (!isFieldVisibleAtPlan(f, currentPlan)) return false;
        return true;
      }),
    [safeActiveZone, currentPlan],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Zone Tabs */}
      <div className="flex gap-[2px] overflow-x-auto border-b border-border/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleZoneList.map((z) => {
          const active = z.zone === safeActiveZone;
          return (
            <button
              key={z.zone}
              type="button"
              onClick={() => setActiveZone(z.zone)}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 border-transparent px-[14px] py-[11px] text-[13px] font-semibold transition-colors',
                active ? 'border-[#E8A020] text-[#E8A020]' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {z.label}
            </button>
          );
        })}
        {editableZones && visibleZones.size < PART_ZONES.length ? (
          <span className="ml-auto text-[10px] text-[#5A5A60]">
            本頁僅顯示 {visibleZones.size} 區、其他 {PART_ZONES.length - visibleZones.size} 區屬其他模組
          </span>
        ) : null}
      </div>


      {/* A3：sales zone「依成本重算」按鈕（讀客戶分級毛利率） */}
      {editing && safeActiveZone === 'sales' && onRecalcPrices ? (
        <div className="flex items-center justify-between rounded-md border border-[#E8A020]/20 bg-[#E8A020]/5 px-3 py-2">
          <div className="text-xs text-[#B8B8C0]">
            售價 A/B/C/D 可手動微調；或一鍵依「進貨成本 × 客戶分級毛利率」重算
          </div>
          <button
            type="button"
            onClick={onRecalcPrices}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-[11px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
          >
            <Calculator className="size-3" /> 依成本重算
          </button>
        </div>
      ) : null}

      {/* zone 內欄位 grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fieldsForZone.map((f) => {
          // 衛星表（v1.1 §3.3「預設 + 展開看全部」）
          if (f.isSatellite) {
            // A2：oemCodes 編輯時走 inline 編輯範式（移植自舊版 PartMasterPage line 573-603）
            if (f.key === 'oemCodes' && editing && onOemCodesChange) {
              return (
                <div key={f.key} className="sm:col-span-2">
                  <OemCodesInlineEditor
                    items={oemCodesDraft ?? []}
                    brandOptions={refOptions.partBrandId ?? []}
                    onChange={onOemCodesChange}
                  />
                </div>
              );
            }
            return (
              <div key={f.key} className="sm:col-span-2">
                {renderPartSatellite(f.key, f.label, f.notes, f.satelliteName, selected)}
              </div>
            );
          }

          // priceUpdatedAt/By + lastPurchaseAt/SaleAt 永遠 browse-only（service 自動寫）
          // 02 第四批 軌 3b 2026-06-07：新增最後進貨/銷售時間（採購頁 / 銷貨頁分別顯示）
          if (
            f.key === 'priceUpdatedAt' ||
            f.key === 'priceUpdatedBy' ||
            f.key === 'lastPurchaseAt' ||
            f.key === 'lastSaleAt'
          ) {
            const isDateField =
              f.key === 'priceUpdatedAt' || f.key === 'lastPurchaseAt' || f.key === 'lastSaleAt';
            return (
              <FormField
                key={f.key}
                label={f.label}
                value={String(draft[f.key] ?? '—') || '—'}
                mono={isDateField}
                dim
              />
            );
          }

          const zoneEditable = editableZones ? editableZones.has(f.zone) : true;
          // 2026-06-26：基準料號 code 開放修改、不再鎖定
          const fieldEditable = editing && zoneEditable;

          // FK ref 欄位
          const refKey = FK_REF_KEYS[f.key];
          if (refKey && fieldEditable) {
            const opts = refOptions[refKey] ?? [];
            return (
              <FieldShell key={f.key} label={f.label} required={f.required}>
                <KeyboardSelect
                  value={String(draft[f.key] ?? '')}
                  options={[
                    { value: '', label: '（未指定）' },
                    ...opts.map((o) => ({ value: o.value, label: o.label })),
                  ]}
                  ariaLabel={f.label}
                  onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                />
              </FieldShell>
            );
          }

          // returnPolicy / type / 分類一二 靜態下拉
          if (
            fieldEditable &&
            (f.key === 'returnPolicy' || f.key === 'type' || f.key === 'purchaseCategory' || f.key === 'techCategory')
          ) {
            const opts =
              f.key === 'returnPolicy'
                ? RETURN_POLICY_OPTIONS
                : f.key === 'type'
                ? PART_TYPE_OPTIONS
                : f.key === 'purchaseCategory'
                ? PURCHASE_CATEGORY_OPTIONS
                : TECH_CATEGORY_OPTIONS;
            return (
              <FieldShell key={f.key} label={f.label} required={f.required}>
                <KeyboardSelect
                  value={String(draft[f.key] ?? '')}
                  options={[
                    ...(f.required ? [] : [{ value: '', label: '（未指定）' }]),
                    ...opts,
                  ]}
                  ariaLabel={f.label}
                  onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                />
              </FieldShell>
            );
          }

          // isOem toggle
          if (f.key === 'isOem' && fieldEditable) {
            const on = Boolean(draft[f.key]);
            return (
              <FieldShell key={f.key} label={f.label}>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, [f.key]: !on })}
                  className={cn(
                    'inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors',
                    on
                      ? 'border-[#22D88F]/40 bg-[#22D88F]/10 text-[#22D88F]'
                      : 'border-[#5A5A60]/40 bg-[#0A0A0C] text-[#888892]',
                  )}
                >
                  {on ? '正廠件' : '副廠件'}
                </button>
              </FieldShell>
            );
          }

          // 文字輸入（規格/備註長文 → 跨 2 欄、詳細頁排版 2026-07-11 執行長拍板）
          if (fieldEditable) {
            return (
              <div key={f.key} className={f.key === 'spec' ? 'sm:col-span-2' : undefined}>
                <FormInput
                  label={f.label + (f.required ? ' *' : '')}
                  value={String(draft[f.key] ?? '')}
                  onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                />
              </div>
            );
          }

          // 瀏覽 / locked / 非 editable（code/name 主識別 emphasis、詳細頁排版 2026-07-11）
          const raw = draft[f.key];
          const display = renderBrowseValue(f.key, raw, refOptions);
          return (
            <div key={f.key} className={f.key === 'spec' ? 'sm:col-span-2' : undefined}>
              <FormField
                label={f.label}
                value={display}
                mono={f.key === 'code' || f.key === 'secCode'}
                emphasis={f.key === 'code' || f.key === 'name'}
                tone={
                  f.key === 'isOem'
                    ? (raw ? 'green' : 'muted')
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldShell({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
        {label + (required ? ' *' : '')}
      </span>
      {children}
    </div>
  );
}

/**
 * v1.2 階段 E P5：part 5 衛星表渲染範式（SatelliteSection）
 *
 * - oemCodes：part.service.getById 整批回傳、本軌可直接讀 selected.oemCodes 渲染
 * - relations / models：endpoint /nx01/part-relations | part-models（partId query）
 *   本軌只提供「endpoint 路徑」hint、實際 fetch + CRUD UI 列入 closure 後續軌
 * - versions：02 第四批 軌 3a B 拍板 2026-06-07 從零件主檔拉掉、未來在 NX08 報表做「料件異動歷史」
 * - stockSettings：endpoint /nx03/part-stock-setting（partId + warehouseId query）、同上
 */
function renderPartSatellite(
  key: string,
  label: string,
  notes: string | undefined,
  satelliteName: string | undefined,
  selected: PartDto | null | undefined,
): React.ReactNode {
  if (key === 'oemCodes') {
    const items = selected?.oemCodes ?? [];
    const main = items[0];
    return (
      <SatelliteSection
        title={`${label}`}
        description={`衛星表 ${satelliteName ?? ''}；${notes ?? ''}`}
        count={items.length}
        status={selected ? 'ready' : 'empty'}
        hint="父單 PATCH oemCodes 整批傳"
        summary={
          main ? (
            <div className="text-xs text-[#E8E8EB]">
              <span className="text-[#5A5A60]">主筆：</span>
              <span className="font-mono">{main.oemCode}</span>
              {main.partBrandName ? (
                <span className="ml-2 text-[#888892]">（{main.partBrandName}）</span>
              ) : null}
              {main.remark ? <span className="ml-2 text-[#5A5A60]">— {main.remark}</span> : null}
            </div>
          ) : (
            <div className="text-xs text-[#5A5A60]">尚無正廠對應料號</div>
          )
        }
        expandedContent={
          items.length === 0 ? (
            <div className="text-xs text-[#5A5A60]">尚無資料</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-[#5A5A60]">
                  <th className="py-1.5 pr-3">正廠料號</th>
                  <th className="py-1.5 pr-3">品牌</th>
                  <th className="py-1.5">備註</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.id ?? i} className="border-t border-[#2A2A30]/60">
                    <td className="py-1.5 pr-3 font-mono">{it.oemCode}</td>
                    <td className="py-1.5 pr-3 text-[#888892]">{it.partBrandName ?? it.partBrandId ?? '—'}</td>
                    <td className="py-1.5 text-[#888892]">{it.remark ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      />
    );
  }

  // W5 [2-2] 2026-06-06：stockSettings 從 placeholder 升級為 fetch + 顯示
  if (key === 'stockSettings') {
    return (
      <StockSettingsSatellite
        partId={selected?.id}
        label={label}
        satelliteName={satelliteName}
        notes={notes}
      />
    );
  }

  // 2 個 endpoint 衛星：暫不接 fetch、顯示 endpoint 路徑 hint、CRUD UI 列入 closure 後續軌
  // versions 已從零件主檔 UI 拉掉（02 第四批 軌 3a B 拍板）、未來走 NX08 報表
  const endpointMap: Record<string, string> = {
    relations: '/nx01/part-relations?partIdFrom=…',
    models: '/nx01/part-models?partId=…',
  };
  const endpoint = endpointMap[key];

  return (
    <SatelliteSection
      title={label}
      description={`衛星表 ${satelliteName ?? ''}；${notes ?? ''}`}
      status="ready"
      hint={endpoint ? `endpoint：${endpoint}` : undefined}
      summary={
        <div className="text-xs text-[#5A5A60]">
          後端 endpoint 已備、UI fetch + CRUD 列入 closure 後續軌
        </div>
      }
      expandedContent={
        <div className="text-xs text-[#5A5A60]">
          {endpoint ? `走 ${endpoint} 取得列表後渲染；` : ''}本軌僅提供 SatelliteSection 範式骨架。
        </div>
      }
    />
  );
}

/**
 * A2：oemCodes 子表 inline 編輯
 * 移植自舊版 PartMasterPage line 573-603
 * - 新增空筆 / 改某筆 / 刪某筆、staged 在父單 oemCodesDraft、存檔時整批送
 * - 廠牌下拉、料號文字輸入、備註文字輸入
 */
function OemCodesInlineEditor({
  items,
  brandOptions,
  onChange,
}: {
  items: PartOemCodeItem[];
  brandOptions: RefOption[];
  onChange: (next: PartOemCodeItem[]) => void;
}) {
  const addOne = () =>
    onChange([...items, { partBrandId: null, oemCode: '', remark: null }]);
  const removeOne = (idx: number) =>
    onChange(items.filter((_, i) => i !== idx));
  const updateOne = (idx: number, patch: Partial<PartOemCodeItem>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  return (
    <div className="rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40">
      <div className="flex items-center justify-between border-b border-[#2A2A30] px-3 py-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E8E8EB]">
            正廠對應料號（子表）
          </span>
          <span className="ml-2 rounded bg-[#2A2A30] px-1.5 py-0.5 text-[10px] text-[#B8B8C0]">
            {items.length} 筆
          </span>
        </div>
        <button
          type="button"
          onClick={addOne}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-[11px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
        >
          <Plus className="size-3" /> 新增正廠對應
        </button>
      </div>

      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        {items.length === 0 ? (
          <div className="text-xs text-[#5A5A60]">尚無正廠對應料號、按右上「新增」</div>
        ) : (
          items.map((o, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <div className="w-40">
                <KeyboardSelect
                  value={String(o.partBrandId ?? '')}
                  options={[
                    { value: '', label: '（廠牌）' },
                    ...brandOptions.map((b) => ({ value: b.value, label: b.label })),
                  ]}
                  placeholder="（廠牌）"
                  ariaLabel="對應廠牌"
                  onChange={(v) => updateOne(idx, { partBrandId: v || null })}
                />
              </div>
              <input
                value={o.oemCode}
                onChange={(e) => updateOne(idx, { oemCode: e.target.value })}
                placeholder="正廠料號"
                className="w-44 rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2 py-1.5 font-mono text-sm text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
              />
              <input
                value={o.remark ?? ''}
                onChange={(e) => updateOne(idx, { remark: e.target.value || null })}
                placeholder="備註（如 Golf 7 用）"
                className="min-w-[8rem] flex-1 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-1.5 text-sm text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
              />
              <button
                type="button"
                onClick={() => removeOne(idx)}
                className="inline-flex size-7 items-center justify-center rounded-md border border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:bg-[#2A1818]"
                title="移除此筆"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function renderBrowseValue(
  key: string,
  raw: unknown,
  refOptions: PartFormZonedProps['refOptions'],
): string {
  if (raw == null || raw === '') return '—';
  if (key === 'isOem') return raw ? '正廠件' : '副廠件';
  if (key === 'type') {
    return PART_TYPE_OPTIONS.find((o) => o.value === String(raw))?.label ?? String(raw);
  }
  if (key === 'purchaseCategory') {
    return PURCHASE_CATEGORY_OPTIONS.find((o) => o.value === String(raw))?.label ?? String(raw);
  }
  if (key === 'techCategory') {
    return TECH_CATEGORY_OPTIONS.find((o) => o.value === String(raw))?.label ?? String(raw);
  }
  if (key === 'returnPolicy') {
    return RETURN_POLICY_OPTIONS.find((o) => o.value === raw)?.label ?? String(raw);
  }
  const refKey = FK_REF_KEYS[key];
  if (refKey) {
    const opts = refOptions[refKey] ?? [];
    return opts.find((o) => o.value === String(raw))?.label ?? String(raw);
  }
  return String(raw);
}
