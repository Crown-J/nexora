'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { fetchAllPages } from '@/shared/api/fetchAllPages';
import { listPartner } from '@/features/shared/master/partner/api/partner';
import type { PartnerDto } from '@/features/shared/master/partner/types';
import {
  listLookupLocation,
  listLookupPart,
  listLookupWarehouse,
  type LookupLocationRow,
} from '@/features/shared/master/lookup/api/lookup';
import type { LookupRow } from '@/features/shared/master/lookup/types';

import { lookupStockBalance } from '@/features/nx03/stock-balance/api/lookup';

import { getRfq, listRfq } from '../../api/rfq';
import { getPo, listPo } from '../../api/po';
import { createRr } from '../../api/rr';
import type { RfqListRow, PoListRow } from '../../types';

type Source = 'direct' | 'rfq' | 'po';

// T2-c 進貨對齊批次 2026-06-07：明細加 7 個驗收欄位（schema/dto 已備齊）
// expectedQty 預設 = qty、actualQty 預設 null（驗收後填）、defectQty 預設 0
// batchNo 留空時後端會依 RR 日期+lineNo 自動產（YYYYMM + 3 碼）
// warrantyExpiredAt 留空時後端會依 part.warrantyMonths 自動算
const DEFECT_TYPE_LABEL: Record<'D' | 'F' | 'W' | 'O', string> = {
  D: 'D 外觀損壞',
  F: 'F 功能異常',
  W: 'W 規格不符',
  O: 'O 其他',
};

type Line = {
  key: string;
  partId: string;
  partNo: string;
  partName: string;
  /** T8 進貨對齊批次 2026-06-08：廠牌料號（lookup 或來源單據帶入、顯示用） */
  secCode?: string | null;
  locationId: string;
  qty: string;
  unitCost: string;
  poItemId?: string | null;
  rfqItemId?: string | null;
  // T2-c 驗收欄位（表單字串值、submit 時 parse）
  expectedQty: string;
  actualQty: string;
  defectQty: string;
  defectType: '' | 'D' | 'F' | 'W' | 'O';
  defectDesc: string;
  batchNo: string;
  warrantyExpiredAt: string;
};

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSupplier(p: PartnerDto): boolean {
  return p.partnerType === 'S';
}

