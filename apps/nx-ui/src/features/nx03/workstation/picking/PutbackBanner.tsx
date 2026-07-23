// apps/nx-ui/src/features/nx03/workstation/picking/PutbackBanner.tsx
/**
 * 「請放回」提示橫幅（DOC-TIMING-KPI 同軌收尾 2026-07-23）。
 *
 * 撿貨中的貨、若所屬銷貨單被取消，後端會開一張 PUTBACK 待辦（已撿下架的貨要放回原庫位）。
 * 此橫幅在撿貨頁頂端即時提示正在撿貨的倉管：哪些貨要放回、按「已放回」標記完成。
 * 桌機(PickWorkbench) / 手機(MobilePickPoolPage) 共用。
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { PackageX } from 'lucide-react';

import { listTaskPool, claimTask, completeTask } from '@data/endpoints/nx98/task-pool/api/task-pool';
import type { TaskPoolDto } from '@data/types/nx98/task-pool';

export function PutbackBanner() {
  const [tasks, setTasks] = useState<TaskPoolDto[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await listTaskPool({ scope: 'pool', category: 'PUTBACK', status: 'OPEN', pageSize: 50 });
      setTasks(r.rows);
    } catch {
      setTasks([]); // 提示性質、載入失敗靜默（不擋撿貨主流程）
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markDone = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await claimTask(id); // OPEN→CLAIMED（領取後才能完成）
        await completeTask(id, '已放回原庫位');
        await load();
      } catch {
        await load(); // 失敗重抓真實狀態（可能已被別人處理）
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  if (tasks.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-500">
        <PackageX className="h-4 w-4 shrink-0" aria-hidden />
        請放回 · {tasks.length} 筆（單子已取消、已撿下架的貨請歸位）
      </div>
      <ul className="mt-2 space-y-1.5">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-2 rounded-lg bg-card/60 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">{t.title}</p>
              {t.description ? (
                <p className="mt-0.5 whitespace-pre-line text-[11px] leading-snug text-muted-foreground">{t.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={busyId === t.id}
              onClick={() => void markDone(t.id)}
              className="h-8 shrink-0 rounded-lg bg-amber-600 px-3 text-xs font-medium text-white hover:bg-amber-600/90 disabled:opacity-40"
            >
              已放回
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
