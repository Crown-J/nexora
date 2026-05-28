// apps/nx-ui/src/app/dashboard/nx02/rfq-greeting-template/page.tsx
// LITE 階段 1 M3：詢價客套話設定頁（每租戶 1:1、minimal settings form）

'use client';

import { useEffect, useState } from 'react';
import {
  getRfqGreetingTemplate,
  updateRfqGreetingTemplate,
  type RfqGreetingTemplateDto,
} from '@/features/nx02/rfq-greeting-template/api/rfq-greeting-template';

export default function RfqGreetingTemplatePage() {
  const [data, setData] = useState<RfqGreetingTemplateDto | null>(null);
  const [greeting, setGreeting] = useState('');
  const [closing, setClosing] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    getRfqGreetingTemplate()
      .then((row) => {
        if (canceled) return;
        setData(row);
        setGreeting(row.greetingContent);
        setClosing(row.closingContent);
      })
      .catch((e: Error) => !canceled && setError(e.message))
      .finally(() => !canceled && setLoading(false));
    return () => {
      canceled = true;
    };
  }, []);

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const row = await updateRfqGreetingTemplate({ greetingContent: greeting, closingContent: closing });
      setData(row);
      setMessage('已儲存');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-white/80">載入中…</div>;

  return (
    <div className="mx-auto max-w-3xl p-6 text-white">
      <h1 className="mb-2 text-2xl font-bold">詢價客套話設定</h1>
      <p className="mb-6 text-sm text-white/60">
        業務發起詢價時、系統會用「開頭客套話 + 料件清單 + 結尾客套話」產生純文字、業務可複製到 LINE/電話問供應商。
      </p>

      {error && <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">{error}</div>}
      {message && <div className="mb-4 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">{message}</div>}

      <div className="space-y-4">
        <label className="block">
          <div className="mb-1 text-sm text-white/80">開頭客套話 🟢</div>
          <textarea
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-white/30"
            rows={3}
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            maxLength={500}
            placeholder="您好、想詢價以下零件："
          />
          <div className="mt-1 text-xs text-white/40">最多 500 字</div>
        </label>

        <label className="block">
          <div className="mb-1 text-sm text-white/80">結尾客套話 🟢</div>
          <textarea
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-white/30"
            rows={3}
            value={closing}
            onChange={(e) => setClosing(e.target.value)}
            maxLength={500}
            placeholder="麻煩報價謝謝"
          />
          <div className="mt-1 text-xs text-white/40">最多 500 字</div>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-lg bg-emerald-500/80 px-5 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
          {data && <div className="text-xs text-white/40">最後更新：{new Date(data.updatedAt).toLocaleString('zh-TW')}</div>}
        </div>
      </div>

      <div className="mt-10 rounded-lg border border-white/10 bg-black/20 p-4">
        <h2 className="mb-2 text-base font-semibold">📋 預覽（當前範本套用實際 RFQ 時長這樣）</h2>
        <pre className="whitespace-pre-wrap text-sm text-white/70">
{greeting}

1. VAG-03H 115 562 H #DEU 機油芯 ×10
2. BMW-11-42-7-953-129 #DEU 機油濾芯 ×5

{closing}
        </pre>
      </div>
    </div>
  );
}
