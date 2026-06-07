// apps/nx-ui/src/features/part-zoned/PartFormZoned.tsx
// v1.2 對齊軌 階段 E P3：part 分區編輯共用 form 元件
//
// 對齊：
// - 決策 3.2（v1.1）：成本保密「不」做 service 層欄位過濾、靠兩道屏障
//   屏障 1：模組權限（進貨成本只放進貨頁、售價只放銷售頁）— 本元件 editableZones 落實
//   屏障 2：主檔中心存取權限（master.product.*）— 路由層 RBAC 負責、本元件不管
// - 決策 3.3：part 衛星表（oemCodes/relations/models/versions/stockSettings）目前 placeholder、P5 啟用
//
// 用於 4 種場景：
//   1) 主檔中心 part 編輯頁（全 4 zone）
//   2) 採購→產品管理（basic + purchase + inventory）
//   3) 銷貨→產品（basic + sales、新建、Alex 2026-05-30 拍板 sale.product.* 權限）
//   4) 庫存→產品維護（basic + inventory）
'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import {
  PART_FIELDS,
  PART_ZONES,
  isFieldVisibleAtPlan,
  normalizePlanTier,
  type PartZone,
} from '@/features/master-zones';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { FormField, FormInput } from '@/features/master-shell/ui/FormField';
import { KeyboardSelect } from '@/features/master-shell/ui/KeyboardSelect';
import { SatelliteSection } from '@/features/satellite/SatelliteSection';
import { StockSettingsSatellite } from './StockSettingsSatellite';
import type { PartDto, PartOemCodeItem } from '@/features/shared/master/part/types';
import type { BrandCodeRuleDto } from '@/features/base/api/brand-code-rule';
import { Calculator, Plus, X } from 'lucide-react';

import {
  PART_TYPE_OPTIONS,
  RETURN_POLICY_OPTIONS,
  type PartDraft,
} from './helpers';

