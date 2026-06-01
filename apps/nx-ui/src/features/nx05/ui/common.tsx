// apps/nx-ui/src/features/nx05/ui/common.tsx
// v1.2 階段 F P4：5 頁面共用 layout / format helper
'use client';

import { cn } from '@/lib/utils';

/** 金額顯示（千分位、保留 2 位小數） */
export function fmtMoney(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 日期顯示（YYYY-MM-DD） */
export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return String(v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 算當前曆月所屬 401 期碼（YYYY-EE） */
export function currentYearPeriod(d: Date = new Date()): string {
  const period = Math.ceil((d.getMonth() + 1) / 2);
  return `${d.getFullYear()}-${String(period).padStart(2, '0')}`;
}

/** 401 期碼回文標籤（'2026-03' → '2026 第 3 期（5-6 月）'） */
export function ypLabel(yp: string): string {
  const m = yp.match(/^(\d{4})-(\d{2})$/);
  if (!m) return yp;
  const year = m[1];
  const period = parseInt(m[2]!, 10);
  const month1 = period * 2 - 1;
  const month2 = period * 2;
  return `${year} 第 ${period} 期（${month1}-${month2} 月）`;
}

/** Page 頂端區塊：標題 + 副標 + 動作右側 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#2A2A30] pb-4">
      <div className="space-y-0.5">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#5A5A60]">FINANCE</p>
        <h1 className="text-xl font-semibold tracking-tight text-[#E8E8EB]">{title}</h1>
        {subtitle ? <p className="text-xs text-[#888892]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** 統計小卡（總覽用） */
export function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: 'amber' | 'green' | 'red' | 'muted';
  hint?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-md border bg-gradient-to-b from-[#101015] to-[#08080C] px-4 py-3',
        tone === 'amber' && 'border-[#E8A020]/30',
        tone === 'green' && 'border-[#22D88F]/30',
        tone === 'red' && 'border-[#E26060]/30',
        tone === 'muted' && 'border-[#2A2A30]',
        !tone && 'border-[#2A2A30]',
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">{label}</div>
      <div
        className={cn(
          'mt-1 font-mono text-lg font-semibold',
          tone === 'amber' && 'text-[#E8A020]',
          tone === 'green' && 'text-[#22D88F]',
          tone === 'red' && 'text-[#E26060]',
          !tone && 'text-[#E8E8EB]',
          tone === 'muted' && 'text-[#888892]',
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-[10px] text-[#5A5A60]">{hint}</div> : null}
    </div>
  );
}

/** 狀態圓點 + 文字 */
export function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const tone =
    s === 'OPEN' || s === 'PARTIAL'
      ? 'amber'
      : s === 'PAID' || s === 'CLOSED' || s === 'POSTED' || s === 'APPROVED'
        ? 'green'
        : s === 'OVERDUE' || s === 'REJECTED' || s === 'CANCELLED' || s === 'VOIDED' || s === 'BOUNCED'
          ? 'red'
          : 'muted';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        tone === 'amber' && 'border-[#E8A020]/40 bg-[#E8A020]/8 text-[#E8A020]',
        tone === 'green' && 'border-[#22D88F]/40 bg-[#22D88F]/8 text-[#22D88F]',
        tone === 'red' && 'border-[#E26060]/40 bg-[#E26060]/8 text-[#E26060]',
        tone === 'muted' && 'border-[#3A3A42] bg-[#1A1A1F] text-[#888892]',
      )}
    >
      {status}
    </span>
  );
}

/** 共用列表表格容器 + 載入/空態 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  emptyMessage,
  rowKey,
}: {
  columns: Array<{ key: string; label: string; align?: 'left' | 'right' | 'center'; render: (row: T) => React.ReactNode }>;
  rows: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey?: (row: T) => string;
}) {
  if (loading) {
    return (
      <div className="rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 px-4 py-12 text-center text-xs text-[#5A5A60]">
        載入中...
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#2A2A30] bg-[#0A0A0C]/30 px-4 py-12 text-center text-xs text-[#5A5A60]">
        {emptyMessage ?? '尚無資料'}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-[#2A2A30] bg-[#0A0A0C]/30">
      <table className="w-full text-xs">
        <thead className="bg-[#11111A]">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888892]',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey ? rowKey(r) : r.id} className="border-t border-[#2A2A30]/60 hover:bg-[#11111A]/60">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-3 py-2 text-[#E8E8EB]',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                  )}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
