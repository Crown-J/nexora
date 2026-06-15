// apps/nx-ui/src/app/dashboard/settings/system-param/page.tsx
// v1.2 對齊軌 C5 + C-FU：設定→系統參數頁面

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiJson } from '@data/api/client';

interface SystemParam {
  id: string;
  name: string;
  dataStartDate: string | null;
  creditOverdueDaysThreshold: number;
  quoteDefaultValidityDays: number;
}

export default function SystemParamPage() {
  const [data, setData] = useState<SystemParam | null>(null);
  const [dataStartDate, setDataStartDate] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState(false);
  const [savingValidity, setSavingValidity] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const reload = async () => {
    try {
      const r = await apiJson<SystemParam>('/settings/system-param');
      setData(r);
      setDataStartDate(r.dataStartDate?.slice(0, 10) ?? '');
      setValidityDays(String(r.quoteDefaultValidityDays ?? 30));
    } catch (e) {
      setErr(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const saveDataStartDate = async () => {
    setSavingDate(true);
    setErr(null);
    try {
      await apiJson('/settings/system-param/data-start-date', {
        method: 'PUT',
        body: JSON.stringify({ date: dataStartDate || null }),
      });
      setSavedAt(new Date().toLocaleTimeString());
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSavingDate(false);
    }
  };

  const saveValidityDays = async () => {
    setSavingValidity(true);
    setErr(null);
    try {
      await apiJson('/settings/system-param/quote-validity-days', {
        method: 'PUT',
        body: JSON.stringify({ days: Number(validityDays) }),
      });
      setSavedAt(new Date().toLocaleTimeString());
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSavingValidity(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SETTINGS · SYSTEM PARAM</p>
        <h1 className="text-2xl font-semibold tracking-tight">系統參數</h1>
        <p className="text-sm text-muted-foreground">
          負責人設定全公司共用的系統參數。
        </p>
      </header>

      {err ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{err}</div>
      ) : null}

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-sm font-semibold">⭐ 資料起算點（v1.2 §12.3）</h2>
        <p className="text-xs text-muted-foreground">
          設定後、起算點之前的歷史資料只進查詢、不計入報表分析。
          適用情境：「舊公司轉系統」客戶想保留歷史紀錄、但不要混淆新報表。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">
            <span className="block mb-1">起算日</span>
            <input
              type="date"
              value={dataStartDate}
              onChange={(e) => setDataStartDate(e.target.value)}
              className="rounded border bg-background px-2 py-1"
            />
          </label>
          <button
            onClick={() => void saveDataStartDate()}
            disabled={savingDate}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {savingDate ? '儲存中…' : '儲存'}
          </button>
          {dataStartDate ? (
            <button
              onClick={() => {
                setDataStartDate('');
                void saveDataStartDate();
              }}
              className="rounded border px-3 py-1.5 text-sm"
            >
              清空（無起算點）
            </button>
          ) : null}
        </div>
        <p className="text-[10px] text-muted-foreground">
          目前值：{data?.dataStartDate ? data.dataStartDate.slice(0, 10) : '（未設定、所有歷史都計入）'}
        </p>
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-sm font-semibold">📜 報價單預設有效期</h2>
        <p className="text-xs text-muted-foreground">
          開新報價單時、有效期欄位的預設天數（從開單日起算）。1~365 天。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">
            <span className="block mb-1">天數</span>
            <input
              type="number"
              min="1"
              max="365"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              className="w-24 rounded border bg-background px-2 py-1 tabular-nums"
            />
          </label>
          <button
            onClick={() => void saveValidityDays()}
            disabled={savingValidity}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {savingValidity ? '儲存中…' : '儲存'}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">目前值：{data?.quoteDefaultValidityDays ?? 30} 天</p>
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-sm font-semibold">💎 客戶等級毛利率（A/B/C/D）</h2>
        <p className="text-xs text-muted-foreground">
          客戶分 ABCD 4 等級、各等級對應毛利率（影響報價單最低售價警告）。
          屬主檔範圍、請到「主檔中心 → 客戶等級」管理。
        </p>
        <Link
          href="/dashboard/base/customer-grade"
          className="inline-block rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground"
        >
          前往客戶等級主檔 →
        </Link>
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-sm font-semibold">💬 詢價單客套話</h2>
        <p className="text-xs text-muted-foreground">
          詢價單產生文字時的開頭 / 結尾客套話、給業務 copy 到 LINE / Email 用。
          屬 NX02 進貨模組、請到該頁面設定。
        </p>
        <Link
          href="/dashboard/purchase/rfq"
          className="inline-block rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground"
        >
          前往進貨工作台 →
        </Link>
      </section>

      {savedAt ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          ✓ 最後儲存 {savedAt}
        </div>
      ) : null}
    </div>
  );
}
