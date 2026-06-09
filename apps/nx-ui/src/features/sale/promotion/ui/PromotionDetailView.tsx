// apps/nx-ui/src/features/sale/promotion/ui/PromotionDetailView.tsx
// F1-D 銷貨優惠價子系統 2026-06-08：促銷規則詳細頁（讀+簡單編輯）
// 更完整的 scope picker（partId/brandId/groupId 真實 lookup）留 F1-E 引擎軌升級。

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { getPromotion, replacePromotionScopes, updatePromotion, voidPromotion } from '../api/promotion';
import {
  type CreatePromotionScopePayload,
  type Promotion,
  type ScopeType,
  SCOPE_TYPE_LABEL,
} from '../types';
import { ScopePicker } from './ScopePicker';

export function PromotionDetailView({ id }: { id: string }) {
  const [doc, setDoc] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    name: string;
    priceOverride: string;
    validFrom: string;
    validTo: string;
    isClearance: boolean;
    minBuyQty: string;
    remark: string;
  } | null>(null);
  const [scopeDraft, setScopeDraft] = useState<CreatePromotionScopePayload[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getPromotion(id);
      setDoc(r);
      setScopeDraft(r.scopes?.map((s) => ({ scopeType: s.scopeType, scopeId: s.scopeId })) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (error || !doc) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        {error ?? '找不到促銷規則'}
      </div>
    );
  }

  const startEdit = () => {
    setEditing({
      name: doc.name,
      priceOverride: doc.priceOverride,
      validFrom: doc.validFrom.slice(0, 10),
      validTo: doc.validTo.slice(0, 10),
      isClearance: doc.isClearance,
      minBuyQty: doc.minBuyQty ?? '',
      remark: doc.remark ?? '',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await updatePromotion(doc.id, {
        name: editing.name.trim(),
        priceOverride: editing.priceOverride,
        validFrom: editing.validFrom,
        validTo: editing.validTo,
        isClearance: editing.isClearance,
        minBuyQty: editing.minBuyQty.trim() || null,
        remark: editing.remark.trim() || null,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '存檔失敗');
    } finally {
      setBusy(false);
    }
  };

  const saveScopes = async () => {
    setBusy(true);
    setError(null);
    try {
      await replacePromotionScopes(doc.id, scopeDraft.filter((s) => s.scopeId.trim().length > 0));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '範圍存檔失敗');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    setError(null);
    try {
      if (doc.isActive) {
        if (!confirm('停用此促銷規則？引擎將不再套用。')) {
          setBusy(false);
          return;
        }
        await voidPromotion(doc.id);
      } else {
        await updatePromotion(doc.id, { isActive: true });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">促銷規則</p>
          <h1 className="text-xl font-semibold">{doc.code}</h1>
          <p className="text-sm text-muted-foreground">
            {doc.name} · {doc.validFrom.slice(0, 10)} ~ {doc.validTo.slice(0, 10)} · 優惠價 {doc.priceOverride}
            {doc.isClearance ? ' · 🏷️ 出清' : ''}
          </p>
        </div>
        <Link href="/dashboard/sale/promotion" className="text-sm text-muted-foreground underline">
          返回
        </Link>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveEdit()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              存檔
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(null)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={startEdit}
              className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium"
            >
              編輯表頭
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleActive()}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                doc.isActive
                  ? 'border-destructive/50 text-destructive'
                  : 'border-emerald-500/50 text-emerald-300'
              }`}
            >
              {doc.isActive ? '停用' : '啟用'}
            </button>
          </>
        )}
      </div>

      {/* 表頭 */}
      <section className="rounded-xl border border-border/70 bg-card/40 p-4">
        <h2 className="mb-3 text-sm font-semibold">表頭</h2>
        {editing ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-xs text-muted-foreground">名稱</span>
              <input
                value={editing.name}
                onChange={(e) => setEditing((p) => (p ? { ...p, name: e.target.value } : p))}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">優惠價</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={editing.priceOverride}
                onChange={(e) => setEditing((p) => (p ? { ...p, priceOverride: e.target.value } : p))}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">生效起期</span>
              <input
                type="date"
                value={editing.validFrom}
                onChange={(e) => setEditing((p) => (p ? { ...p, validFrom: e.target.value } : p))}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">生效迄期</span>
              <input
                type="date"
                value={editing.validTo}
                onChange={(e) => setEditing((p) => (p ? { ...p, validTo: e.target.value } : p))}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">滿 N 件條件</span>
              <input
                type="number"
                min={0}
                value={editing.minBuyQty}
                onChange={(e) => setEditing((p) => (p ? { ...p, minBuyQty: e.target.value } : p))}
                placeholder="留空 = 無限制"
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 tabular-nums"
              />
            </label>
            <label className="flex items-center gap-2 self-end">
              <input
                type="checkbox"
                checked={editing.isClearance}
                onChange={(e) => setEditing((p) => (p ? { ...p, isClearance: e.target.checked } : p))}
              />
              <span className="text-xs">出清旗標</span>
            </label>
            <label className="col-span-2 block">
              <span className="text-xs text-muted-foreground">備註</span>
              <input
                value={editing.remark}
                onChange={(e) => setEditing((p) => (p ? { ...p, remark: e.target.value } : p))}
                maxLength={200}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div><span className="text-xs text-muted-foreground">代碼：</span><span className="font-mono">{doc.code}</span></div>
            <div><span className="text-xs text-muted-foreground">名稱：</span>{doc.name}</div>
            <div><span className="text-xs text-muted-foreground">優惠價：</span><span className="tabular-nums">{doc.priceOverride}</span></div>
            <div><span className="text-xs text-muted-foreground">時段：</span><span className="tabular-nums text-xs">{doc.validFrom.slice(0, 10)} ~ {doc.validTo.slice(0, 10)}</span></div>
            <div><span className="text-xs text-muted-foreground">出清：</span>{doc.isClearance ? '是' : '否'}</div>
            <div><span className="text-xs text-muted-foreground">滿 N 件：</span>{doc.minBuyQty ?? '—'}</div>
            <div className="col-span-2 sm:col-span-3"><span className="text-xs text-muted-foreground">備註：</span>{doc.remark ?? '—'}</div>
          </div>
        )}
      </section>

      {/* 範圍 */}
      <section className="rounded-xl border border-border/70 bg-card/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">商品範圍（多對多）</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScopeDraft((p) => [...p, { scopeType: 'P', scopeId: '' }])}
              className="rounded border border-border px-2 py-0.5 text-xs"
            >
              + 加範圍
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveScopes()}
              className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              存範圍
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {scopeDraft.length === 0 ? (
            <p className="text-xs text-muted-foreground">尚無範圍、按「+ 加範圍」</p>
          ) : (
            scopeDraft.map((s, i) => (
              <div key={i} className="grid grid-cols-[140px_1fr_60px] gap-2 text-sm">
                <select
                  value={s.scopeType}
                  onChange={(e) =>
                    setScopeDraft((p) =>
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
                    setScopeDraft((p) => p.map((x, idx) => (idx === i ? { ...x, scopeId: id } : x)))
                  }
                />
                <button
                  type="button"
                  onClick={() => setScopeDraft((p) => p.filter((_, idx) => idx !== i))}
                  className="text-xs text-destructive"
                >
                  移除
                </button>
              </div>
            ))
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          ⚠️ 改範圍後請按上方「存範圍」整批送出（範式：整批取代）
        </p>
      </section>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        💡 引擎邏輯（F1-E 進行中）：銷貨開單時、逐項商品查有無套用中促銷規則 → 帶入優惠價；
        同商品多優惠取最低（含客戶分級價）；優惠價低於成本 → 警示+必填 belowMinReason、放行。
      </div>
    </div>
  );
}
