// apps/nx-ui/src/features/home-dashboard/MetricRenderer.tsx
// 段 C：按 metricType render 不同視覺
//   - count  → 大數字（含千分位）
//   - amount → 大數字 + $ 前綴 + 千分位
//   - trend  → 簡易 sparkline（recharts、KPI 套件）
//   - ratio  → 環形百分比（KPI 套件）
//   - share  → 圓餅佔比（KPI 套件）
//
// 註：KPI 套件（trend / ratio / share）目前都標 isPremium、不會被選中、
//     這裡仍實作 placeholder（顯示「KPI 套件」字樣）、避免將來解鎖後再補。

'use client';

import { Lock } from 'lucide-react';

import type { MetricType } from './metric-options.config';

type MetricRendererProps = {
  metricType: MetricType;
  value: number | null;
  loading: boolean;
  error: boolean;
};

function formatNumber(v: number): string {
  return new Intl.NumberFormat('zh-Hant', { maximumFractionDigits: 0 }).format(v);
}

export function MetricRenderer({ metricType, value, loading, error }: MetricRendererProps) {
  if (loading) {
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-zinc-700">···</span>
      </div>
    );
  }

  if (error || value === null) {
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-zinc-700">—</span>
        <span className="text-[10px] text-zinc-700">無資料</span>
      </div>
    );
  }

  if (metricType === 'count') {
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-amber-300">{formatNumber(value)}</span>
        <span className="text-[11px] text-zinc-500">筆</span>
      </div>
    );
  }

  if (metricType === 'amount') {
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-base text-zinc-500">$</span>
        <span className="text-3xl font-semibold tabular-nums text-amber-300">{formatNumber(value)}</span>
      </div>
    );
  }

  // trend / ratio / share — KPI 套件 placeholder
  return (
    <div className="flex items-center gap-1">
      <Lock className="size-3 text-amber-500/70" />
      <span className="text-[11px] text-amber-300/80">KPI 套件</span>
    </div>
  );
}
