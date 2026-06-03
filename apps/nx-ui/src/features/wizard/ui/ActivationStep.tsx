// apps/nx-ui/src/features/wizard/ui/ActivationStep.tsx
// 精靈第二步「挑啟用」UI（Crown 規則 2026-06-03）
//
// 顯示：
//   - 已用 X / Y 席 計數（含負責人）
//   - 未啟用員工清單 + checkbox
//   - 即時 effective = (used + 已勾)、滿了未勾的 disable
//   - 滿了文字「已達席次上限（Y 席）」、無推銷字眼（升級/加購/聯絡）
//   - 後端 SE-001 守門保底
//
// 段 3 範圍：成功訊息後展示預設密碼 — 本檔 hand-off 給呼叫者透過 onActivated 回呼

'use client';

import { CheckCircle2, Loader2, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { ApiClientError } from '@/shared/api/errors';

import {
  bulkActivateUsers,
  fetchPendingEmployees,
  fetchSeatUsage,
  type PendingUserRow,
  type SeatUsage,
} from '../api';

type ActivationStepProps = {
  /** 啟用成功回呼（給段 3 顯示預設密碼用） */
  onActivated?: (result: { activated: number; activatedUsers: PendingUserRow[]; seatUsage: SeatUsage }) => void;
};

export function ActivationStep({ onActivated }: ActivationStepProps) {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingUserRow[]>([]);
  const [usage, setUsage] = useState<SeatUsage | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [u, p] = await Promise.all([fetchSeatUsage(), fetchPendingEmployees()]);
      setUsage(u);
      setPending(p);
    } catch (e: unknown) {
      if (e instanceof ApiClientError) {
        setErr(`讀取失敗（HTTP ${e.status}）`);
      } else if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr('讀取失敗');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectedCount = selected.size;
  const effectiveUsed = (usage?.used ?? 0) + selectedCount;
  const total = usage?.total ?? 0;
  const noAvailable = total > 0 && effectiveUsed >= total;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // 未勾的：只在還有席次時才可加
        if (noAvailable) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setErr(null);
    try {
      const ids = Array.from(selected);
      const result = await bulkActivateUsers(ids);
      const activatedUsers = pending.filter((u) => selected.has(u.id));
      setSuccessCount(result.activated);
      setUsage(result.seatUsage);
      setPending((prev) => prev.filter((u) => !selected.has(u.id)));
      setSelected(new Set());
      onActivated?.({
        activated: result.activated,
        activatedUsers,
        seatUsage: result.seatUsage,
      });
    } catch (e: unknown) {
      if (e instanceof ApiClientError) {
        // 後端 SE-001 / SE-002 訊息已具體（含 X/Y、無推銷）、直接顯示
        let msg = `HTTP ${e.status}`;
        try {
          const body = JSON.parse(e.body ?? '{}') as { message?: string };
          if (body.message) msg = body.message;
        } catch {
          // 用 status fallback
        }
        setErr(msg);
        // 後端可能因競態狀況拒絕、重新拉一次 usage 同步 UI
        try {
          setUsage(await fetchSeatUsage());
        } catch {
          /* ignore */
        }
      } else if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr('啟用失敗');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card flex items-center justify-center rounded-xl border border-border/70 p-8">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">載入員工清單與席次…</span>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <SeatBadge usage={usage} effectiveUsed={effectiveUsed} selectedCount={selectedCount} />

      {successCount !== null ? (
        <div className="glass-card rounded-xl border border-emerald-500/40 p-4">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-semibold">已啟用 {successCount} 名員工</span>
          </div>
        </div>
      ) : null}

      {pending.length === 0 ? (
        <div className="glass-card rounded-xl border-2 border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          目前沒有未啟用的員工
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-xl border border-border/70">
          <ul className="divide-y divide-border/60">
            {pending.map((u) => {
              const checked = selected.has(u.id);
              const disabled = !checked && noAvailable;
              return (
                <li key={u.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      disabled
                        ? 'cursor-not-allowed opacity-50'
                        : checked
                          ? 'bg-primary/10 text-foreground'
                          : 'hover:bg-secondary/40',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(u.id)}
                      className="size-4 rounded border-border/80 bg-secondary text-primary"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium text-foreground">
                        {u.displayName}
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{u.username}</span>
                      </span>
                      {u.email || u.jobTitle ? (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {[u.jobTitle, u.email].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {noAvailable && pending.length > 0 ? (
        <p className="px-1 text-xs text-muted-foreground">已達席次上限（{total} 席）。</p>
      ) : null}

      {err ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">{err}</p> : null}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selectedCount > 0 ? `已勾選 ${selectedCount} 名、本次將啟用 ${selectedCount} 席` : '勾選要啟用的員工'}
        </p>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || selected.size === 0}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
          {submitting ? '啟用中…' : `啟用 ${selectedCount || ''} 名員工`}
        </button>
      </div>
    </section>
  );
}

function SeatBadge({
  usage,
  effectiveUsed,
  selectedCount,
}: {
  usage: SeatUsage | null;
  effectiveUsed: number;
  selectedCount: number;
}) {
  if (!usage) return null;
  const remainAfter = Math.max(0, usage.total - effectiveUsed);
  return (
    <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">席次</span>
        <span className="text-xl font-semibold tabular-nums text-foreground">
          <span className="text-primary">{effectiveUsed}</span>
          <span className="mx-1 text-muted-foreground">/</span>
          <span>{usage.total}</span>
          <span className="ml-1 text-xs text-muted-foreground">席</span>
        </span>
        <span className="mt-0.5 text-[11px] text-muted-foreground">
          目前啟用 {usage.used} 席 ・ 本次勾 {selectedCount} 席 ・ 啟用後剩 {remainAfter} 席
        </span>
      </div>
      <div className="text-right">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">含負責人</span>
        <p className="text-xs text-muted-foreground">負責人已計入「目前啟用」</p>
      </div>
    </div>
  );
}
