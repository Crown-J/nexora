// apps/nx-ui/src/features/nx08/ui/common.tsx
// v1.2 階段 H P2：6 報表共用元件
//
// 範式：
//   - 直接 re-export 階段 F NX05 既有 common 元件（PageHeader / StatCard / DataTable / StatusBadge / fmt*）
//   - 新加報表專用：PeriodPicker（期間選擇器）+ ChartWrapper（recharts 暗色主題）+ KpiCard（簡化版 StatCard）
'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';

import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────
// useIsMobile：< 640px (Tailwind sm 斷點)
// 範式 §10.4：手機卡片化、不是電腦版硬塞
// ────────────────────────────────────────────────────────────
export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [breakpoint]);
  return isMobile;
}

// 從階段 F NX05 共用元件 re-export
export {
  PageHeader,
  StatCard,
  DataTable,
  StatusBadge,
  fmtDate,
  fmtMoney,
  currentYearPeriod,
  ypLabel,
} from '@/features/nx05/ui/common';

// ────────────────────────────────────────────────────────────
// PeriodPicker：期間選擇器（共用、6 報表都用）
// ────────────────────────────────────────────────────────────

export type PeriodMode = 'day' | 'month' | 'quarter' | 'year' | 'custom';

export type Period = {
  mode: PeriodMode;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  label: string; // 顯示用，例：'2026 年 5 月'
};

