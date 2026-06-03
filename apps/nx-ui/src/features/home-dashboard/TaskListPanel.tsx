// apps/nx-ui/src/features/home-dashboard/TaskListPanel.tsx
// 首頁下方：左欄任務清單 — 接 nx98/task-pool（前 10 筆）
//
// 2026-06-03 對齊主檔中心：glass-card + Section header + token 化、滿版撐高

'use client';

import { AlertCircle, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { apiJson } from '@/shared/api/client';
import { ApiClientError } from '@/shared/api/errors';

import { HomeSectionHeader } from './HomeSectionHeader';

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
  if (p === 'U' || p === 'H') return { label: p === 'U' ? '緊急' : '高', cls: 'border-primary/40 bg-primary/10 text-primary' };
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
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (view.loading || !me) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    apiJson<TaskPoolResponse>('/nx98/task-pool?pageSize=10', { method: 'GET' })
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res.rows) ? res.rows : []);
        setTotal(typeof res.total === 'number' ? res.total : (res.rows?.length ?? 0));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          if (err.status === 401) {
            setLoading(false);
            return;
          }
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
    <div className="glass-card nx-glass-raised flex h-full min-h-0 flex-col gap-2 rounded-xl border border-border/80 p-4">
      <HomeSectionHeader
        Icon={ClipboardList}
        title="任務清單"
        count={total != null ? `${rows.length} / ${total}` : undefined}
      />

      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        {loading ? (
          <p className="py-6 text-center text-[11px] text-muted-foreground">載入中...</p>
        ) : errorMsg ? (
          <p className="py-6 text-center text-[11px] text-destructive">讀取失敗：{errorMsg}</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-muted-foreground">目前沒有待辦</p>
        ) : (
          <ul className="space-y-1">
            {rows.map((r) => {
              const badge = priorityBadge(r.priority);
              const overdue = isOverdue(r.dueDate);
              return (
                <li
                  key={r.id}
                  className={cn(
                    'group rounded-md border border-transparent px-2 py-1.5 transition-colors',
                    'hover:border-border/60 hover:bg-secondary/40',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {badge ? (
                      <span className={`mt-0.5 rounded border px-1 py-px text-[9px] tracking-widest ${badge.cls}`}>
                        {badge.label}
                      </span>
                    ) : null}
                    <span className="flex-1 truncate text-xs text-foreground" title={r.title}>
                      {r.title}
                    </span>
                    {overdue ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        逾期
                      </span>
                    ) : null}
                  </div>
                  {r.module ? <span className="ml-1 text-[10px] text-muted-foreground">{r.module}</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
