// apps/nx-ui/src/features/home-dashboard/MetricRenderer.tsx
// 按 metricType render（count / amount 大數字、KPI 套件鎖位）

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
        <span className="text-2xl font-semibold text-muted-foreground/40">···</span>
      </div>
    );
  }

  if (error || value === null) {
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-muted-foreground/40">—</span>
        <span className="text-[10px] text-muted-foreground/60">無資料</span>
      </div>
    );
  }

  if (metricType === 'count') {
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-primary">{formatNumber(value)}</span>
        <span className="text-[11px] text-muted-foreground">筆</span>
      </div>
    );
  }

  if (metricType === 'amount') {
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-base text-muted-foreground">$</span>
        <span className="text-3xl font-semibold tabular-nums text-primary">{formatNumber(value)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Lock className="h-3 w-3 text-primary/70" />
      <span className="text-[11px] text-primary/80">KPI 套件</span>
    </div>
  );
}