export function RrNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [source, setSource] = useState<Source>('direct');
  const [rfqId, setRfqId] = useState<string | null>(null);
  const [poId, setPoId] = useState<string | null>(null);
  const [rfqRows, setRfqRows] = useState<RfqListRow[]>([]);
  const [poRows, setPoRows] = useState<PoListRow[]>([]);

  const [warehouseId, setWarehouseId] = useState('');
  const [whOpts, setWhOpts] = useState<LookupRow[]>([]);
  const [locOpts, setLocOpts] = useState<LookupLocationRow[]>([]);
  const [rrDate, setRrDate] = useState(todayYmd);
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<PartnerDto[]>([]);
  const [remark, setRemark] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [partQ, setPartQ] = useState('');
  const [partHits, setPartHits] = useState<LookupRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedDone, setSeedDone] = useState(false);
  // T4 進貨對齊批次 2026-06-08：驗收當下庫存
  // 純前端 join Nx03StockBalance（GET /nx03/stock-balance?partId=&warehouseId=）。
  // cache key=partId、value=onHandQty 或 null（=該倉從未進過此料）；
  // warehouseId 變化全清重 fetch（換倉庫等同重新查庫存）。
  const [stockMap, setStockMap] = useState<Record<string, number | null>>({});

  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then(setWhOpts)
      .catch(() => setWhOpts([]));
    fetchAllPages((page, pageSize) => listPartner({ page, pageSize }), { pageSize: 100, maxPages: 50 })
      .then((items) => setSuppliers(items.filter(isSupplier)))
      .catch(() => setSuppliers([]));
  }, []);

  useEffect(() => {
    if (source === 'rfq') {
      listRfq({ page: 1, pageSize: 100, status: 'R' })
        .then((r) => setRfqRows(r.data))
        .catch(() => setRfqRows([]));
    }
    if (source === 'po') {
      listPo({ page: 1, pageSize: 100, status: 'S' })
        .then((r) => setPoRows(r.data))
        .catch(() => setPoRows([]));
    }
  }, [source]);

  const applyFromRfq = useCallback(async (rid: string) => {
    setError(null);
    try {
      const d = await getRfq(rid);
      setRfqId(rid);
      setPoId(null);
      setSupplierId(d.supplierId ?? '');
      const next: Line[] = [];
      for (const it of d.items) {
        if (it.status !== 'R' || it.unitPrice == null) continue;
        next.push({
          key: `rfq-${it.id}`,
          partId: it.partId,
          partNo: it.partNo,
          partName: it.partName,
          secCode: it.secCode ?? null,
          locationId: '',
          qty: String(it.qty),
          unitCost: String(it.unitPrice),
          rfqItemId: it.id,
          poItemId: null,
          expectedQty: String(it.qty),
          actualQty: '',
          defectQty: '0',
          defectType: '',
          defectDesc: '',
          batchNo: '',
          warrantyExpiredAt: '',
        });
      }
      if (!next.length) {
        setError('此詢價單無「已回覆」且有單價之明細可帶入');
      }
      setLines(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入詢價單失敗');
    }
  }, []);

  const applyFromPo = useCallback(async (pid: string) => {
    setError(null);
    try {
      const d = await getPo(pid);
      setPoId(pid);
      setRfqId(d.rfqId);
      setSupplierId(d.supplierId);
      const next: Line[] = [];
      for (const it of d.items) {
        // 03 收尾 A 2026-06-08：剩餘可收扣除已取消量
        const remain = it.qty - it.receivedQty - (it.cancelledQty ?? 0);
        if (remain <= 0) continue;
        next.push({
          key: `po-${it.id}`,
          partId: it.partId,
          partNo: it.partNo,
          partName: it.partName,
          secCode: it.secCode ?? null,
          locationId: '',
          qty: String(remain),
          unitCost: String(it.unitCost),
          poItemId: it.id,
          rfqItemId: it.rfqItemId,
          expectedQty: String(remain),
          actualQty: '',
          defectQty: '0',
          defectType: '',
          defectDesc: '',
          batchNo: '',
          warrantyExpiredAt: '',
        });
      }
      if (!next.length) {
        setError('此採購單無剩餘可收數量');
      }
      setLines(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入採購單失敗');
    }
  }, []);

  useEffect(() => {
    if (seedDone) return;
    const qRfq = searchParams.get('rfq')?.trim();
    const qPo = searchParams.get('po')?.trim();
    if (qRfq) {
      setSource('rfq');
      setSeedDone(true);
      void applyFromRfq(qRfq);
    } else if (qPo) {
      setSource('po');
      setSeedDone(true);
      void applyFromPo(qPo);
    } else {
      setSeedDone(true);
    }
  }, [searchParams, seedDone, applyFromRfq, applyFromPo]);

  useEffect(() => {
    if (!warehouseId) {
      setLocOpts([]);
      return;
    }
    listLookupLocation({ warehouseId, isActive: true })
      .then(setLocOpts)
      .catch(() => setLocOpts([]));
  }, [warehouseId]);

  // T4：warehouseId 變化清空 cache（換倉 = 庫存全變）
  useEffect(() => {
    setStockMap({});
  }, [warehouseId]);

  // T4：lines 新增料件時、fetch 當下庫存（用 cache 避免重複打 API）
  useEffect(() => {
    if (!warehouseId) return;
    const missing = lines.map((l) => l.partId).filter((id) => id && !(id in stockMap));
    if (missing.length === 0) return;
    const uniq = Array.from(new Set(missing));
    let cancelled = false;
    void (async () => {
      // 平行 fetch（小批量、進貨單通常 < 20 行）
      const entries = await Promise.all(
        uniq.map(async (pid) => {
          try {
            const b = await lookupStockBalance(pid, warehouseId);
            return [pid, b?.onHandQty ?? null] as const;
          } catch {
            return [pid, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setStockMap((prev) => {
        const next = { ...prev };
        for (const [pid, qty] of entries) next[pid] = qty;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [lines, warehouseId, stockMap]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!partQ.trim()) {
        setPartHits([]);
        return;
      }
      void listLookupPart({ q: partQ, pageSize: 15 }).then(setPartHits).catch(() => setPartHits([]));
    }, 280);
    return () => clearTimeout(t);
  }, [partQ]);

  const defaultLoc = locOpts[0]?.id ?? '';

  const addPart = useCallback(
    (p: LookupRow) => {
      setLines((prev) => [
        ...prev,
        {
          key: `${p.id}-${Date.now()}`,
          partId: p.id,
          partNo: p.code,
          partName: p.name ?? '',
          // T8 進貨對齊批次 2026-06-08：lookup 帶廠牌料號（LookupRow.secCode optional、空值容忍）
          secCode: p.secCode ?? null,
          locationId: defaultLoc,
          qty: '1',
          unitCost: '0',
          poItemId: null,
          rfqItemId: null,
          expectedQty: '1',
          actualQty: '',
          defectQty: '0',
          defectType: '',
          defectDesc: '',
          batchNo: '',
          warrantyExpiredAt: '',
        },
      ]);
      setPartQ('');
      setPartHits([]);
    },
    [defaultLoc],
  );

  const submit = async () => {
    setError(null);
    if (!warehouseId.trim()) {
      setError('請選倉庫');
      return;
    }
    if (!supplierId.trim()) {
      setError('請選供應商');
      return;
    }
    if (!lines.length) {
      setError('至少一筆明細');
      return;
    }
    const items = [];
    for (const ln of lines) {
      const qty = Number(ln.qty);
      const unitCost = Number(ln.unitCost);
      if (!ln.locationId) {
        setError(`請為 ${ln.partNo} 選庫位`);
        return;
      }
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
        setError(`明細無效：${ln.partNo}`);
        return;
      }
      // T2-c：驗收欄位 parse + 業務規則前端守一道（後端 validateDefect 也守、雙保險）
      const expectedQty = ln.expectedQty.trim() ? Number(ln.expectedQty) : undefined;
      const actualQty = ln.actualQty.trim() === '' ? null : Number(ln.actualQty);
      const defectQty = ln.defectQty.trim() === '' ? 0 : Number(ln.defectQty);
      if (!Number.isFinite(defectQty) || defectQty < 0) {
        setError(`${ln.partNo} 瑕疵量無效`);
        return;
      }
      if (defectQty > 0) {
        if (!ln.defectType) {
          setError(`${ln.partNo} 瑕疵量>0 請選瑕疵類型`);
          return;
        }
        if (!ln.defectDesc.trim()) {
          setError(`${ln.partNo} 瑕疵量>0 請填瑕疵描述`);
          return;
        }
        if (actualQty != null && defectQty > actualQty) {
          setError(`${ln.partNo} 瑕疵量 ${defectQty} 超過實際量 ${actualQty}`);
          return;
        }
      }
      items.push({
        partId: ln.partId,
        locationId: ln.locationId,
        qty,
        unitCost,
        poItemId: ln.poItemId ?? undefined,
        rfqItemId: ln.rfqItemId ?? undefined,
        expectedQty,
        actualQty,
        defectQty,
        defectType: ln.defectType || null,
        defectDesc: ln.defectDesc.trim() || null,
        batchNo: ln.batchNo.trim() || null,
        warrantyExpiredAt: ln.warrantyExpiredAt.trim() || null,
      });
    }
    setSaving(true);
    try {
      const r = await createRr({
        warehouseId: warehouseId.trim(),
        rrDate,
        supplierId: supplierId.trim(),
        remark: remark.trim() || null,
        rfqId: rfqId ?? null,
        poId: poId ?? null,
        items,
      });
      router.push(`/dashboard/purchase/rr/${encodeURIComponent(r.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX01</p>
          <h1 className="text-xl font-semibold">新增進貨單</h1>
        </div>
        <Link href="/dashboard/purchase/rr" className="text-sm text-muted-foreground underline">
          返回
        </Link>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div>
      ) : null}

      <fieldset className="space-y-2 rounded-xl border border-border/70 p-4">
        <legend className="px-1 text-sm font-medium">來源</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="rr-src"
            checked={source === 'direct'}
            onChange={() => {
              setSource('direct');
              setRfqId(null);
              setPoId(null);
              setLines([]);
            }}
          />
          直接進貨
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="rr-src"
            checked={source === 'rfq'}
            onChange={() => {
              setSource('rfq');
              setPoId(null);
              setRfqId(null);
              setLines([]);
            }}
          />
          從詢價單帶入（已回覆）
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="rr-src"
            checked={source === 'po'}
            onChange={() => {
              setSource('po');
              setRfqId(null);
              setPoId(null);
              setLines([]);
            }}
          />
          從採購單帶入
        </label>
      </fieldset>

      {source === 'rfq' ? (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            選擇詢價單
            <select
              className="mt-1 w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={rfqId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setRfqId(v || null);
                if (v) void applyFromRfq(v);
              }}
            >
              <option value="">請選擇</option>
              {rfqRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.docNo} · {r.rfqDate} · {r.supplierName ?? '—'}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {source === 'po' ? (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            選擇採購單（已寄廠商）
            <select
              className="mt-1 w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={poId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setPoId(v || null);
                if (v) void applyFromPo(v);
              }}
            >
              <option value="">請選擇</option>
              {poRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.docNo} · {r.poDate} · {r.supplierName}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-border/70 bg-card/40 p-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          倉庫
          <select className="rounded-lg border bg-background px-3 py-2 text-sm" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">請選擇</option>
            {whOpts.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          進貨日期
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" value={rrDate} onChange={(e) => setRrDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
          供應商
          <select className="rounded-lg border bg-background px-3 py-2 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">請選擇</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
          備註
          <input className="rounded-lg border bg-background px-3 py-2 text-sm" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </label>
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 p-4">
        <h2 className="text-sm font-semibold">明細（可再調整；須先選倉以載入庫位）</h2>
        {source === 'direct' ? (
          <>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="搜尋零件…"
              value={partQ}
              onChange={(e) => setPartQ(e.target.value)}
              disabled={!warehouseId}
            />
            {partHits.length > 0 ? (
              <ul className="max-h-40 overflow-auto rounded-lg border text-sm">
                {partHits.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="w-full px-3 py-2 text-left hover:bg-muted" onClick={() => addPart(p)}>
                      {p.code} {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2">料號</th>
              <th className="py-2">庫位</th>
              <th className="py-2">數量</th>
              <th className="py-2">成本</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((ln) => {
              const patch = (k: keyof Line, v: string) =>
                setLines((p) => p.map((x) => (x.key === ln.key ? { ...x, [k]: v } : x)));
              const dq = Number(ln.defectQty);
              const showDefectDetail = Number.isFinite(dq) && dq > 0;
              // T4 進貨對齊批次 2026-06-08：當下庫存燈號（純前端讀 cache、不在 render 內 fetch）
              // cache 值：undefined=loading、null=該倉從未進過、number=onHandQty（可能負）
              const stock = stockMap[ln.partId];
              const stockLoading = stock === undefined;
              const stockText = stockLoading ? '查詢中…' : stock == null ? '未曾入庫' : `${stock}`;
              const stockTone =
                stockLoading ? 'text-muted-foreground' :
                stock == null ? 'text-muted-foreground' :
                stock < 0 ? 'text-destructive' :
                stock === 0 ? 'text-amber-400' :
                stock < 10 ? 'text-amber-300' :
                'text-emerald-400';
              return (
                <tr key={ln.key} className="border-t border-border/60 align-top">
                  <td className="py-2 font-mono text-xs" colSpan={5}>
                    <div className="grid grid-cols-[110px_140px_60px_70px_1fr_auto] items-start gap-2">
                      {/* T8 進貨對齊批次 2026-06-08：樣式 A — 我方料號主行 + 廠牌料號小字下行 */}
                      <span>
                        <div>{ln.partNo}</div>
                        {ln.secCode ? (
                          <div className="mt-0.5 text-[10px] font-normal text-muted-foreground" title="廠牌料號">
                            {ln.secCode}
                          </div>
                        ) : null}
                      </span>
                      <select
                        className="rounded border px-1 text-xs"
                        value={ln.locationId}
                        onChange={(e) => patch('locationId', e.target.value)}
                      >
                        <option value="">選庫位</option>
                        {locOpts.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.code}
                          </option>
                        ))}
                      </select>
                      <input
                        className="w-full rounded border px-1"
                        value={ln.qty}
                        onChange={(e) => patch('qty', e.target.value)}
                        title="進貨數量"
                      />
                      <input
                        className="w-full rounded border px-1"
                        value={ln.unitCost}
                        onChange={(e) => patch('unitCost', e.target.value)}
                        title="單位成本"
                      />
                      <span className="text-[10px] text-muted-foreground truncate">
                        {ln.partName}
                        {/* T4：當下庫存燈號（提示驗收人有沒有囤貨） */}
                        <span
                          className={`ml-2 font-mono ${stockTone}`}
                          title="此料件目前在本倉庫的庫存量（未含本次驗收）"
                        >
                          目前 {stockText}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="text-xs text-destructive underline"
                        onClick={() => setLines((p) => p.filter((x) => x.key !== ln.key))}
                      >
                        移除
                      </button>
                    </div>
                    {/* T2-c 進貨對齊批次 2026-06-07：驗收欄位（瑕疵 / 批號 / 保固到期）
                        子排顯示：預期/實際/瑕疵 + 條件式類型/描述。
                        批號 + 保固到期日留空時後端會自動產（YYYYMM+lineNo / part.warrantyMonths）。 */}
                    <div className="mt-2 grid gap-2 rounded-md border border-border/40 bg-muted/10 p-2 text-xs sm:grid-cols-[1fr_1fr_1fr_140px_140px]">
                      <label className="flex flex-col gap-0.5 text-muted-foreground">
                        預期量
                        <input
                          className="rounded border bg-background px-1 py-0.5"
                          value={ln.expectedQty}
                          onChange={(e) => patch('expectedQty', e.target.value)}
                          placeholder="預設 = 進貨量"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-muted-foreground">
                        實際量
                        <input
                          className="rounded border bg-background px-1 py-0.5"
                          value={ln.actualQty}
                          onChange={(e) => patch('actualQty', e.target.value)}
                          placeholder="驗收後填、留空=以數量為準"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-muted-foreground">
                        瑕疵量
                        <input
                          className="rounded border bg-background px-1 py-0.5"
                          value={ln.defectQty}
                          onChange={(e) => patch('defectQty', e.target.value)}
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-muted-foreground">
                        批號（可留空自動產）
                        <input
                          className="rounded border bg-background px-1 py-0.5"
                          value={ln.batchNo}
                          onChange={(e) => patch('batchNo', e.target.value)}
                          maxLength={30}
                          placeholder="YYYYMM + 流水"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-muted-foreground">
                        保固到期日（可留空自動算）
                        <input
                          type="date"
                          className="rounded border bg-background px-1 py-0.5"
                          value={ln.warrantyExpiredAt}
                          onChange={(e) => patch('warrantyExpiredAt', e.target.value)}
                        />
                      </label>
                      {showDefectDetail ? (
                        <>
                          <label className="flex flex-col gap-0.5 text-amber-300 sm:col-span-2">
                            瑕疵類型 <span className="text-amber-400">*</span>
                            <select
                              className="rounded border bg-background px-1 py-0.5 text-foreground"
                              value={ln.defectType}
                              onChange={(e) => patch('defectType', e.target.value)}
                            >
                              <option value="">請選</option>
                              {(['D', 'F', 'W', 'O'] as const).map((k) => (
                                <option key={k} value={k}>
                                  {DEFECT_TYPE_LABEL[k]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-0.5 text-amber-300 sm:col-span-3">
                            瑕疵描述 <span className="text-amber-400">*</span>
                            <input
                              className="rounded border bg-background px-1 py-0.5 text-foreground"
                              value={ln.defectDesc}
                              onChange={(e) => patch('defectDesc', e.target.value)}
                              maxLength={200}
                              placeholder="例：5 個外觀刮傷 / 1 個無法啟動"
                            />
                          </label>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        disabled={saving}
        onClick={() => void submit()}
      >
        {saving ? '建立中…' : '建立'}
      </button>
    </div>
  );
}