/** A1：basic zone 的編碼規則 / 料號 / SEG 抽出特殊處理、不走通用 loop */
const SPECIAL_BASIC_KEYS = new Set(['codeRuleId', 'code', 'seg1', 'seg2', 'seg3', 'seg4', 'seg5']);

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
    codeRuleId?: RefOption[];
    partBrandId?: RefOption[];
    partGroupId?: RefOption[];
    countryId?: RefOption[];
  };
  /** v1.2 階段 E P5：衛星表渲染需要 part 主 row（id + oemCodes 等） */
  selected?: PartDto | null;
  /**
   * A1：編碼規則資料
   * - brandCodeRules：所有 active 編碼規則（PartZonedPage 載入）
   * - codePreview：依當前 draft 的 codeRuleId + seg1~5 + brand + country、server 端組好的料號預覽
   * - segLensFor：依 codeRuleId 回傳 [seg1Len, seg2Len, seg3Len, seg4Len, seg5Len]、0 表示該段不啟用
   */
  brandCodeRules?: BrandCodeRuleDto[];
  codePreview?: string;
  segLensFor?: (codeRuleId: string) => number[];
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
  codeRuleId: 'codeRuleId',
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
  brandCodeRules,
  codePreview,
  segLensFor,
  oemCodesDraft,
  onOemCodesChange,
  onRecalcPrices,
}: PartFormZonedProps) {
  const editing = mode === 'edit';

  // 02 第四批 軌 3a 2026-06-07：LITE 隱藏汽車資料庫套件欄位（編碼規則 / SEG / 車型適配）。
  // 載入未完成期間保守視為 LITE、避免 LITE 用戶 flicker 看到不該見的欄位。
  const { planCode } = useSessionMe();
  const currentPlan = normalizePlanTier(planCode);
  const isLite = currentPlan === 'LITE';

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
        // A1：basic zone 的編碼規則 / 料號 / SEG 用專屬區塊渲染、不走通用 loop
        if (safeActiveZone === 'basic' && SPECIAL_BASIC_KEYS.has(f.key)) return false;
        // 02 第四批 軌 3a 2026-06-07：版本門檻 — 低於 minPlan 的 UI 隱藏（資料保留）
        if (!isFieldVisibleAtPlan(f, currentPlan)) return false;
        return true;
      }),
    [safeActiveZone, currentPlan],
  );

  // A1：當前選的 codeRule（顯示「依規則 XX 字數限制」用）
  const selectedRule = useMemo(() => {
    const id = String(draft.codeRuleId ?? '');
    if (!id || !brandCodeRules) return null;
    return brandCodeRules.find((r) => r.id === id) ?? null;
  }, [draft.codeRuleId, brandCodeRules]);
  const segLens = useMemo(() => {
    if (!selectedRule || !segLensFor) return [0, 0, 0, 0, 0];
    return segLensFor(selectedRule.id);
  }, [selectedRule, segLensFor]);
  const lockedCodeNow = editing && !creating;

  return (
    <div className="flex flex-col gap-4">
      {/* Zone Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[#2A2A30] pb-px">
        {visibleZoneList.map((z) => {
          const active = z.zone === safeActiveZone;
          return (
            <button
              key={z.zone}
              type="button"
              onClick={() => setActiveZone(z.zone)}
              className={cn(
                'relative px-3 py-2 text-xs font-semibold tracking-[0.1em] uppercase transition-colors',
                active ? 'text-[#E8A020]' : 'text-[#888892] hover:text-[#E8E8EB]',
              )}
            >
              {z.label}
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[#E8A020]" />
              ) : null}
            </button>
          );
        })}
        {editableZones && visibleZones.size < PART_ZONES.length ? (
          <span className="ml-auto text-[10px] text-[#5A5A60]">
            本頁僅顯示 {visibleZones.size} 區、其他 {PART_ZONES.length - visibleZones.size} 區屬其他模組
          </span>
        ) : null}
      </div>

      {/* A1：basic zone 的編碼規則 + 料號 + SEG 分段輸入區（從舊版 PartMasterPage 移植）
            02 第四批 軌 3a：LITE 隱藏編碼規則 + SEG 分段（屬汽車資料庫套件）、保留料號 + 舊料號（核心） */}
      {safeActiveZone === 'basic' ? (
        <CodeRuleSection
          editing={editing}
          showCodeRuleAndSeg={!isLite}
          codeRuleId={String(draft.codeRuleId ?? '')}
          code={String(draft.code ?? '')}
          oldCode={String(draft.oldCode ?? '')}
          brandCodeRules={brandCodeRules ?? []}
          selectedRule={selectedRule}
          segLens={segLens}
          codePreview={codePreview ?? ''}
          segValues={[
            String(draft.seg1 ?? ''),
            String(draft.seg2 ?? ''),
            String(draft.seg3 ?? ''),
            String(draft.seg4 ?? ''),
            String(draft.seg5 ?? ''),
          ]}
          lockedCodeNow={lockedCodeNow}
          onCodeRuleChange={(v) =>
            setDraft({ ...draft, codeRuleId: v, seg1: '', seg2: '', seg3: '', seg4: '', seg5: '' })
          }
          onCodeChange={(v) => setDraft({ ...draft, code: v })}
          onOldCodeChange={(v) => setDraft({ ...draft, oldCode: v })}
          onSegChange={(i, v) => {
            const key = (['seg1', 'seg2', 'seg3', 'seg4', 'seg5'] as const)[i];
            setDraft({ ...draft, [key]: v });
          }}
        />
      ) : null}

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

          // priceUpdatedAt/By 永遠 browse-only（service 自動寫）
          if (f.key === 'priceUpdatedAt' || f.key === 'priceUpdatedBy') {
            return (
              <FormField
                key={f.key}
                label={f.label}
                value={String(draft[f.key] ?? '—') || '—'}
                mono={f.key === 'priceUpdatedAt'}
                dim
              />
            );
          }

          const zoneEditable = editableZones ? editableZones.has(f.zone) : true;
          const lockedNow = editing && !creating && f.key === 'code';
          const fieldEditable = editing && zoneEditable && !lockedNow;

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

          // returnPolicy / type 靜態下拉
          if (fieldEditable && (f.key === 'returnPolicy' || f.key === 'type')) {
            const opts = f.key === 'returnPolicy' ? RETURN_POLICY_OPTIONS : PART_TYPE_OPTIONS;
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

          // 文字輸入
          if (fieldEditable) {
            return (
              <FormInput
                key={f.key}
                label={f.label + (f.required ? ' *' : '')}
                value={String(draft[f.key] ?? '')}
                onChange={(v) => setDraft({ ...draft, [f.key]: v })}
              />
            );
          }

          // 瀏覽 / locked / 非 editable
          const raw = draft[f.key];
          const display = renderBrowseValue(f.key, raw, refOptions);
          return (
            <FormField
              key={f.key}
              label={f.label}
              value={display}
              mono={f.key === 'code' || f.key === 'oldCode'}
              tone={
                f.key === 'isOem'
                  ? (raw ? 'green' : 'muted')
                  : undefined
              }
            />
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
 * - relations / models / versions：endpoint /nx01/part-relations | part-models | part-versions（partId query）
 *   本軌只提供「endpoint 路徑」hint、實際 fetch + CRUD UI 列入 closure 後續軌
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

  // 3 個 endpoint 衛星：暫不接 fetch、顯示 endpoint 路徑 hint、CRUD UI 列入 closure 後續軌
  const endpointMap: Record<string, string> = {
    relations: '/nx01/part-relations?partIdFrom=…',
    models: '/nx01/part-models?partId=…',
    versions: '/nx01/part-versions?partId=…',
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
 * A1：編碼規則選擇 + 料號 + 舊料號 + 分段 SEG 輸入
 * 移植自舊版 PartMasterPage line 485-541
 * - 選了規則 → code 顯示為 server 預覽（唯讀）+ 顯示 SEG 分段輸入框（依規則字數限制）
 * - 未選規則 → code 手動輸入、SEG 區塊隱藏
 * - 編輯既有資料時 code 永遠鎖死
 */
function CodeRuleSection({
  editing,
  showCodeRuleAndSeg,
  codeRuleId,
  code,
  oldCode,
  brandCodeRules,
  selectedRule,
  segLens,
  codePreview,
  segValues,
  lockedCodeNow,
  onCodeRuleChange,
  onCodeChange,
  onOldCodeChange,
  onSegChange,
}: {
  editing: boolean;
  // 02 第四批 軌 3a 2026-06-07：LITE 不顯示編碼規則 / SEG 分段（屬汽車資料庫套件）
  showCodeRuleAndSeg: boolean;
  codeRuleId: string;
  code: string;
  oldCode: string;
  brandCodeRules: BrandCodeRuleDto[];
  selectedRule: BrandCodeRuleDto | null;
  segLens: number[];
  codePreview: string;
  segValues: string[];
  lockedCodeNow: boolean;
  onCodeRuleChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onOldCodeChange: (v: string) => void;
  onSegChange: (i: number, v: string) => void;
}) {
  const ruleOpts = brandCodeRules.map((r) => ({ value: r.id, label: r.name }));
  // LITE 模式：強制走「手動料號」路徑（即使 draft 已存 codeRuleId、預覽 widget 也不顯）
  const useAutoCode = showCodeRuleAndSeg && editing && Boolean(codeRuleId);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* 編碼規則（LITE 隱藏） */}
        {showCodeRuleAndSeg ? (
          editing ? (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
                編碼規則
              </span>
              <KeyboardSelect
                value={codeRuleId}
                options={[{ value: '', label: '（不套用、手動輸入料號）' }, ...ruleOpts]}
                placeholder="（不套用、手動輸入料號）"
                ariaLabel="編碼規則"
                onChange={onCodeRuleChange}
              />
            </div>
          ) : (
            <FormField label="編碼規則" value={selectedRule?.name ?? '（手動料號）'} />
          )
        ) : null}

        {/* 料號：(PLUS+ 選規則 → 預覽唯讀)；(未選 / LITE) 編輯中 → 手動輸入；鎖定中 → readonly */}
        {useAutoCode ? (
          <FormField label="料號（自動）" value={codePreview || '（輸入分段後預覽）'} mono />
        ) : editing && !lockedCodeNow ? (
          <FormInput label="料號 *" value={code} onChange={onCodeChange} />
        ) : (
          <FormField label="料號" value={code || '—'} mono />
        )}

        {/* 舊料號（轉系統客戶用） */}
        {editing ? (
          <FormInput label="舊料號" value={oldCode} onChange={onOldCodeChange} placeholder="轉系統客戶用" />
        ) : (
          <FormField label="舊料號" value={oldCode || '—'} mono />
        )}
      </div>

      {/* 分段 SEG 輸入（LITE 隱藏；PLUS+ 選了規則才出現） */}
      {showCodeRuleAndSeg && editing && selectedRule ? (
        <div className="rounded-lg border border-[#2A2A30] bg-[#0E0E12] p-3">
          <div className="mb-2 text-[11px] font-semibold text-[#B8B8C0]">
            分段輸入（依規則「{selectedRule.name}」字數限制）
          </div>
          <div className="flex flex-wrap gap-3">
            {segLens.map((maxLen, i) => {
              if (maxLen <= 0) return null;
              return (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-[10px] text-[#888892]">SEG{i + 1}（≤{maxLen}）</span>
                  <input
                    value={segValues[i]}
                    maxLength={maxLen}
                    onChange={(e) => onSegChange(i, e.target.value)}
                    className="w-24 rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2 py-1 font-mono text-sm text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 font-mono text-xs text-[#E8A020]">預覽：{codePreview || '—'}</div>
        </div>
      ) : null}

      {/* 瀏覽既有資料時的 SEG 顯示（LITE 隱藏） */}
      {showCodeRuleAndSeg && !editing && segValues.some((v) => v) ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {segValues.map((v, i) => (v ? <FormField key={i} label={`SEG${i + 1}`} value={v} mono /> : null))}
        </div>
      ) : null}
    </div>
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
