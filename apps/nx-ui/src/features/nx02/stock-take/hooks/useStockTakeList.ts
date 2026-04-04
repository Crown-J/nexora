/**
 * File: apps/nx-ui/src/features/nx02/stock-take/hooks/useStockTakeList.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-UI-HOOK-001：盤點單清單
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { parsePositiveInt } from '@/shared/lib/parse';

import { listStockTake } from '../api/stock-take';
import type { StockTakeListRowDto } from '../types';

/**
 * @FUNCTION_CODE NX02-STTK-UI-HOOK-001-F01
 */
export function useStockTakeList() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const warehouseId = sp.get('warehouseId') ?? '';
  const status = sp.get('status') ?? '';
  const page = parsePositiveInt(sp.get('page'), 1);
  const pageSize = parsePositiveInt(sp.get('pageSize'), 20);

  const setQuery = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      router.replace(`${pathname}?${next.toString()}`);
    },
    [sp, router, pathname],
  );

  const [rows, setRows] = useState<StockTakeListRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listStockTake({
      warehouseId: warehouseId || undefined,
      status: status || undefined,
      page,
      pageSize,
    })
      .then((r) => {
        if (!alive) return;
        setRows(r.data);
        setTotal(r.total);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : '載入失敗');
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [warehouseId, status, page, pageSize]);

  return useMemo(
    () => ({
      warehouseId,
      status,
      page,
      pageSize,
      rows,
      total,
      loading,
      error,
      setQuery,
    }),
    [warehouseId, status, page, pageSize, rows, total, loading, error, setQuery],
  );
}

export type StockTakeListVm = ReturnType<typeof useStockTakeList>;
