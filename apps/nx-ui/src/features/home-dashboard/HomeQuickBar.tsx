// apps/nx-ui/src/features/home-dashboard/HomeQuickBar.tsx
// 首頁頂列：廣播 + 任務 icon（不佔資料區、收 dashboard 上方）
//
// 廣播 icon → 點開展示所有已發布公告（不含「今日不再顯示」邏輯、那是登入彈窗用）
// 任務 icon → 點開展示 task-pool 待辦
// 兩者皆走 popover 不擋畫面（z-30）

'use client';

import { Megaphone, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiJson } from '@/shared/api/client';

import type { BulletinListResponse, BulletinRow } from './bulletin-types';

type TaskRow = {
  id: string;
  title: string;
  status?: string;
  priority?: string | null;
};
type TaskListResponse = { rows?: TaskRow[]; total?: number };

export function HomeQuickBar() {
  const [bulletins, setBulletins] = useState<BulletinRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [open, setOpen] = useState<'bulletin' | 'task' | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiJson<BulletinListResponse>('/nx01/bulletins?status=published&pageSize=20', { method: 'GET' })
      .then((res) => {
        if (cancelled) return;
        setBulletins(Array.isArray(res.rows) ? res.rows : []);
      })
      .catch(() => {});
    apiJson<TaskListResponse>('/nx98/task-pool?pageSize=20', { method: 'GET' })
      .then((res) => {
        if (cancelled) return;
        setTasks(Array.isArray(res.rows) ? res.rows : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex items-center justify-end gap-2 px-1">
      <IconButton
        label="公告"
        Icon={Megaphone}
        badge={bulletins.length}
        onClick={() => setOpen(open === 'bulletin' ? null : 'bulletin')}
        active={open === 'bulletin'}
      />
      <IconButton
        label="任務"
        Icon={ClipboardList}
        badge={tasks.length}
        onClick={() => setOpen(open === 'task' ? null : 'task')}
        active={open === 'task'}
      />

      {open === 'bulletin' ? (
        <Popover title="公告" empty="目前沒有公告">
          {bulletins.map((r) => (
            <li key={r.id} className="border-t border-zinc-900 px-3 py-2 first:border-t-0">
              <p className="text-xs text-zinc-200">{r.title}</p>
              {r.content ? <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-500">{r.content}</p> : null}
            </li>
          ))}
        </Popover>
      ) : null}

      {open === 'task' ? (
        <Popover title="待辦" empty="目前沒有待辦">
          {tasks.map((r) => (
            <li key={r.id} className="border-t border-zinc-900 px-3 py-2 first:border-t-0">
              <p className="text-xs text-zinc-200">{r.title}</p>
            </li>
          ))}
        </Popover>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpen(null)}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  Icon,
  badge,
  onClick,
  active,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge: number;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        'relative flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors z-30',
        active
          ? 'border-amber-500/60 bg-amber-900/20 text-amber-200'
          : 'border-zinc-800 bg-[#11111A]/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100',
      ].join(' ')}
    >
      <Icon className="size-3.5" strokeWidth={1.5} />
      <span>{label}</span>
      {badge > 0 ? (
        <span className="rounded-full bg-amber-500 px-1 text-[9px] font-semibold text-zinc-950">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
}

function Popover({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="absolute right-1 top-full z-30 mt-1 w-80 rounded-lg border border-zinc-800 bg-[#11111A] shadow-xl">
      <header className="border-b border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
        {title}
      </header>
      {hasChildren ? (
        <ul className="max-h-80 overflow-y-auto py-1">{children}</ul>
      ) : (
        <p className="px-3 py-6 text-center text-[11px] text-zinc-600">{empty}</p>
      )}
    </div>
  );
}
