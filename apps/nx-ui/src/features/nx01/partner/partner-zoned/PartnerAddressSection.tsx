// apps/nx-ui/src/features/nx01/partner/partner-zoned/PartnerAddressSection.tsx
// 客戶地址衛星 picker UI（2026-06-23 執行長拍板接通）
//
// 後端 nx01_partner_address 早就齊（2026-06-06 A 軌 CP2）、本元件接通前端。
// 業務語意：
//   - SHIPPING 送貨地址：多筆、可標 isDefault；inline 編輯
//   - BILLING 帳單地址：一對一、最多一筆
//   - 縣市 / 鄉鎮走系統 listCities / listDistricts、不再用內碼字串
//
// MVP：明細用 freeformAddress 自由文字欄（schema 上 streetName/lane/alley/buildingNo/
// floor/roomNo 等分段欄位先不暴露 UI、純文字欄足夠日常 demo 使用）。
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Star, Trash2, X, Edit2, Check } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { listCities, listDistricts, type CityRow, type DistrictRow } from '@data/endpoints/shared/address/address-catalog-api';
import {
  createPartnerAddress,
  deletePartnerAddress,
  listPartnerAddresses,
  updatePartnerAddress,
  type PartnerAddressRow,
  type PartnerAddressWriteBody,
} from '@data/endpoints/shared/address/partner-address-api';

type AddressType = 'BILLING' | 'SHIPPING';

export type PartnerAddressSectionProps = {
  /** 當前選中客戶 id（瀏覽既有客戶才有；creating 時不渲染） */
  partnerId: string | null | undefined;
  /** 限定渲染哪一種地址（送貨 / 帳單）*/
  addressType: AddressType;
  /** 編輯模式才能 add / edit / delete */
  editing: boolean;
};

