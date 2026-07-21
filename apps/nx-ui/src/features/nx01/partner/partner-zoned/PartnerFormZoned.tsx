// apps/nx-ui/src/features/partner-zoned/PartnerFormZoned.tsx
// v1.2 對齊軌 階段 E P2：partner 分區編輯共用 form 元件
//
// 對齊：
// - 決策 3.1：依 partnerType 動態顯示 zones（visibleZonesByPartnerType）
// - 決策 3.3：衛星表（shippingAddresses / billingAddress）目前顯示「P5 啟用」placeholder
// - v1.1 §1：editable zone subset 內欄位才放開編輯、其他 zones 即使顯示也唯讀
//
// 用於 3 種場景：
//   1) 主檔中心 partner 編輯頁（顯示全 zone、依 partnerType 動態過濾）
//   2) 模組頁面 — 銷貨客戶（visibleZones = basic + sales）
//   3) 模組頁面 — 採購供應商 / 財務帳戶（visibleZones = basic + finance）
'use client';

import { useMemo } from 'react';

import { cn } from '@design/utils/cn';
import {
  PARTNER_FIELDS,
  PARTNER_ZONES,
  type PartnerZone,
  visibleZonesByPartnerType,
} from '@/features/nx01/shell/zones';
import { FormField, FormInput } from '@/features/nx01/shell/ui/FormField';
import { KeyboardSelect } from '@/features/nx01/shell/ui/KeyboardSelect';
import { SatelliteSection } from '@/features/nx01/shell/satellite/SatelliteSection';
import { PartnerAddressSection } from './PartnerAddressSection';
import { PartnerAccountSection } from './PartnerAccountSection';

import {
  CREDIT_STATUS_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  INVOICE_COPIES_OPTIONS,
  PARTNER_TYPE_LABEL,
  PARTNER_TYPE_OPTIONS,
  PAY_DOM_OPTIONS,
  PAY_IMP_OPTIONS,
  type PartnerDraft,
} from './helpers';

export type RefOption = { value: string; label: string };

export type PartnerFormZonedProps = {
  mode: 'browse' | 'edit';
  creating: boolean;
  draft: PartnerDraft;
  setDraft: (next: PartnerDraft) => void;
  /** 當前 zone tab */
  activeZone: PartnerZone;
  setActiveZone: (z: PartnerZone) => void;
  /**
   * 可編 zones 子集（v1.1 §1：本頁可編欄位）
   * - undefined = 主檔中心、按 partnerType 動態
   * - Set = 模組頁面固定（例：銷貨 basic+sales）
   */
  editableZones?: Set<PartnerZone>;
  /** 外鍵下拉選項 */
  refOptions: {
    customerGradeId?: RefOption[];
    supplierGradeId?: RefOption[];
    defaultWarehouseId?: RefOption[];
    salesUserId?: RefOption[];
    defaultCurrencyId?: RefOption[];
  };
  /** 2026-06-23：當前選中客戶 id（送貨/帳單地址衛星 picker 用） */
  selectedPartnerId?: string | null;
};

const FK_REF_KEYS: Record<string, keyof PartnerFormZonedProps['refOptions']> = {
  customerGradeId: 'customerGradeId',
  supplierGradeId: 'supplierGradeId',
  defaultWarehouseId: 'defaultWarehouseId',
  salesUserId: 'salesUserId',
  defaultCurrencyId: 'defaultCurrencyId',
};

