'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';
import { LookupAutocomplete } from '@/shared/ui/lookup/LookupAutocomplete';
import { getWarehouseSingle } from '@/features/nx00/warehouse/api/warehouse';
import { listLocation } from '@/features/nx00/location/api/location';
import { listPartner } from '@/features/nx00/partner/api/partner';
import { listPart } from '@/features/nx00/part/api/part';
import type { LocationDto } from '@/features/nx00/location/types';
import type { PartnerDto } from '@/features/nx00/partner/types';
import type { PartDto } from '@/features/nx00/part/types';
import type { WarehouseDto } from '@/features/nx00/warehouse/types';

type StockRfqItem = {
  partId: string | null;
  partSearch: string;
  qty: string;
  unitPrice: string;
  leadTimeDays: string;
};

type CreatedRfq = {
  id: string;
  docNo: string;
  status: string;
  items: Array<{ id: string; partId: string }>;
};

type CreatedPo = {
  id: string;
  docNo: string;
  status: string;
};

function defaultTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StockReplenishmentPage() {
  const [step, setStep] = useState<'rfq' | 'po' | 'posted'>('rfq');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [warehouseCode, setWarehouseCode] = useState<string | null>(null);
  const [warehouseDisplay, setWarehouseDisplay] = useState<string>('');
  const [warehouseRow, setWarehouseRow] = useState<WarehouseDto | null>(null);
  const [warehouseSearch, setWarehouseSearch] = useState('');

  const [rfqDocNo, setRfqDocNo] = useState('');
  const [poDocNo, setPoDocNo] = useState('');
  const [poDate, setPoDate] = useState(defaultTodayIso());
  const [rfqDate, setRfqDate] = useState(defaultTodayIso());

  const [rfqSeq, setRfqSeq] = useState('00001');
  const [poSeq, setPoSeq] = useState('00001');
  const yearMonth = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
  }, []);

  const buildDocNo = (typeCode: string, seq: string) => {
    const whCode = warehouseCode ?? '----';
    const seq5 = String(seq).padStart(5, '0').slice(-5);
    return `${typeCode}${yearMonth}${whCode}${seq5}`;
  };

  const computedRfqDocNo = warehouseCode ? buildDocNo('R', rfqSeq) : '';
  const computedPoDocNo = warehouseCode ? buildDocNo('P', poSeq) : '';

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [items, setItems] = useState<StockRfqItem[]>([
    { partId: null, partSearch: '', qty: '10', unitPrice: '185.5000', leadTimeDays: '7' },
  ]);

  const [createdRfq, setCreatedRfq] = useState<CreatedRfq | null>(null);

  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState('');

  const [createdPo, setCreatedPo] = useState<CreatedPo | null>(null);

  useEffect(() => {
    let alive = true;
    getWarehouseSingle()
      .then((w: WarehouseDto | null) => {
        if (!alive) return;
        if (!w) return;
        setWarehouseId(w.id);
        setWarehouseCode(w.code);
        setWarehouseDisplay(`${w.code} ${w.name}`);
        setWarehouseRow(w);
        setWarehouseSearch(`${w.code} ${w.name}`);
      })
      .catch(() => {
        // 無法取得倉庫時先不阻擋頁面顯示，使用者手動處理
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!computedRfqDocNo) return;
    setRfqDocNo(computedRfqDocNo);
  }, [computedRfqDocNo]);

  useEffect(() => {
    if (!computedPoDocNo) return;
    setPoDocNo(computedPoDocNo);
  }, [computedPoDocNo]);

  const canCreateRfq = useMemo(() => {
    if (!rfqDocNo.trim()) return false;
    if (!supplierId) return false;
    if (items.length === 0) return false;
    return items.every((it) => it.partId && it.qty.trim() && it.unitPrice.trim());
  }, [items, rfqDocNo, supplierId]);

  const canCreatePo = useMemo(() => {
    if (!createdRfq?.id) return false;
    if (!poDocNo.trim()) return false;
    if (!poDate.trim()) return false;
    if (!warehouseId) return false;
    return true;
  }, [createdRfq?.id, poDate, poDocNo, warehouseId]);

  const canPostPo = useMemo(() => {
    return !!createdPo?.id;
  }, [createdPo?.id]);

  async function handleCreateRfq() {
    setErrMsg(null);
    if (!canCreateRfq) return;

    setLoading(true);
    try {
      const body = {
        docNo: rfqDocNo,
        rfqDate,
        supplierId: supplierId!,
        contactName: contactName.trim() || null,
        contactPhone: contactPhone.trim() || null,
        currency: 'TWD',
        remark: null,
        items: items.map((it) => ({
          partId: it.partId!,
          qty: it.qty,
          unitPrice: it.unitPrice,
          leadTimeDays: it.leadTimeDays.trim() ? Number(it.leadTimeDays) : null,
          remark: null,
        })),
      };

      const res = await apiFetch('/nx01/rfq', { method: 'POST', body: JSON.stringify(body) });
      await assertOk(res, 'nxui_nx01_rfq_create_001');
      const data = (await res.json()) as CreatedRfq;

      setCreatedRfq(data);
      setStep('po');
    } catch (e: any) {
      setErrMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePo() {
    setErrMsg(null);
    if (!canCreatePo || !createdRfq?.id) return;

    setLoading(true);
    try {
      const body = {
        docNo: poDocNo,
        poDate,
        warehouseId: warehouseId!,
        locationId: locationId ?? null,
        currency: 'TWD',
        remark: null,
      };

      const res = await apiFetch(`/nx01/rfq/${encodeURIComponent(createdRfq.id)}/to-po`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await assertOk(res, 'nxui_nx01_rfq_to_po_001');
      const data = (await res.json()) as CreatedPo;

      setCreatedPo(data);
      setStep('posted');
    } catch (e: any) {
      setErrMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handlePostPo() {
    setErrMsg(null);
    if (!canPostPo || !createdPo?.id) return;

    setLoading(true);
    try {
      const res = await apiFetch(`/nx01/po/${encodeURIComponent(createdPo.id)}/post`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await assertOk(res, 'nxui_nx01_po_post_001');
      const data = (await res.json()) as CreatedPo;
      setCreatedPo(data);
    } catch (e: any) {
      setErrMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">庫存補貨流程（詢價單 → 採購單 → 入庫）</h1>
        <p className="mt-1 text-sm text-white/60">
          供應商詢價後建立詢價單，確認項目後自動產生進貨單（採購單），並可在到貨後執行採購過帳。
        </p>
      </div>

      {errMsg ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {errMsg}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
        <div className="text-xs text-white/50">步驟</div>
        <div className="mt-2 flex gap-2 text-sm">
          <StepPill active={step === 'rfq'} label="1. 建立詢價單" />
          <StepPill active={step === 'po'} label="2. 產生採購單" />
          <StepPill active={step === 'posted'} label="3. 採購過帳（入庫）" />
        </div>
      </div>

      {step === 'rfq' ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 space-y-4">
          <div>
            <div className="text-sm font-medium">詢價單基本資料</div>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="text-sm">
                單據編號（R）
                <input value={rfqDocNo} readOnly className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                流水號（5碼）
                <input
                  value={rfqSeq}
                  onChange={(e) => setRfqSeq(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                詢價日期
                <input value={rfqDate} onChange={(e) => setRfqDate(e.target.value)} type="date" className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                供應商
                <PartnerAutocomplete
                  value={supplierSearch}
                  onValueChange={(next) => {
                    setSupplierSearch(next);
                    setSupplierId(null);
                  }}
                  allowedTypes={['SUP', 'BOTH']}
                  onPick={(row) => {
                    setSupplierId(row.id);
                    setSupplierSearch(`${row.code} ${row.name}`);
                  }}
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                聯絡人
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                聯絡電話
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm" />
              </label>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">詢價明細（詢價結果）</div>
            <div className="mt-3 space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-5">
                  <label className="text-sm md:col-span-1">
                    料號（CODE+NAME）
                    <PartAutocomplete
                      value={it.partSearch}
                      onValueChange={(nextValue) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], partSearch: nextValue, partId: null };
                        setItems(next);
                      }}
                      onPick={(row) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], partId: row.id, partSearch: `${row.code} ${row.name}` };
                        setItems(next);
                      }}
                    />
                  </label>
                  <label className="text-sm">
                    數量
                    <input
                      value={it.qty}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], qty: e.target.value };
                        setItems(next);
                      }}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    單價
                    <input
                      value={it.unitPrice}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], unitPrice: e.target.value };
                        setItems(next);
                      }}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    交期（天）
                    <input
                      value={it.leadTimeDays}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], leadTimeDays: e.target.value };
                        setItems(next);
                      }}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70 hover:bg-black/35"
                      disabled={items.length <= 1}
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() =>
                  setItems((prev) => [...prev, { partId: null, partSearch: '', qty: '1', unitPrice: '0', leadTimeDays: '0' }])
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70 hover:bg-black/35"
              >
                + 新增明細
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleCreateRfq}
              disabled={loading || !canCreateRfq}
              className="rounded-2xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
            >
              {loading ? '處理中…' : '建立詢價單'}
            </button>
          </div>
        </section>
      ) : null}

      {step !== 'rfq' && createdRfq ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 space-y-4">
          <div className="text-sm">
            已建立詢價單：<span className="text-white/90">{createdRfq.docNo}</span>（狀態：{createdRfq.status}）
          </div>

          {step === 'po' || step === 'posted' ? (
            <div>
              <div className="text-sm font-medium">採購單基本資料（由詢價單產生）</div>
              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-4">
                <label className="text-sm">
                  採購單號（P）
                  <input value={poDocNo} readOnly className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm">
                  流水號（5碼）
                  <input
                    value={poSeq}
                    onChange={(e) => setPoSeq(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  進貨日期
                  <input value={poDate} onChange={(e) => setPoDate(e.target.value)} type="date" className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm">
                  倉庫
                  <WarehouseAutocomplete
                    warehouse={warehouseRow}
                    value={warehouseSearch}
                    onValueChange={setWarehouseSearch}
                    onPick={(row) => {
                      setWarehouseId(row.id);
                      setWarehouseSearch(`${row.code} ${row.name}`);
                    }}
                  />
                </label>
                <label className="text-sm">
                  庫位（可選）
                  <LocationAutocomplete
                    value={locationSearch}
                    onValueChange={(nextValue) => {
                      setLocationSearch(nextValue);
                      setLocationId(null);
                    }}
                    warehouseId={warehouseId}
                    onPick={(row) => {
                      setLocationId(row.id);
                      setLocationSearch(`${row.code} ${row.name ?? ''}`.trim());
                    }}
                  />
                </label>
              </div>

              {step === 'po' ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleCreatePo}
                    disabled={loading || !canCreatePo}
                    className="rounded-2xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
                  >
                    {loading ? '處理中…' : '產生採購單'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 'posted' ? (
            <div className="pt-2">
              <div className="text-sm">
                進貨單：
                {createdPo ? (
                  <span className="ml-2 text-white/90">
                    {createdPo.docNo}（狀態：{createdPo.status}）
                  </span>
                ) : (
                  <span className="ml-2 text-white/60">尚未產生採購單</span>
                )}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={handlePostPo}
                  disabled={loading || !canPostPo}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-white/80 disabled:opacity-60"
                >
                  {loading ? '處理中…' : '到貨入庫（採購過帳）'}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function StepPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={[
        'rounded-full border px-3 py-1.5 text-xs',
        active ? 'border-[#39ff14]/35 bg-[#39ff14]/10 text-white' : 'border-white/10 bg-black/25 text-white/70',
      ].join(' ')}
    >
      {label}
    </div>
  );
}

type PartnerAutocompleteProps = {
  value: string;
  onValueChange: (next: string) => void;
  allowedTypes: PartnerDto['partnerType'][];
  onPick: (row: PartnerDto) => void;
};

function PartnerAutocomplete(props: PartnerAutocompleteProps) {
  const { value, onValueChange, allowedTypes, onPick } = props;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<PartnerDto[]>([]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!open) return;
      const q = value.trim();
      if (!q) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await listPartner({ q, page: 1, pageSize: 10 });
        if (!alive) return;
        const filtered = (res.items ?? []).filter((x) => allowedTypes.includes(x.partnerType));
        setOptions(filtered);
      } catch {
        if (!alive) return;
        setOptions([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    const t = window.setTimeout(run, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [open, value, allowedTypes]);

  return (
    <LookupAutocomplete<PartnerDto>
      value={value}
      onChange={onValueChange}
      options={options}
      open={open}
      onOpenChange={setOpen}
      loading={loading}
      placeholder="搜尋（CODE / NAME）"
      emptyText="找不到資料"
      getKey={(row) => row.id}
      renderOption={(row) => (
        <span className="text-white/90">
          {row.code} {row.name}
        </span>
      )}
      onPick={(row) => onPick(row)}
    />
  );
}

type PartAutocompleteProps = {
  value: string;
  onValueChange: (next: string) => void;
  onPick: (row: PartDto) => void;
};

function PartAutocomplete(props: PartAutocompleteProps) {
  const { value, onValueChange, onPick } = props;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<PartDto[]>([]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!open) return;
      const q = value.trim();
      if (!q) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await listPart({ q, page: 1, pageSize: 10 });
        if (!alive) return;
        setOptions(res.items ?? []);
      } catch {
        if (!alive) return;
        setOptions([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    const t = window.setTimeout(run, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [open, value]);

  return (
    <LookupAutocomplete<PartDto>
      value={value}
      onChange={onValueChange}
      options={options}
      open={open}
      onOpenChange={setOpen}
      loading={loading}
      placeholder="搜尋料號（CODE / NAME）"
      emptyText="找不到料號"
      getKey={(row) => row.id}
      renderOption={(row) => (
        <span className="text-white/90">
          {row.code} {row.name}
        </span>
      )}
      onPick={(row) => onPick(row)}
    />
  );
}

type LocationAutocompleteProps = {
  value: string;
  onValueChange: (next: string) => void;
  warehouseId: string | null;
  onPick: (row: LocationDto) => void;
};

function LocationAutocomplete(props: LocationAutocompleteProps) {
  const { value, onValueChange, warehouseId, onPick } = props;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<LocationDto[]>([]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!open) return;
      if (!warehouseId) return;
      const q = value.trim();
      if (!q) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await listLocation({ q, page: 1, pageSize: 10, warehouseId });
        if (!alive) return;
        setOptions(res.items ?? []);
      } catch {
        if (!alive) return;
        setOptions([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    const t = window.setTimeout(run, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [open, value, warehouseId]);

  return (
    <LookupAutocomplete<LocationDto>
      value={value}
      onChange={onValueChange}
      options={options}
      open={open}
      onOpenChange={setOpen}
      loading={loading}
      disabled={!warehouseId}
      placeholder="搜尋庫位（CODE / NAME）"
      emptyText="找不到庫位"
      getKey={(row) => row.id}
      renderOption={(row) => (
        <span className="text-white/90">
          {row.code} {row.name ?? ''}
        </span>
      )}
      onPick={(row) => onPick(row)}
    />
  );
}

type WarehouseAutocompleteProps = {
  warehouse: WarehouseDto | null;
  value: string;
  onValueChange: (next: string) => void;
  onPick: (row: WarehouseDto) => void;
};

function WarehouseAutocomplete(props: WarehouseAutocompleteProps) {
  const { warehouse, value, onValueChange, onPick } = props;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 單倉（LITE）只提供一筆選項，仍使用 LookupAutocomplete 統一 UI。
  const options = warehouse ? [warehouse] : [];

  return (
    <LookupAutocomplete<WarehouseDto>
      value={value}
      onChange={onValueChange}
      options={options}
      open={open}
      onOpenChange={setOpen}
      loading={loading}
      disabled={!warehouse}
      placeholder="搜尋倉庫（CODE / NAME）"
      emptyText="找不到倉庫"
      getKey={(row) => row.id}
      renderOption={(row) => (
        <span className="text-white/90">
          {row.code} {row.name}
        </span>
      )}
      onPick={(row) => onPick(row)}
    />
  );
}

