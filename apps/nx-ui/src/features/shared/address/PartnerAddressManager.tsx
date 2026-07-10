// apps/nx-ui/src/features/shared/address/PartnerAddressManager.tsx
// 02 對齊第二批前端收尾軌 FE-CP2 2026-06-07：partner 地址 CRUD 編輯介面
//
// 業務範式：
//   - BILLING 收帳地址：同 partner 最多 1 筆（service + DB partial unique 守）
//   - SHIPPING 送貨地址：多筆、其中 1 筆 isDefault（SO 開單自動帶）
//   - 每筆地址支援國別分流（TW 字典 / 國外自由填）
'use client';

import { useCallback, useEffect, useState } from 'react';

import { AddressPicker, formatAddressOneLine, type AddressValue } from './AddressPicker';
import {
  createPartnerAddress,
  deletePartnerAddress,
  listPartnerAddresses,
  updatePartnerAddress,
  type PartnerAddressRow,
  type PartnerAddressWriteBody,
} from '@data/endpoints/shared/address/partner-address-api';

type EditingDraft = AddressValue & {
  id?: string;
  addressType: 'BILLING' | 'SHIPPING';
  label?: string | null;
  isDefault?: boolean;
  recipientName?: string | null;
  recipientPhone?: string | null;
  /** 發票抬頭（BILLING 用；空=用 partner 主檔抬頭）。偉盟設計檢視 P1-2 */
  invoiceTitle?: string | null;
  note?: string | null;
};

const btnPrimary =
  'rounded-md border border-[#22D88F]/40 bg-[#22D88F]/10 px-3 py-1.5 text-xs font-medium text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50';
const btnSecondary =
  'rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 py-1.5 text-xs font-medium text-[#888892] hover:text-[#E8E8EC]';
const btnDanger =
  'rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-2 py-1 text-[10px] font-medium text-[#E26060] hover:bg-[#E26060]/20';

