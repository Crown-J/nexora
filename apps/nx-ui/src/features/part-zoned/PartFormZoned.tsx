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
  type PartZone,
} from '@/features/master-zones';
import { FormField, FormInput } from '@/features/master-shell/ui/FormField';
import { KeyboardSelect } from '@/features/master-shell/ui/KeyboardSelect';

import {
  PART_TYPE_OPTIONS,
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
    codeRuleId?: RefOption[];
    partBrandId?: RefOption[];
    partGroupId?: RefOption[];
    countryId?: RefOption[];
  };
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
}: PartFormZonedProps) {
  const editing = mode === 'edit';

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
    () => PART_FIELDS.filter((f) => f.zone === safeActiveZone),
    [safeActiveZone],
  );

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

      {/* zone 內欄位 grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fieldsForZone.map((f) => {
          // 衛星表（P5）
          if (f.isSatellite) {
            return (
              <div key={f.key} className="sm:col-span-2">
                <FormField
                  label={`${f.label}（子表）`}
                  value={`P5 啟用：${f.notes ?? ''}（v1.1 §3.3「預設 + 展開看全部」）`}
                  dim
                />
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
