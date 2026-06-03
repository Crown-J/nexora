// apps/nx-ui/src/features/home-dashboard/LoginAnnouncementModal.tsx
// 登入後公告彈窗 — 自動拉已發布公告、勾「今日不再顯示」存 localStorage
//
// z-index：z-40（低於 z-50 之 MetricPickerModal、低於強制改密/警訊 z-[60+]）
// 觸發時機：HomeDashboardV2 首次 mount、未在今日勾關閉

'use client';

import { Megaphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiJson } from '@/shared/api/client';

import type { BulletinListResponse, BulletinRow } from './bulletin-types';

const DISMISS_KEY = 'nexora.home.bulletin.dismissDate';

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function importanceBadge(level: string | null | undefined) {
  if (level === 'urgent') return { label: '緊急', cls: 'border-rose-700/50 bg-rose-900/30 text-rose-300' };
  if (level === 'important') return { label: '重要', cls: 'border-amber-700/50 bg-amber-900/30 text-amber-300' };
  return { label: '一般', cls: 'border-zinc-700/50 bg-zinc-900 text-zinc-400' };
}

export function LoginAnnouncementModal() {
  const [rows, setRows] = useState<BulletinRow[]>([]);
  const [open, setOpen] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  useEffect(() => {
    // 已勾「今日不再顯示」→ 跳過
    if (typeof window !== 'undefined') {
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      if (dismissed === todayYmd()) return;
    }

    let cancelled = false;
    apiJson<BulletinListResponse>('/nx01/bulletins?status=published&pageSize=5', { method: 'GET' })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.rows) ? res.rows : [];
        if (list.length === 0) return;
        setRows(list);
        setOpen(true);
      })
      .catch(() => {
        // 失敗靜默（不擋首頁）
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function close() {
    if (dontShowToday && typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, todayYmd());
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="公告"
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-zinc-800 bg-[#11111A] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-amber-400" strokeWidth={1.5} />
            <h2 className="text-base font-medium text-zinc-100">公告</h2>
            <span className="text-[10px] text-zinc-500">{rows.length} 則</span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="關閉"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="space-y-3 p-5">
          {rows.map((r) => {
            const badge = importanceBadge(r.importance);
            return (
              <article
                key={r.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
              >
                <header className="mb-1 flex items-start gap-2">
                  <span className={`mt-0.5 rounded border px-1 py-px text-[9px] tracking-widest ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <h3 className="flex-1 text-sm font-medium text-zinc-100">{r.title}</h3>
                </header>
                {r.content ? (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">{r.content}</p>
                ) : null}
              </article>
            );
          })}
        </div>

        <footer className="flex items-center justify-between border-t border-zinc-800 px-5 py-3">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="size-3.5 rounded border-zinc-700 bg-zinc-900 text-amber-500"
            />
            今日不再顯示
          </label>
          <button
            type="button"
            onClick={close}
            className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          >
            我知道了
          </button>
        </footer>
      </div>
    </div>
  );
}
