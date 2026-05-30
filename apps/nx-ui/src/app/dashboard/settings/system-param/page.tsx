// apps/nx-ui/src/app/dashboard/settings/system-param/page.tsx
// v1.2 對齊軌 C5：設定→系統參數頁面

'use client';

import { useEffect, useState } from 'react';

import { apiJson } from '@/shared/api/client';

interface SystemParam {
  id: string;
  name: string;
  dataStartDate: string | null;
  creditOverdueDaysThreshold: number;
}

export default function SystemParamPage() {
  const [data, setData] = useState<SystemParam | null>(null);
  const [dataStartDate, setDataStartDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await apiJson<SystemParam>('/settings/system-param');
        setData(r);
        setDataStartDate(r.dataStartDate?.slice(0, 10) ?? '');
      } catch (e) {
        setErr(e instanceof Error ? e.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveDataStartDate = async () => {
    setSaving(true);
    setErr(null);
    try {
      await apiJson('/settings/system-param/data-start-date', {
        method: 'PUT',
        body: JSON.stringify({ date: dataStartDate || null }),
      });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setErr(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
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
          <br />
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
            disabled={saving}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {saving ? '儲存中…' : '儲存'}
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
          {savedAt ? <span className="text-xs text-emerald-700">已儲存 {savedAt}</span> : null}
        </div>
        <p className="text-[10px] text-muted-foreground">
          目前值：{data?.dataStartDate ? data.dataStartDate.slice(0, 10) : '（未設定、所有歷史都計入）'}
        </p>
      </section>

      <section className="rounded border p-4 space-y-3 opacity-60">
        <h2 className="text-sm font-semibold">其他系統參數（C 階段未做、列 FU）</h2>
        <ul className="ml-4 list-disc text-xs text-muted-foreground space-y-1">
          <li>客戶等級毛利率（A/B/C/D %）← 屬主檔範圍、由 customer_grade 設定</li>
          <li>詢價單客套話（開頭 / 結尾）← 已在進貨模組 rfq-greeting-template</li>
          <li>報價單預設有效期 ← FU-system-param-01</li>
        </ul>
      </section>
    </div>
  );
}