export function PartnerAddressSection({ partnerId, addressType, editing }: PartnerAddressSectionProps) {
  const [rows, setRows] = useState<PartnerAddressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    if (!partnerId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const all = await listPartnerAddresses(partnerId);
        if (cancelled) return;
        setRows(all.filter((r) => r.addressType === addressType));
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId, addressType, reloadTick]);

  const isShipping = addressType === 'SHIPPING';

  // BILLING 強制最多一筆、不顯示「新增」（除非完全沒有）
  const canAdd = isShipping || rows.length === 0;

  const handleSetDefault = useCallback(
    async (rowId: string) => {
      if (!partnerId) return;
      try {
        // 先把其他筆改 isDefault=false（client side loop）
        const others = rows.filter((r) => r.id !== rowId && r.isDefault);
        for (const o of others) {
          await updatePartnerAddress(partnerId, o.id, { isDefault: false });
        }
        await updatePartnerAddress(partnerId, rowId, { isDefault: true });
        reload();
      } catch (e) {
        alert(`設為預設失敗：${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [partnerId, rows, reload],
  );

  const handleDelete = useCallback(
    async (rowId: string) => {
      if (!partnerId) return;
      if (!confirm('確認刪除此地址？')) return;
      try {
        await deletePartnerAddress(partnerId, rowId);
        reload();
      } catch (e) {
        alert(`刪除失敗：${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [partnerId, reload],
  );

  if (!partnerId) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-4 text-xs text-muted-foreground">
        新增客戶時無法設地址、先儲存基本資料後再來設置 {isShipping ? '送貨地址' : '帳單地址'}。
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {isShipping ? '送貨地址（多筆、可標預設）' : '帳單地址（一對一）'}
        </h3>
        {editing && canAdd ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/10 px-2 text-[11px] font-semibold text-[#E8A020] transition-colors hover:bg-[#E8A020]/20"
          >
            <Plus className="size-3" />
            新增地址
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">載入中…</div>
      ) : rows.length === 0 && !adding ? (
        <div className="text-xs text-muted-foreground">尚未設置{isShipping ? '送貨地址' : '帳單地址'}。</div>
      ) : null}

      {rows.map((row) => (
        <div key={row.id}>
          {editingId === row.id ? (
            <AddressEditor
              partnerId={partnerId}
              addressType={addressType}
              initial={row}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                reload();
              }}
            />
          ) : (
            <AddressRow
              row={row}
              editing={editing}
              isShipping={isShipping}
              onEdit={() => setEditingId(row.id)}
              onSetDefault={() => handleSetDefault(row.id)}
              onDelete={() => handleDelete(row.id)}
            />
          )}
        </div>
      ))}

      {adding ? (
        <AddressEditor
          partnerId={partnerId}
          addressType={addressType}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

/* ─── 單筆地址列（瀏覽顯示） ───────────────────────── */
function AddressRow({
  row,
  editing,
  isShipping,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  row: PartnerAddressRow;
  editing: boolean;
  isShipping: boolean;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const cityName = row.city?.name ?? '';
  const districtName = row.district?.name ?? '';
  const summary = [cityName, districtName, row.freeformAddress ?? ''].filter(Boolean).join(' ') || '（未填）';
  return (
    <div className="flex items-start gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {row.label ? (
            <span className="text-[11px] font-semibold text-foreground">{row.label}</span>
          ) : null}
          {row.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#E8A020]/45 bg-[#E8A020]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#E8A020]">
              <Star className="size-3" />
              預設
            </span>
          ) : null}
          {row.postalCode ? (
            <span className="font-mono text-[10px] text-muted-foreground">{row.postalCode}</span>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-sm text-foreground/90">{summary}</div>
        {row.recipientName || row.recipientPhone ? (
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            收件人：{row.recipientName ?? '—'} · {row.recipientPhone ?? '—'}
          </div>
        ) : null}
      </div>
      {editing ? (
        <div className="flex flex-none gap-1">
          {isShipping && !row.isDefault ? (
            <button
              type="button"
              onClick={onSetDefault}
              title="設為預設地址"
              className="grid size-7 place-items-center rounded-md border border-border bg-background/60 text-muted-foreground transition-colors hover:border-[#E8A020]/45 hover:bg-[#E8A020]/10 hover:text-[#E8A020]"
            >
              <Star className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onEdit}
            title="編輯"
            className="grid size-7 place-items-center rounded-md border border-border bg-background/60 text-muted-foreground transition-colors hover:border-[#E8A020]/45 hover:bg-[#E8A020]/10 hover:text-[#E8A020]"
          >
            <Edit2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="刪除"
            className="grid size-7 place-items-center rounded-md border border-border bg-background/60 text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ─── 地址編輯器（新增 / 編輯共用） ───────────────────────── */
function AddressEditor({
  partnerId,
  addressType,
  initial,
  onCancel,
  onSaved,
}: {
  partnerId: string;
  addressType: AddressType;
  initial?: PartnerAddressRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [cityId, setCityId] = useState<string>(initial?.cityId ?? '');
  const [districtId, setDistrictId] = useState<string>(initial?.districtId ?? '');
  const [postalCode, setPostalCode] = useState<string>(initial?.postalCode ?? '');
  const [freeform, setFreeform] = useState<string>(initial?.freeformAddress ?? '');
  const [recipientName, setRecipientName] = useState(initial?.recipientName ?? '');
  const [recipientPhone, setRecipientPhone] = useState(initial?.recipientPhone ?? '');
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [saving, setSaving] = useState(false);

  const [cities, setCities] = useState<CityRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);

  useEffect(() => {
    void listCities().then(setCities).catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    void listDistricts(cityId).then(setDistricts).catch(() => setDistricts([]));
  }, [cityId]);

  const districtMap = useMemo(() => new Map(districts.map((d) => [d.id, d] as const)), [districts]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body: PartnerAddressWriteBody = {
        label: label.trim() || null,
        cityId: cityId || null,
        districtId: districtId || null,
        postalCode: postalCode || null,
        freeformAddress: freeform.trim() || null,
        recipientName: recipientName.trim() || null,
        recipientPhone: recipientPhone.trim() || null,
        isDefault,
      };
      if (initial) {
        await updatePartnerAddress(partnerId, initial.id, body);
      } else {
        await createPartnerAddress(partnerId, { ...body, addressType });
      }
      onSaved();
    } catch (e) {
      alert(`儲存失敗：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }, [
    addressType,
    cityId,
    districtId,
    freeform,
    initial,
    isDefault,
    label,
    onSaved,
    partnerId,
    postalCode,
    recipientName,
    recipientPhone,
  ]);

  return (
    <div className="space-y-2 rounded-md border border-[#E8A020]/30 bg-background/40 p-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="標籤（例：公司、倉庫、總部）"
          className={fieldCls}
        />
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-foreground">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="size-3.5"
            />
            設為預設地址
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          className={fieldCls}
          value={cityId}
          onChange={(e) => {
            setCityId(e.target.value);
            setDistrictId('');
            setPostalCode('');
          }}
        >
          <option value="">縣市</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className={fieldCls}
          value={districtId}
          onChange={(e) => {
            const d = districtMap.get(e.target.value);
            setDistrictId(e.target.value);
            setPostalCode(d?.postalCode ?? '');
          }}
          disabled={!cityId}
        >
          <option value="">鄉鎮市區</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} {d.postalCode ?? ''}
            </option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={postalCode}
        readOnly
        placeholder="郵遞區號（選鄉鎮自動帶）"
        className={cn(fieldCls, 'opacity-70')}
      />
      <textarea
        value={freeform}
        onChange={(e) => setFreeform(e.target.value)}
        placeholder="路 / 巷 / 弄 / 號 / 樓 / 室"
        className={cn(fieldCls, 'h-16 py-2')}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="收件人姓名（選填）"
          className={fieldCls}
        />
        <input
          type="text"
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
          placeholder="收件人電話（選填）"
          className={fieldCls}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background/60 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-background/80"
        >
          <X className="size-3" />
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#22D88F]/40 bg-[#22D88F]/10 px-2 text-[11px] font-semibold text-[#22D88F] transition-colors hover:bg-[#22D88F]/20 disabled:opacity-50"
        >
          <Check className="size-3" />
          {saving ? '儲存中…' : initial ? '儲存' : '建立'}
        </button>
      </div>
    </div>
  );
}

const fieldCls =
  'h-9 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-sm text-[#E8E8EC] focus:border-[#22D88F]/40 focus:outline-none disabled:opacity-50';
