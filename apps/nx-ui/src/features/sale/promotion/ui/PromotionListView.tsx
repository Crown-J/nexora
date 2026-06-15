// apps/nx-ui/src/features/sale/promotion/ui/PromotionListView.tsx
// F1-D 銷貨優惠價子系統 2026-06-08：促銷規則列表 + 建單對話框
//
// ⚠️ 此版為 F1-D 最簡 UI（讓業務員能建第一筆規則做測試）；
// scope picker 簡化為 select + free text scopeId；F1-E 引擎軌會升級成 partId/brandId/groupId picker。

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createPromotion, listPromotion } from '../api/promotion';
import {
  type CreatePromotionPayload,
  type CreatePromotionScopePayload,
  type Promotion,
  type ScopeType,
  SCOPE_TYPE_LABEL,
} from '@data/types/sale/promotion';
import { ScopePicker } from './ScopePicker';

function todayYmd(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function PromotionListView() {
  const router = useRouter();
  const [rows, setRows] = useState<Promotion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPromotion({
        page: 1,
        pageSize: 50,
        isActive: filterActive === '' ? undefined : filterActive === 'true',
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filterActive]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (payload: CreatePromotionPayload) => {
    try {
      const created = await createPromotion(payload);
      setShowCreate(false);
      router.push(`/dashboard/sale/promotion/${encodeURIComponent(created.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '建單失敗');
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SALE</p>
          <h1 className="text-xl font-semibold">促銷規則</h1>
          <p className="text-xs text-muted-foreground">
            時段 × 商品範圍 × 絕對單價；同商品多優惠取最低、低於成本警示+必填理由。Alex Q1/Q2/Q4 拍板
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/sale/promotion/settings"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/50"
          >
            全域即期門檻
          </Link>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            + 新增促銷規則
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/20 p-3">
        <label className="text-xs text-muted-foreground">
          狀態
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as '' | 'true' | 'false')}
            className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">全部</option>
            <option value="true">啟用</option>
            <option value="false">停用</option>
          </select>
        </label>
        <span className="text-xs text-muted-foreground">共 {total} 筆</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">代碼</th>
              <th className="px-3 py-2 font-medium">名稱</th>
              <th className="px-3 py-2 text-right font-medium">優惠價</th>
              <th className="px-3 py-2 font-medium">時段</th>
              <th className="px-3 py-2 font-medium">範圍</th>
              <th className="px-3 py-2 font-medium">出清</th>
              <th className="px-3 py-2 text-right font-medium">滿 N 件</th>
              <th className="px-3 py-2 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  尚無促銷規則
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`/dashboard/sale/promotion/${encodeURIComponent(r.id)}`}
                      className="text-primary hover:underline"
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.priceOverride}</td>
                  <td className="px-3 py-2 tabular-nums text-xs">
                    {r.validFrom.slice(0, 10)} ~ {r.validTo.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.scopes && r.scopes.length > 0 ? (
                      <span title={r.scopes.map((s) => `${s.scopeType}: ${s.scopeId}`).join(', ')}>
                        {r.scopes.length} 項
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.isClearance ? (
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">出清</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.minBuyQty ?? '—'}</td>
                  <td className="px-3 py-2">
                    {r.isActive ? (
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">啟用</span>
                    ) : (
                      <span className="rounded bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">停用</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate ? <CreateDialog onCancel={() => setShowCreate(false)} onSubmit={handleCreate} /> : null}
    </div>
  );
}

function CreateDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (p: CreatePromotionPayload) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [priceOverride, setPriceOverride] = useState('');
  const [validFrom, setValidFrom] = useState(todayYmd());
  const [validTo, setValidTo] = useState(todayYmd(30));
  const [isClearance, setIsClearance] = useState(false);
  const [minBuyQty, setMinBuyQty] = useState('');
  const [remark, setRemark] = useState('');
  const [scopes, setScopes] = useState<CreatePromotionScopePayload[]>([{ scopeType: 'P', scopeId: '' }]);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    code.trim().length > 0 &&
    name.trim().length > 0 &&
    priceOverride.trim().length > 0 &&
    Number(priceOverride) >= 0 &&
    validFrom &&
    validTo &&
    scopes.every((s) => s.scopeId.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border bg-card p-4 shadow-lg">
        <h2 className="text-lg font-semibold">新增促銷規則</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          時段 × 商品範圍 × 絕對單價。範圍至少一筆：scopeType 選 P 料件 / B 品牌 / G 族群、scopeId 貼對應主檔 ID。
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <label className="block">
            <span className="text-xs text-muted-foreground">代碼 *</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="例：SPRING2026"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs uppercase"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">名稱 *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：2026 春季新品優惠"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">優惠價 *（絕對單價）</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">滿 N 件條件（選填）</span>
            <input
              type="number"
              min={0}
              step="1"
              value={minBuyQty}
              onChange={(e) => setMinBuyQty(e.target.value)}
              placeholder="留空 = 無限制"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">生效起期 *</span>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">生效迄期 *</span>
            <input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
          <label className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={isClearance}
              onChange={(e) => setIsClearance(e.target.checked)}
            />
            <span className="text-xs">出清旗標（報表分類用）</span>
          </label>
          <label className="col-span-2 block">
            <span className="text-xs text-muted-foreground">備註</span>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              maxLength={200}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1"
            />
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">商品範圍 *（至少一筆、可多選混搭）</p>
            <button
              type="button"
              onClick={() => setScopes((p) => [...p, { scopeType: 'P', scopeId: '' }])}
              className="rounded border border-border px-2 py-0.5 text-xs hover:border-primary/50"
            >
              + 加範圍
            </button>
          </div>
          {scopes.map((s, i) => (
            <div key={i} className="grid grid-cols-[140px_1fr_60px] gap-2 text-sm">
              <select
                value={s.scopeType}
                onChange={(e) =>
                  setScopes((p) =>
                    p.map((x, idx) =>
                      idx === i ? { ...x, scopeType: e.target.value as ScopeType, scopeId: '' } : x,
                    ),
                  )
                }
                className="rounded-md border bg-background px-2 py-1"
              >
                <option value="P">P {SCOPE_TYPE_LABEL.P}</option>
                <option value="B">B {SCOPE_TYPE_LABEL.B}</option>
                <option value="G">G {SCOPE_TYPE_LABEL.G}</option>
              </select>
              {/* F1-E 2026-06-09：scope picker（取代手動 ID 輸入） */}
              <ScopePicker
                scopeType={s.scopeType}
                value={s.scopeId}
                onChange={(id) =>
                  setScopes((p) => p.map((x, idx) => (idx === i ? { ...x, scopeId: id } : x)))
                }
              />
              <button
                type="button"
                disabled={scopes.length <= 1}
                onClick={() => setScopes((p) => p.filter((_, idx) => idx !== i))}
                className="text-xs text-destructive disabled:opacity-30"
              >
                移除
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm">
            取消
          </button>
          <button
            type="button"
            disabled={busy || !canSubmit}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  code: code.trim().toUpperCase(),
                  name: name.trim(),
                  priceOverride,
                  validFrom,
                  validTo,
                  isClearance,
                  minBuyQty: minBuyQty.trim() || undefined,
                  remark: remark.trim() || undefined,
                  scopes,
                });
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? '建立中…' : '建立'}
          </button>
        </div>
      </div>
    </div>
  );
}
