// apps/nx-ui/src/features/nx01/shell/ui/MasterDetail.tsx
/**
 * NEXORA Master Shell — 詳細頁元件家族
 *
 * 軌 B2 2026-06-18 對齊 Hana demo .nx-detail / .nx-section-label:
 * - 全 hex 改 semantic tokens（自動 light/dark theme）
 * - SectionHeader 用 demo .nx-section-label gold 強調
 * - DetailTable 對齊 .nx-subt 樣式（border-collapse separate、radius、半透明）
 *
 * 元件:
 * - MasterDetailScroll:滿版滾動容器、切換 scrollKey 時自動 scroll 回頂
 * - SectionHeader:章節標題（gold 圓點 + 標題 + count badge + 副標題 + 右側 action）
 * - SectionAddButton:章節新增按鈕
 * - DetailTable:read-only 明細項次表格
 * - EmptyDetail:空白提示文字
 */
'use client';

import { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';

import { cn } from '@design/utils/cn';

export function MasterDetailScroll({
  scrollKey,
  children,
}: {
  /** 當此 key 變化時、scroll 回頂部（通常是當前選中的 row id）*/
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
      data-nx-frame
      className="nx-master-scroll flex min-h-0 flex-1 flex-col overflow-auto rounded-lg border border-border/40 bg-card/70"
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
      <span className="size-2 rounded-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]" />
      <h2 className="text-base font-bold tracking-wide text-foreground">{title}</h2>
      {count != null ? (
        <span className="rounded-md border border-border/40 bg-background/60 px-2 py-0.5 text-[11px] font-mono tabular-nums text-foreground/80">
          {count}
        </span>
      ) : null}
      {subtitle ? (
        <span className="ml-3 hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70 sm:inline">
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
      className="inline-flex h-7 min-w-[8rem] items-center justify-center gap-1.5 rounded-md border border-border/40 bg-background/40 px-3 text-[11px] font-medium text-muted-foreground transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
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
  /** 每 cell 接受 string 或 ReactNode（row action 按鈕等）。第 0 欄維持 mono dim 樣式（適合序號）。*/
  rows: React.ReactNode[][];
}) {
  return (
    <table className="w-full border-collapse text-[12.5px]">
      <thead>
        <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.02em] text-muted-foreground">
          {headers.map((h) => (
            <th
              key={h}
              className="whitespace-nowrap border-b border-border/40 bg-background/40 px-3 py-[7px]"
            >
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
                'border-b border-border/20 transition-colors hover:bg-accent/10',
                isEvenRow && 'bg-foreground/[0.025]',
              )}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    'px-3 py-[6px] text-xs',
                    j === 0 ? 'font-mono text-muted-foreground/70' : 'text-foreground',
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
    <div className="py-6 text-center text-[11px] text-muted-foreground/70">{message}</div>
  );
}
