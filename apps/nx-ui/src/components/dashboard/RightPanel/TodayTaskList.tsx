/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-019-F01
 */

'use client';

import { useRouter } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import type { MockTask, PlanCode } from '@/mocks/dashboard';
import { cx } from '@/shared/lib/cx';

type Props = {
  tasks: MockTask[];
  onTasksChange: (next: MockTask[]) => void;
  planCode: PlanCode;
  className?: string;
  /** false：由外層容器捲動（例如手機版整欄單一捲軸） */
  listScrollable?: boolean;
};

export function TodayTaskList({
  tasks,
  onTasksChange,
  planCode,
  className,
  listScrollable = true,
}: Props) {
  const router = useRouter();
  const showXp = planCode === 'PRO';
  const doneCount = tasks.filter((t) => t.done).length;

  const toggle = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onTasksChange(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const rowNav = (t: MockTask) => {
    router.push(t.targetRoute);
  };

  return (
    <div
      className={cx(
        'nx-dash-card flex min-h-0 flex-col p-4',
        className,
      )}
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
          今日工作
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {doneCount}/{tasks.length} 完成
          </span>
          {showXp ? <span className="text-primary">+15 XP</span> : null}
        </div>
      </div>
      <ul
        className={cx(
          'space-y-2 pr-1',
          listScrollable && 'nx-master-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain',
        )}
      >
        {tasks.map((t) => (
          <li key={t.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => rowNav(t)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  rowNav(t);
                }
              }}
              className={cx(
                'flex cursor-pointer gap-3 rounded-xl border border-border/70 bg-muted/25 px-3 py-2 text-left transition hover:border-border hover:bg-muted/40',
                t.done && 'opacity-60',
              )}
            >
              <button
                type="button"
                onClick={(e) => toggle(t.id, e)}
                className={cx(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs',
                  t.done
                    ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
                    : 'border-border',
                )}
                aria-label={t.done ? '標記未完成' : '標記完成'}
              >
                {t.done ? '✓' : '○'}
              </button>
              <div className="min-w-0 flex-1">
                <div className={cx('text-sm font-medium', t.done && 'line-through')}>
                  {t.title}
                </div>
                {t.desc ? (
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span
                    className={cx(
                      'rounded px-1.5 py-0.5',
                      t.priority === 'URGENT'
                        ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]'
                        : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {t.priority === 'URGENT' ? '緊急' : '一般'}
                  </span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">
                    {t.category}
                  </span>
                  <span className="text-muted-foreground">⏰{t.deadline}</span>
                </div>
              </div>
              {showXp ? (
                <div className="shrink-0 self-center text-xs text-primary">+{t.xp}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-3 shrink-0 text-xs text-primary hover:underline"
      >
        查看所有工作 &gt;
      </button>
    </div>
  );
}
