// apps/nx-ui/src/features/home-dashboard/useMetricValue.ts
// 拉 endpoint 抽出 total 數字（容錯支援多種 list 回應格式）

'use client';

import { useEffect, useState } from 'react';

import { apiJson } from '@/shared/api/client';

type AnyListResponse = {
  total?: number;
  count?: number;
  pagination?: { total?: number };
  rows?: unknown[];
  items?: unknown[];
};

function extractTotal(raw: unknown): number | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as AnyListResponse;
  if (typeof r.total === 'number') return r.total;
  if (typeof r.count === 'number') return r.count;
  if (r.pagination && typeof r.pagination.total === 'number') return r.pagination.total;
  if (Array.isArray(r.rows)) return r.rows.length;
  if (Array.isArray(r.items)) return r.items.length;
  return null;
}

export type MetricValueState = {
  value: number | null;
  loading: boolean;
  error: boolean;
};

export function useMetricValue(endpoint: string | null | undefined): MetricValueState {
  const [state, setState] = useState<MetricValueState>({
    value: null,
    loading: Boolean(endpoint),
    error: false,
  });

  useEffect(() => {
    if (!endpoint) {
      setState({ value: null, loading: false, error: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    apiJson<unknown>(endpoint, { method: 'GET' })
      .then((raw) => {
        if (cancelled) return;
        const v = extractTotal(raw);
        setState({ value: v, loading: false, error: v === null });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ value: null, loading: false, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return state;
}
