// apps/nx-ui/src/features/home-dashboard/TaskListPanel.tsx
// 首頁下方：左欄任務清單 — 接 nx98/task-pool（OPEN/CLAIMED 顯示前 10 筆）

'use client';

import { AlertCircle, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { apiJson } from '@/shared/api/client';
import { ApiClientError } from '@/shared/api/errors';

type TaskRow = {
  id: string;
  title: string;
  status?: string;
  priority?: string | null;
  module?: string | null;
  dueDate?: string | null;
};

type TaskPoolResponse = {
  rows?: TaskRow[];
  total?: number;
};

function priorityBadge(p: string | null | undefined) {
  if (p === 'U') return { label: '緊急', cls: 'border-rose-700/50 bg-rose-900/30 text-rose-300' };
  if (p === 'H') return { label: '高', cls: 'border-amber-700/50 bg-amber-900/30 text-amber-300' };
  return null;
}

function isOverdue(due: string | null | undefined): boolean {
  if (!due) return false;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

export function TaskListPanel() {
  const { me, view } = useSessionMe();
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Race fix：等 useSessionMe 拿到 me（token 已就緒）才 fetch；
  // 401 由 useSessionMe 處理 redirect，本元件不顯紅字
  useEffect(() => {
    if (view.loading || !me) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    apiJson<TaskPoolResponse>('/nx98/task-pool?pageSize=10', { method: 'GET' })
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res.rows) ? res.rows : []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          // 401 → useSessionMe 會 redirect / 不顯訊息
          if (err.status === 401) {
            setLoading(false);
            return;
          }
          // 400/403/500 → 顯示具體 status，方便走查時定位
          setErrorMsg(`HTTP ${err.status}`);
        } else if (err instanceof Error) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg('未知錯誤');
        }
        // eslint-disable-next-line no-console
        console.warn('[TaskListPanel] fetch /nx98/task-pool failed:', err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view.loading, me]);

  return (
    <div className="flex min-h-[280px] flex-col gap-2 rounded-xl border border-zinc-800 bg-[#11111A]/70 backdrop-blur-sm p-4">
      <header className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-zinc-400" strokeWidth={1.5} />
          <h3 className="text-sm font-medium tracking-wide text-zinc-100">任務清單</h3>
        </div>
        <span className="text-[10px] text-zinc-500">最新 10 筆</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-6 text-center text-[11px] text-zinc-600">載入中...</p>
        ) : errorMsg ? (
          <p className="py-6 text-center text-[11px] text-rose-400">讀取失敗：{errorMsg}</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-zinc-600">目前沒有待辦</p>
        ) : (
          <ul className="space-y-1">
            {rows.map((r) => {
              const badge = priorityBadge(r.priority);
              const overdue = isOverdue(r.dueDate);
              return (
                <li
                  key={r.id}
                  className="group rounded border border-transparent px-2 py-1.5 transition-colors hover:border-zinc-800 hover:bg-zinc-900/40"
                >
                  <div className="flex items-start gap-2">
                    {badge ? (
                      <span className={`mt-0.5 rounded border px-1 py-px text-[9px] tracking-widest ${badge.cls}`}>
                        {badge.label}
                      </span>
                    ) : null}
                    <span className="flex-1 truncate text-xs text-zinc-200" title={r.title}>
                      {r.title}
                    </span>
                    {overdue ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-400">
                        <AlertCircle className="size-3" />
                        逾期
                      </span>
                    ) : null}
                  </div>
                  {r.module ? (
                    <span className="ml-1 text-[10px] text-zinc-600">{r.module}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
