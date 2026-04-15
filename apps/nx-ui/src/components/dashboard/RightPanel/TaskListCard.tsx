/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-019-F02
 * 任務清單：系統彙整之待辦（Mock）
 */

'use client';

import { useRouter } from 'next/navigation';
import { Briefcase, Check } from 'lucide-react';
import type { MockTask, MockTaskStatus, PlanCode } from '@/mocks/dashboard';
import { cx } from '@/shared/lib/cx';

function taskStatusAriaLabel(status: MockTaskStatus): string {
  if (status === 'done') return '已完成';
  if (status === 'in_progress') return '進行中';
  return '待處理';
}

export type TaskListCardProps = {
  tasks: MockTask[];
  onTasksChange?: (next: MockTask[]) => void;
  planCode: PlanCode;
  className?: string;
  listScrollable?: boolean;
  /** 與左欄（行事曆＋事件簿）總高等高時撐滿 */
  fillColumnHeight?: boolean;
};

function TaskStatusIndicator({ status }: { status: MockTaskStatus }) {
  if (status === 'done') {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-white"
        aria-hidden
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span
        className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-[#E8A020] bg-[conic-gradient(#E8A020_0deg_180deg,transparent_180deg_360deg)]"
        aria-hidden
      />
    );
  }
  return (
    <span
      className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/60 bg-transparent"
      aria-hidden
    />
  );
}

export function TaskListCard({
  tasks,
  planCode,
  className,
  listScrollable = true,
  fillColumnHeight,
}: TaskListCardProps) {
  const router = useRouter();
  const showXp = planCode === 'PRO';
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  const rowNav = (t: MockTask) => {
    router.push(t.targetRoute);
  };

  return (
    <div
      className={cx(
        'nx-dash-card flex min-h-0 flex-col p-4',
        fillColumnHeight && 'h-full min-h-0',
        className,
      )}
    >
      <div className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
          任務清單
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {doneCount}/{tasks.length} 完成
          </span>
          {showXp ? <span className="text-primary">+15 XP</span> : null}
        </div>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-muted-foreground">系統自動偵測各模組待辦</p>
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
              aria-label={`${t.title}，${taskStatusAriaLabel(t.status)}`}
              onClick={() => rowNav(t)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  rowNav(t);
                }
              }}
              className={cx(
                'flex cursor-pointer gap-3 rounded-xl border border-border/70 bg-muted/25 px-3 py-2 text-left transition hover:border-border hover:bg-muted/40',
                t.status === 'done' && 'opacity-60',
              )}
            >
              <TaskStatusIndicator status={t.status} />
              <div className="min-w-0 flex-1">
                <div className={cx('text-sm font-medium', t.status === 'done' && 'line-through')}>
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
        查看所有任務 &gt;
      </button>
    </div>
  );
}