export function PartnerAddressManager({ partnerId }: { partnerId: string }) {
  const [rows, setRows] = useState<PartnerAddressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingDraft | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await listPartnerAddresses(partnerId);
      setRows(list);
    } catch (e) {
      setErr((e as Error)?.message ?? 'load failed');
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startAdd = (addressType: 'BILLING' | 'SHIPPING') => {
    setEditing({ addressType, isDefault: addressType === 'BILLING' });
  };

  const startEdit = (r: PartnerAddressRow) => {
    setEditing({
      id: r.id,
      addressType: r.addressType,
      label: r.label,
      isDefault: r.isDefault,
      countryId: r.countryId,
      cityId: r.cityId,
      districtId: r.districtId,
      postalCode: r.postalCode,
      streetName: r.streetName,
      lane: r.lane,
      alley: r.alley,
      buildingNo: r.buildingNo,
      buildingSubNo: r.buildingSubNo,
      floor: r.floor,
      roomNo: r.roomNo,
      freeformAddress: r.freeformAddress,
      recipientName: r.recipientName,
      recipientPhone: r.recipientPhone,
      invoiceTitle: r.invoiceTitle,
      note: r.note,
    });
  };

  const save = async () => {
    if (!editing) return;
    setErr(null);
    const body: PartnerAddressWriteBody = {
      label: editing.label ?? null,
      isDefault: editing.isDefault ?? false,
      countryId: editing.countryId ?? null,
      cityId: editing.cityId ?? null,
      districtId: editing.districtId ?? null,
      postalCode: editing.postalCode ?? null,
      streetName: editing.streetName ?? null,
      lane: editing.lane ?? null,
      alley: editing.alley ?? null,
      buildingNo: editing.buildingNo ?? null,
      buildingSubNo: editing.buildingSubNo ?? null,
      floor: editing.floor ?? null,
      roomNo: editing.roomNo ?? null,
      freeformAddress: editing.freeformAddress ?? null,
      recipientName: editing.recipientName ?? null,
      recipientPhone: editing.recipientPhone ?? null,
      invoiceTitle: editing.invoiceTitle ?? null,
      note: editing.note ?? null,
    };
    try {
      if (editing.id) {
        await updatePartnerAddress(partnerId, editing.id, body);
      } else {
        await createPartnerAddress(partnerId, { ...body, addressType: editing.addressType });
      }
      setEditing(null);
      await reload();
    } catch (e) {
      setErr((e as Error)?.message ?? 'save failed');
    }
  };

  const removeAddr = async (r: PartnerAddressRow) => {
    if (!confirm(`刪除地址 ${r.label ?? r.addressType}？`)) return;
    setErr(null);
    try {
      await deletePartnerAddress(partnerId, r.id);
      await reload();
    } catch (e) {
      setErr((e as Error)?.message ?? 'delete failed');
    }
  };

  if (loading) return <div className="p-4 text-xs text-[#888892]">載入地址中…</div>;

  const billing = rows.filter((r) => r.addressType === 'BILLING');
  const shipping = rows.filter((r) => r.addressType === 'SHIPPING');

  return (
    <div className="space-y-6">
      {err ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 p-3 text-xs text-[#E26060]">{err}</div>
      ) : null}

      {/* 收帳地址（最多 1 筆） */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">收帳地址（最多 1 筆）</h3>
          {billing.length === 0 ? (
            <button type="button" className={btnPrimary} onClick={() => startAdd('BILLING')}>
              + 新增收帳地址
            </button>
          ) : null}
        </div>
        {billing.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#2A2A30] p-4 text-xs text-[#5A5A60]">尚未設定</div>
        ) : (
          <div className="space-y-2">
            {billing.map((r) => (
              <AddressCard key={r.id} row={r} onEdit={startEdit} onDelete={removeAddr} />
            ))}
          </div>
        )}
      </section>

      {/* 送貨地址（多筆 + isDefault） */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
            送貨地址（多筆 + 預設、SO 開單自動帶）
          </h3>
          <button type="button" className={btnPrimary} onClick={() => startAdd('SHIPPING')}>
            + 新增送貨地址
          </button>
        </div>
        {shipping.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#2A2A30] p-4 text-xs text-[#5A5A60]">尚未設定</div>
        ) : (
          <div className="space-y-2">
            {shipping.map((r) => (
              <AddressCard key={r.id} row={r} onEdit={startEdit} onDelete={removeAddr} />
            ))}
          </div>
        )}
      </section>

      {/* 編輯 / 新增 dialog（簡易 inline modal） */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#2A2A30] bg-[#16161B] p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#E8E8EC]">
              {editing.id ? '編輯' : '新增'}
              {editing.addressType === 'BILLING' ? '收帳地址' : '送貨地址'}
            </h2>
            <div className="space-y-4">
              {editing.addressType === 'SHIPPING' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">
                      地址標籤
                    </label>
                    <input
                      type="text"
                      className="h-9 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-sm text-[#E8E8EC]"
                      value={editing.label ?? ''}
                      onChange={(e) => setEditing({ ...editing, label: e.target.value || null })}
                      placeholder="例：總公司 / 桃園倉"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-xs text-[#E8E8EC]">
                      <input
                        type="checkbox"
                        checked={Boolean(editing.isDefault)}
                        onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
                      />
                      設為預設送貨地址（SO 自動帶入）
                    </label>
                  </div>
                </div>
              ) : null}

              <AddressPicker
                value={editing}
                onChange={(next) => setEditing({ ...editing, ...next })}
              />

              {/* 偉盟設計檢視 P1-2：BILLING 該筆各自開票抬頭（空=用 partner 主檔抬頭→客戶名稱） */}
              {editing.addressType === 'BILLING' ? (
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">
                    發票抬頭
                  </label>
                  <input
                    type="text"
                    className="h-9 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-sm text-[#E8E8EC]"
                    value={editing.invoiceTitle ?? ''}
                    onChange={(e) => setEditing({ ...editing, invoiceTitle: e.target.value || null })}
                    placeholder="空＝用主檔發票抬頭（未設則用客戶名稱）"
                    maxLength={120}
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">收件人</label>
                  <input
                    type="text"
                    className="h-9 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-sm text-[#E8E8EC]"
                    value={editing.recipientName ?? ''}
                    onChange={(e) => setEditing({ ...editing, recipientName: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">收件電話</label>
                  <input
                    type="text"
                    className="h-9 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-sm text-[#E8E8EC]"
                    value={editing.recipientPhone ?? ''}
                    onChange={(e) => setEditing({ ...editing, recipientPhone: e.target.value || null })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">備註</label>
                <textarea
                  className="h-16 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 py-2 text-sm text-[#E8E8EC]"
                  value={editing.note ?? ''}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value || null })}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setEditing(null)}>
                取消
              </button>
              <button type="button" className={btnPrimary} onClick={() => void save()}>
                儲存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AddressCard({
  row,
  onEdit,
  onDelete,
}: {
  row: PartnerAddressRow;
  onEdit: (r: PartnerAddressRow) => void;
  onDelete: (r: PartnerAddressRow) => void;
}) {
  const oneLine = formatAddressOneLine(row, {
    countryName: row.country?.name,
    cityName: row.city?.name,
    districtName: row.district?.name,
  });
  return (
    <div className="rounded-md border border-[#2A2A30] bg-[#0A0A0C] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {row.label ? <span className="text-xs font-medium text-[#E8E8EC]">{row.label}</span> : null}
            {row.isDefault ? (
              <span className="rounded-full border border-[#22D88F]/40 bg-[#22D88F]/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#22D88F]">
                預設
              </span>
            ) : null}
          </div>
          <div className="text-xs text-[#B8B8C0]">{oneLine || '—'}</div>
          {row.recipientName || row.recipientPhone ? (
            <div className="text-[11px] text-[#5A5A60]">
              收件：{row.recipientName ?? ''} {row.recipientPhone ? `· ${row.recipientPhone}` : ''}
            </div>
          ) : null}
          {row.addressType === 'BILLING' && row.invoiceTitle ? (
            <div className="text-[11px] text-[#5A5A60]">發票抬頭：{row.invoiceTitle}</div>
          ) : null}
          {row.note ? <div className="text-[11px] text-[#5A5A60]">{row.note}</div> : null}
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" className="text-xs text-[#22D88F] hover:underline" onClick={() => onEdit(row)}>
            編輯
          </button>
          <button type="button" className={btnDanger} onClick={() => onDelete(row)}>
            刪除
          </button>
        </div>
      </div>
    </div>
  );
}