/** 算當前期 / 上期 / 自訂區間 */
export function makePeriod(mode: PeriodMode, base?: Date): Period {
  const d = base ?? new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  if (mode === 'day') {
    const s = new Date(y, m, day);
    const e = new Date(y, m, day);
    return { mode, start: ymd(s), end: ymd(e), label: `${y}-${pad(m + 1)}-${pad(day)}` };
  }
  if (mode === 'month') {
    const s = new Date(y, m, 1);
    const e = new Date(y, m + 1, 0);
    return { mode, start: ymd(s), end: ymd(e), label: `${y} 年 ${pad(m + 1)} 月` };
  }
  if (mode === 'quarter') {
    const q = Math.floor(m / 3);
    const s = new Date(y, q * 3, 1);
    const e = new Date(y, q * 3 + 3, 0);
    return { mode, start: ymd(s), end: ymd(e), label: `${y} 年 Q${q + 1}（${q * 3 + 1}-${q * 3 + 3} 月）` };
  }
  if (mode === 'year') {
    const s = new Date(y, 0, 1);
    const e = new Date(y, 11, 31);
    return { mode, start: ymd(s), end: ymd(e), label: `${y} 年` };
  }
  // custom：預設取當月
  const s = new Date(y, m, 1);
  const e = new Date(y, m + 1, 0);
  return { mode: 'custom', start: ymd(s), end: ymd(e), label: '自訂區間' };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PeriodPicker({
  value,
  onChange,
  modes,
}: {
  value: Period;
  onChange: (p: Period) => void;
  modes?: PeriodMode[];
}) {
  const allowedModes: Array<{ value: PeriodMode; label: string }> = useMemo(() => {
    const all: Array<{ value: PeriodMode; label: string }> = [
      { value: 'day', label: '日' },
      { value: 'month', label: '月' },
      { value: 'quarter', label: '季' },
      { value: 'year', label: '年' },
      { value: 'custom', label: '自訂' },
    ];
    if (!modes) return all;
    return all.filter((m) => modes.includes(m.value));
  }, [modes]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 px-3 py-2">
      <Calendar className="size-3.5 text-[#5A5A60]" />
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">期間</span>
      <div className="flex flex-wrap gap-1">
        {allowedModes.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(makePeriod(m.value))}
            className={cn(
              'rounded-md border px-2 py-1 text-[11px] transition-colors',
              value.mode === m.value
                ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      {value.mode === 'custom' ? (
        <div className="ml-2 flex items-center gap-1.5">
          <input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value, label: `${e.target.value} ~ ${value.end}` })}
            className="h-7 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 text-[11px] text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
          />
          <span className="text-[10px] text-[#5A5A60]">~</span>
          <input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value, label: `${value.start} ~ ${e.target.value}` })}
            className="h-7 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 text-[11px] text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
          />
        </div>
      ) : (
        <span className="ml-2 font-mono text-xs text-[#E8A020]">{value.label}</span>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// KpiCard：報表頂端 KPI 卡（比 StatCard 更精簡、用於排行/比較）
// ────────────────────────────────────────────────────────────

export function KpiCard({
  label,
  value,
  delta,
  tone,
  hint,
}: {
  label: string;
  value: string | number;
  /** 增減幅、自動依正負加色 */
  delta?: { value: string; isPositive?: boolean };
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
      <div className="mt-1 flex items-baseline gap-2">
        <div
          className={cn(
            'font-mono text-lg font-semibold',
            tone === 'amber' && 'text-[#E8A020]',
            tone === 'green' && 'text-[#22D88F]',
            tone === 'red' && 'text-[#E26060]',
            tone === 'muted' && 'text-[#888892]',
            !tone && 'text-[#E8E8EB]',
          )}
        >
          {typeof value === 'number' ? value.toLocaleString('zh-TW') : value}
        </div>
        {delta ? (
          <span
            className={cn(
              'text-[10px] font-mono',
              delta.isPositive ? 'text-[#22D88F]' : 'text-[#E26060]',
            )}
          >
            {delta.isPositive ? '▲' : '▼'} {delta.value}
          </span>
        ) : null}
      </div>
      {hint ? <div className="mt-1 text-[10px] text-[#5A5A60]">{hint}</div> : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ChartWrapper：recharts 容器（暗色主題、響應式、共用）
// ────────────────────────────────────────────────────────────

export function ChartWrapper({
  title,
  subtitle,
  children,
  height = 240,
  mobileHeight,
  actions,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
  /** 手機高度（< 640px）；不傳預設 = height × 0.7（避免過矮）。 */
  mobileHeight?: number;
  actions?: ReactNode;
}) {
  const isMobile = useIsMobile();
  const h = isMobile ? (mobileHeight ?? Math.round(height * 0.7)) : height;
  return (
    <div className="rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 p-3 sm:p-4">
      {title || actions ? (
        <div className="mb-3 flex items-center justify-between">
          <div>
            {title ? <h3 className="text-sm font-semibold text-[#E8E8EB]">{title}</h3> : null}
            {subtitle ? <p className="text-[10px] text-[#5A5A60]">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div style={{ width: '100%', height: h }}>{children}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ExportButton：6 報表共用 Excel 匯出按鈕（外觀對齊「重新整理」按鈕）
// ────────────────────────────────────────────────────────────

import { Download } from 'lucide-react';

export function ExportButton({
  onClick,
  loading,
  disabled,
}: {
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={loading || disabled}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2.5 text-xs text-[#B8B8C0] hover:border-[#22D88F]/40 hover:text-[#22D88F] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className={cn('size-3.5', loading && 'animate-pulse')} />
      {loading ? '匯出中…' : '匯出 Excel'}
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// ResponsiveTable：< 640 卡片化、≥ 640 用 DataTable
// API 與 DataTable 一致、view 直接 swap
// ────────────────────────────────────────────────────────────

import { DataTable as _DataTable } from '@/features/nx05/ui/common';

export type ResponsiveColumn<T> = {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
  /** 卡片模式下隱藏（避免雜訊、譬如「名次」這種大欄） */
  hideOnMobile?: boolean;
  /** 卡片模式下作為標題（不顯示 label）；建議用品名/姓名等 */
  asTitle?: boolean;
};

export function ResponsiveTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  emptyMessage,
  rowKey,
}: {
  columns: Array<ResponsiveColumn<T>>;
  rows: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey?: (row: T) => string;
}) {
  const isMobile = useIsMobile();

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

  if (!isMobile) {
    // 桌面：直接用 DataTable（型別已相容 — hideOnMobile / asTitle 為 DataTable 忽略）
    return <_DataTable columns={columns} rows={rows} rowKey={rowKey} />;
  }

  // 手機：卡片清單
  const titleCol = columns.find((c) => c.asTitle);
  const detailCols = columns.filter((c) => !c.hideOnMobile && !c.asTitle);

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={rowKey ? rowKey(r) : r.id}
          className="rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40 p-3 text-xs"
        >
          {titleCol ? (
            <div className="mb-2 border-b border-[#2A2A30]/60 pb-2 text-sm font-semibold text-[#E8E8EB]">
              {titleCol.render(r)}
            </div>
          ) : null}
          <div className="space-y-1">
            {detailCols.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-[10px] uppercase tracking-[0.1em] text-[#5A5A60]">
                  {c.label}
                </span>
                <span className="min-w-0 truncate text-right">{c.render(r)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 暗色主題 recharts 共用配色 */
export const CHART_COLORS = {
  primary: '#E8A020', // 琥珀
  success: '#22D88F', // 綠
  danger: '#E26060', // 紅
  muted: '#5A5A60', // 灰
  grid: '#2A2A30',
  axis: '#888892',
  tooltipBg: '#0E0E12',
  series: ['#E8A020', '#22D88F', '#E26060', '#888892', '#A66BFF', '#4FB3F3', '#FFAB66', '#66DDB3'],
};

/** recharts 共用 Tooltip 樣式 */
export const chartTooltipStyle = {
  contentStyle: {
    background: CHART_COLORS.tooltipBg,
    border: `1px solid ${CHART_COLORS.grid}`,
    borderRadius: 6,
    fontSize: 12,
    color: '#E8E8EB',
  },
  labelStyle: { color: CHART_COLORS.axis, fontSize: 10 },
  cursor: { fill: 'rgba(232, 160, 32, 0.06)' },
};
