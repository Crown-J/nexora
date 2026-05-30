// apps/nx-ui/src/features/warehouse-zoned/WarehouseFormZoned.tsx
// v1.2 對齊軌 階段 E P4：warehouse 分區編輯共用 form
//
// 對齊 v1.1 §2.2：3 zone basic / inventory / delivery
// - basic：完整 16 欄（含結構化地址）
// - inventory：locations 衛星 P5
// - delivery：DELIVERY_VIEW_FIELD_KEYS 抽 basic 司機視角（純 view、無自己 fields）
//
// 結構化地址（cityId/districtId/streetId）目前無 picker endpoint、暫用 ID 文字輸入、P5 接 picker
'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import {
  DELIVERY_VIEW_FIELD_KEYS,
  WAREHOUSE_FIELDS,
  WAREHOUSE_ZONES,
  type WarehouseZone,
} from '@/features/master-zones';
import { FormField, FormInput } from '@/features/master-shell/ui/FormField';
import { KeyboardSelect } from '@/features/master-shell/ui/KeyboardSelect';

import type { WarehouseDraft } from './helpers';

export type RefOption = { value: string; label: string };

export type WarehouseFormZonedProps = {
  mode: 'browse' | 'edit';
  creating: boolean;
  draft: WarehouseDraft;
  setDraft: (next: WarehouseDraft) => void;
  activeZone: WarehouseZone;
  setActiveZone: (z: WarehouseZone) => void;
  /** v1.1 §1 可編 zones。undefined = 主檔中心、全 zone */
  editableZones?: Set<WarehouseZone>;
  refOptions: {
    siteId?: RefOption[];
    warehouseTypeId?: RefOption[];
    managerUserId?: RefOption[];
  };
};

const FK_REF_KEYS: Record<string, keyof WarehouseFormZonedProps['refOptions']> = {
  siteId: 'siteId',
  warehouseTypeId: 'warehouseTypeId',
  managerUserId: 'managerUserId',
};

export function WarehouseFormZoned({
  mode,
  creating,
  draft,
  setDraft,
  activeZone,
  setActiveZone,
  editableZones,
  refOptions,
}: WarehouseFormZonedProps) {
  const editing = mode === 'edit';

  const visibleZones = useMemo<Set<WarehouseZone>>(
    () => editableZones ?? new Set(WAREHOUSE_ZONES.map((z) => z.zone)),
    [editableZones],
  );

  const visibleZoneList = useMemo(
    () => WAREHOUSE_ZONES.filter((z) => visibleZones.has(z.zone)),
    [visibleZones],
  );

  const safeActiveZone = visibleZones.has(activeZone)
    ? activeZone
    : visibleZoneList[0]?.zone ?? 'basic';

  // delivery zone 抽自 basic 的司機視角欄位（純 view、唯讀）
  const fieldsForZone = useMemo(() => {
    if (safeActiveZone === 'delivery') {
      return WAREHOUSE_FIELDS.filter(
        (f) => f.zone === 'basic' && DELIVERY_VIEW_FIELD_KEYS.includes(f.key),
      );
    }
    return WAREHOUSE_FIELDS.filter((f) => f.zone === safeActiveZone);
  }, [safeActiveZone]);

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
        {safeActiveZone === 'delivery' ? (
          <span className="ml-auto text-[10px] text-[#5A5A60]">
            配送視角：抽自基本資料的地址欄位、純 view、編輯請回基本資料區
          </span>
        ) : null}
      </div>

      {/* fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fieldsForZone.map((f) => {
          // inventory locations 衛星 P5
          if (f.isSatellite) {
            return (
              <div key={f.key} className="sm:col-span-2">
                <FormField
                  label={`${f.label}（子表）`}
                  value={`P5 啟用：${f.notes ?? ''}（v1.1 §3.3）`}
                  dim
                />
              </div>
            );
          }

          // delivery zone 抽出的欄位永遠 browse-only
          const isDeliveryView = safeActiveZone === 'delivery';
          const zoneEditable = editableZones ? editableZones.has(f.zone) : true;
          const lockedNow = editing && !creating && f.key === 'code';
          const fieldEditable = editing && zoneEditable && !lockedNow && !isDeliveryView;

          // FK ref
          const refKey = FK_REF_KEYS[f.key];
          if (refKey && fieldEditable) {
            const opts = refOptions[refKey] ?? [];
            return (
              <FieldShell key={f.key} label={f.label} required={f.required}>
                <KeyboardSelect
                  value={String(draft[f.key] ?? '')}
                  options={[
                    ...(f.required ? [] : [{ value: '', label: '（未指定）' }]),
                    ...opts.map((o) => ({ value: o.value, label: o.label })),
                  ]}
                  ariaLabel={f.label}
                  onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                />
              </FieldShell>
            );
          }

          // isMain toggle
          if (f.key === 'isMain' && fieldEditable) {
            const on = Boolean(draft[f.key]);
            return (
              <FieldShell key={f.key} label={f.label}>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, [f.key]: !on })}
                  className={cn(
                    'inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors',
                    on
                      ? 'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020]'
                      : 'border-[#5A5A60]/40 bg-[#0A0A0C] text-[#888892]',
                  )}
                >
                  {on ? '主倉' : '非主倉'}
                </button>
              </FieldShell>
            );
          }

          // city/district/street 結構化地址：picker 待 PRO、暫文字輸入
          if (
            fieldEditable &&
            (f.key === 'cityId' || f.key === 'districtId' || f.key === 'streetId')
          ) {
            return (
              <FormInput
                key={f.key}
                label={`${f.label}（暫文字、PRO picker）`}
                value={String(draft[f.key] ?? '')}
                onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                placeholder="輸入 ID 字串"
              />
            );
          }

          // 一般文字 / 數字輸入
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

          // 瀏覽 / locked / delivery view / 非 editable
          const raw = draft[f.key];
          const display = renderBrowseValue(f.key, raw, refOptions);
          return (
            <FormField
              key={f.key}
              label={f.label}
              value={display}
              mono={f.key === 'code'}
              tone={
                f.key === 'isMain'
                  ? (raw ? 'amber' : 'muted')
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
  refOptions: WarehouseFormZonedProps['refOptions'],
): string {
  if (raw == null || raw === '') return '—';
  if (key === 'isMain') return raw ? '主倉' : '非主倉';
  const refKey = FK_REF_KEYS[key];
  if (refKey) {
    const opts = refOptions[refKey] ?? [];
    return opts.find((o) => o.value === String(raw))?.label ?? String(raw);
  }
  return String(raw);
}
