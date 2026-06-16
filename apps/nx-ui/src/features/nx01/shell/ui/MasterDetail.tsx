// apps/nx-ui/src/features/master-shell/ui/MasterDetail.tsx
/**
 * NEXORA Master Shell — 詳細頁元件家族
 *
 * 抽自 lab/users（commit 47.3）滿版單欄滾動詳細頁範式。
 *
 * 元件：
 * - MasterDetailScroll：滿版滾動容器，切換 scrollKey 時自動 scroll 回頂
 * - SectionHeader：章節標題（琥珀小圓點 + 標題 + count badge + 副標題 + 右側 action）
 * - SectionAddButton：章節新增按鈕（min-w-8rem 統一寬度）
 * - DetailTable：read-only 明細項次表格（zebra + hover）
 * - EmptyDetail：空白提示文字
 *
 * 使用：UserDetailView 用 MasterDetailScroll 包 <section>，section 內用 SectionHeader 標題 + 表單/表格內容。
 */
'use client';

import { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@design/utils/cn';

export function MasterDetailScroll({
  scrollKey,
  children,
}: {
  /** 當此 key 變化時，scroll 回頂部（通常是當前選中的 row id）*/
  scrollKey: string | null;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col overflow-auto nx-master-scroll bg-[#0A0A0C]"
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  count,
  subtitle,
  action,
}: {
  title: string;
  count?: number;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
      <h2 className="text-base font-bold tracking-wide text-[#F0F0F3]">{title}</h2>
      {count != null ? (
        <span className="rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-0.5 text-[11px] font-mono tabular-nums text-[#B8B8C0]">
          {count}
        </span>
      ) : null}
      {subtitle ? (
        <span className="ml-3 hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60] sm:inline">
          {subtitle}
        </span>
      ) : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

export function SectionAddButton({
  label,
  onClick,
  formChain,
}: {
  label: string;
  onClick?: () => void;
  /** Enter 跳格鏈順序（主檔詳細頁編輯流；提供時加 data-formchain 供鍵盤鏈納入） */
  formChain?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-formchain={formChain}
      className="inline-flex h-7 min-w-[8rem] items-center justify-center gap-1.5 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-[11px] font-medium text-[#B8B8C0] transition-colors hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]"
    >
      <Plus className="size-3" />
      {label}
    </button>
  );
}

export function DetailTable({
  headers,
  rows,
}: {
  headers: string[];
  /** 每 cell 接受 string 或 ReactNode（row action 按鈕等）。第 0 欄維持 mono dim 樣式（適合序號）。 */
  rows: React.ReactNode[][];
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[#B8B8C0]">
          {headers.map((h) => (
            <th key={h} className="border-b border-[#2A2A30] px-2 py-2 whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const isEvenRow = i % 2 === 1;
          return (
            <tr
              key={i}
              className={cn(
                'border-b border-[#1A1A1F]/70 transition-colors',
                isEvenRow ? 'bg-[#101015]' : 'bg-transparent',
                'hover:bg-[#1A1A22]',
              )}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    'px-2 py-1.5 text-xs',
                    j === 0 ? 'font-mono text-[#5A5A60]' : 'text-[#E8E8EB]',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function EmptyDetail({ message }: { message: string }) {
  return (
    <div className="py-6 text-center text-[11px] text-[#5A5A60]">{message}</div>
  );
}
