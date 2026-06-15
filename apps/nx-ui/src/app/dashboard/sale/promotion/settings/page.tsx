// apps/nx-ui/src/app/dashboard/sale/promotion/settings/page.tsx
// F1-D 銷貨優惠價子系統 2026-06-08：全域即期門檻設定（Alex Q3 拍板）

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  getShelfLifeWarningDays,
  setShelfLifeWarningDays,
} from '@data/endpoints/sale/promotion/api/promotion';

export default function PromotionSettingsRoute() {
  const [days, setDays] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getShelfLifeWarningDays();
      setDays(r.shelfLifeWarningDays);
      setDraft(String(r.shelfLifeWarningDays));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const n = Number(draft);
    if (!Number.isInteger(n) || n < 0) {
      setError('門檻必須為 ≥ 0 的整數');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setShelfLifeWarningDays(n);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '存檔失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SALE · PROMOTION</p>
          <h1 className="text-xl font-semibold">全域即期門檻</h1>
          <p className="text-xs text-muted-foreground">
            進貨批號保固到期剩餘天數 &lt; 此值 → 標即期、引擎自動套即期類促銷規則
          </p>
        </div>
        <Link href="/dashboard/sale/promotion" className="text-sm text-muted-foreground underline">
          返回促銷列表
        </Link>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div>
      ) : null}

      <section className="max-w-md rounded-xl border border-border/70 bg-card/40 p-4 text-sm">
        {loading ? (
          <p className="text-muted-foreground">載入中…</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              目前設定：<span className="font-mono">{days ?? '—'}</span> 天
            </p>
            <label className="block">
              <span className="text-xs text-muted-foreground">門檻天數（整數、≥ 0）</span>
              <input
                type="number"
                min={0}
                step={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 tabular-nums"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              {busy ? '存檔中…' : '存檔'}
            </button>
          </>
        )}
      </section>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        💡 引擎用法（F1-E）：對 SO line 上的料件、查 Nx02RrItem.warrantyExpiredAt 跟今日距離；
        若剩餘 &lt; 門檻 → 視為即期品、自動套即期類促銷規則的優惠價。
      </div>
    </div>
  );
}
