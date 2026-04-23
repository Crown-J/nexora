// apps/nx-ui/src/features/sale/ui/hub/components/TodoGroup.tsx
/**
 * R7 狀態追蹤分區：待辦清單的單一群組（手風琴）+ 單筆項目。
 *
 * 項目格式：
 *   第一行：單號（左）+ 狀態 badge 含等待天數（右）
 *   第二行：客戶代碼 + 客戶名稱（左）+ 金額（右）
 *
 * 保固單例外：amount=0 + partName 時，金額位置顯示零件名稱。
 * Badge 顏色依等待天數：< 3 天淡灰、3~7 天淡金、> 7 天淡紅。
 */

'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cx } from '@/shared/lib/cx';
import type { TodoItem } from '../mock-data/scenario';

interface TodoGroupProps {
  title: string;
  items: readonly TodoItem[];
  emptyText: string;
  /** 預設展開（true） */
  defaultExpanded?: boolean;
}

export function TodoGroup({ title, items, emptyText, defaultExpanded = true }: TodoGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between bg-white/5 p-3 transition-colors hover:bg-white/10"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">{title}</span>
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70 tabular-nums">
            {items.length}
          </span>
        </div>
        <ChevronDown
          className={cx('h-4 w-4 text-white/40 transition-transform', isExpanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      {isExpanded ? (
        <div className="border-t border-white/10">
          {items.length === 0 ? (
            <div className="p-4 text-center text-xs text-white/40">{emptyText}</div>
          ) : (
            <div className="divide-y divide-white/5">
              {items.map((item) => (
                <TodoRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TodoRow({ item }: { item: TodoItem }) {
  const isWarrantyNoAmount = item.amount === 0 && !!item.partName;

  return (
    <div className="cursor-pointer p-3 transition-colors hover:bg-white/5">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-xs text-white/60">{item.docNumber}</span>
        <StatusBadge status={item.status} waitDays={item.waitDays} />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-white/40">{item.customerCode}</span>
          <span className="truncate text-white/80">{item.customerName}</span>
        </div>
        {isWarrantyNoAmount ? (
          <span className="shrink-0 text-white/60">{item.partName}</span>
        ) : (
          <span className="shrink-0 tabular-nums text-white/70">
            NT$ {item.amount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
  waitDays: number;
}

function StatusBadge({ status, waitDays }: StatusBadgeProps) {
  const colorClass =
    waitDays < 3
      ? 'bg-white/10 text-white/70'
      : waitDays <= 7
        ? 'bg-[#E8A020]/15 text-[#E8A020]'
        : 'bg-[#E24B4A]/15 text-[#E24B4A]';

  return (
    <span className={cx('rounded px-2 py-0.5 text-xs', colorClass)}>
      {status}（{waitDays} 天）
    </span>
  );
}