export function PartnerFormZoned({
  mode,
  creating,
  draft,
  setDraft,
  activeZone,
  setActiveZone,
  editableZones,
  refOptions,
  selectedPartnerId,
}: PartnerFormZonedProps) {
  const editing = mode === 'edit';
  const partnerType = String(draft.partnerType ?? '').toUpperCase();

  /** 主檔中心（editableZones=undefined）→ 顯示 zones 動態 by partnerType；模組頁 → 固定 */
  const visibleZones = useMemo<Set<PartnerZone>>(
    () => editableZones ?? visibleZonesByPartnerType(partnerType),
    [editableZones, partnerType],
  );

  const visibleZoneList = useMemo(
    () => PARTNER_ZONES.filter((z) => visibleZones.has(z.zone)),
    [visibleZones],
  );

  // activeZone 若不在 visible 內、refocus 第一個（partnerType 改變導致）
  const safeActiveZone = visibleZones.has(activeZone)
    ? activeZone
    : visibleZoneList[0]?.zone ?? 'basic';

  const fieldsForZone = useMemo(
    () => PARTNER_FIELDS.filter((f) => f.zone === safeActiveZone),
    [safeActiveZone],
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
        {/* 動態 zones 提示（主檔中心 + 非 C/O 時、顯示「依身分隱藏 X 區」） */}
        {!editableZones && visibleZones.size < PARTNER_ZONES.length ? (
          <span className="ml-auto text-[10px] text-[#5A5A60]">
            身分「{PARTNER_TYPE_LABEL[partnerType as keyof typeof PARTNER_TYPE_LABEL] ?? '？'}」
            隱藏 {PARTNER_ZONES.length - visibleZones.size} 區
          </span>
        ) : null}
      </div>

      {/* 區內欄位 grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fieldsForZone.map((f) => {
          // 衛星表：partner 兩組地址（送貨多筆 / 帳單一筆）
          // 2026-06-23 執行長拍板接通、PartnerAddressSection 接 nx01_partner_address。
          if (f.isSatellite) {
            // 帳戶閘門 v1.3：往來帳戶衛星區（R 收款/P 進貨付款/T 調貨付款）
            if (f.key === 'accounts') {
              return (
                <div key={f.key} className="sm:col-span-2">
                  <PartnerAccountSection
                    partnerId={selectedPartnerId ?? null}
                    editing={editing}
                    partnerType={String(draft.partnerType ?? '')}
                    canTransferStock={Boolean(draft.canTransferStock)}
                  />
                </div>
              );
            }
            const addressType =
              f.key === 'shippingAddresses' ? 'SHIPPING'
              : f.key === 'billingAddress' ? 'BILLING'
              : null;
            if (addressType) {
              return (
                <div key={f.key} className="sm:col-span-2">
                  <PartnerAddressSection
                    partnerId={selectedPartnerId ?? null}
                    addressType={addressType}
                    editing={editing}
                  />
                </div>
              );
            }
            return (
              <div key={f.key} className="sm:col-span-2">
                <SatelliteSection
                  title={f.label}
                  description={`衛星表 ${f.satelliteName ?? ''}；${f.notes ?? ''}`}
                  status="backend-missing"
                  hint="closure 後續軌"
                />
              </div>
            );
          }

          // 該欄位是否在 editable zones 內（為 false 則 browse-only）
          const zoneEditable = editableZones
            ? editableZones.has(f.zone)
            : true; // 主檔中心：全部 zone 可編
          const lockedNow = editing && !creating && (f.key === 'code' || f.key === 'partnerType');
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
                  placeholder="請選擇..."
                  ariaLabel={f.label}
                  onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                />
              </FieldShell>
            );
          }

          // partnerType 編輯（新增時）
          if (f.key === 'partnerType' && fieldEditable) {
            return (
              <FieldShell key={f.key} label={f.label} required>
                <KeyboardSelect
                  value={String(draft[f.key] ?? 'C')}
                  options={PARTNER_TYPE_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                  ariaLabel={f.label}
                  onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                />
              </FieldShell>
            );
          }

          // paymentTermDomestic / paymentTermImport / creditStatus / defaultDeliveryType 靜態下拉
          if (fieldEditable && (
            f.key === 'paymentTermDomestic' ||
            f.key === 'paymentTermImport' ||
            f.key === 'creditStatus' ||
            f.key === 'defaultDeliveryType'
          )) {
            const opts =
              f.key === 'paymentTermDomestic'
                ? PAY_DOM_OPTIONS
                : f.key === 'paymentTermImport'
                  ? PAY_IMP_OPTIONS
                  : f.key === 'creditStatus'
                    ? CREDIT_STATUS_OPTIONS
                    : DELIVERY_TYPE_OPTIONS;
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

          // W4 [3-6] defaultInvoiceCopies 靜態下拉（2/3 聯）；散客 L 強制 2、UI 仍 render 但 service 端守門
          if (fieldEditable && f.key === 'defaultInvoiceCopies') {
            return (
              <FieldShell key={f.key} label={f.label}>
                <KeyboardSelect
                  value={String(draft[f.key] ?? '3')}
                  options={INVOICE_COPIES_OPTIONS.map((o) => ({
                    value: String(o.value),
                    label: o.label,
                  }))}
                  ariaLabel={f.label}
                  onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                />
              </FieldShell>
            );
          }

          // 布林 toggle（canTransferStock／isCashCustomer 帳戶閘門 v1.3）
          if ((f.key === 'canTransferStock' || f.key === 'isCashCustomer') && fieldEditable) {
            const on = Boolean(draft[f.key]);
            const onLabel = f.key === 'canTransferStock' ? '可調貨' : '現金客戶';
            const offLabel = f.key === 'canTransferStock' ? '不可調貨' : '記帳客戶（走收款帳戶）';
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
                  {on ? onLabel : offLabel}
                </button>
              </FieldShell>
            );
          }

          // 文字輸入（地址/備註長文 → 跨 2 欄、詳細頁排版 2026-07-11 執行長拍板）
          const wide = f.key === 'address' || f.key === 'remark';
          if (fieldEditable) {
            return (
              <div key={f.key} className={wide ? 'sm:col-span-2' : undefined}>
                <FormInput
                  label={f.label + (f.required ? ' *' : '')}
                  value={String(draft[f.key] ?? '')}
                  onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                />
              </div>
            );
          }

          // 瀏覽 / locked / 非 editable zone 顯示（code/name 主識別 emphasis、詳細頁排版 2026-07-11）
          const raw = draft[f.key];
          const display = renderBrowseValue(f.key, raw, refOptions);
          return (
            <div key={f.key} className={wide ? 'sm:col-span-2' : undefined}>
              <FormField
                label={f.label}
                value={display}
                mono={f.key === 'code' || f.key === 'taxId'}
                emphasis={f.key === 'code' || f.key === 'name'}
                tone={
                  f.key === 'canTransferStock'
                    ? (raw ? 'green' : 'muted')
                    : f.key === 'creditStatus'
                      ? (String(raw) === 'F' ? 'red' : String(raw) === 'W' ? 'amber' : undefined)
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

function renderBrowseValue(
  key: string,
  raw: unknown,
  refOptions: PartnerFormZonedProps['refOptions'],
): string {
  if (raw == null || raw === '') return '—';
  if (key === 'canTransferStock') return raw ? '可調貨' : '不可調貨';
  if (key === 'isCashCustomer') return raw ? '現金客戶' : '記帳客戶';
  if (key === 'partnerType') {
    return PARTNER_TYPE_LABEL[String(raw).toUpperCase() as keyof typeof PARTNER_TYPE_LABEL] ?? String(raw);
  }
  if (key === 'paymentTermDomestic') return PAY_DOM_OPTIONS.find((o) => o.value === raw)?.label ?? String(raw);
  if (key === 'paymentTermImport') return PAY_IMP_OPTIONS.find((o) => o.value === raw)?.label ?? String(raw);
  if (key === 'creditStatus') return CREDIT_STATUS_OPTIONS.find((o) => o.value === raw)?.label ?? String(raw);
  if (key === 'defaultDeliveryType') return DELIVERY_TYPE_OPTIONS.find((o) => o.value === raw)?.label ?? String(raw);
  const refKey = FK_REF_KEYS[key];
  if (refKey) {
    const opts = refOptions[refKey] ?? [];
    return opts.find((o) => o.value === String(raw))?.label ?? String(raw);
  }
  return String(raw);
}
