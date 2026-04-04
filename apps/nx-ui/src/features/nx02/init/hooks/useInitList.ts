/**
 * File: apps/nx-ui/src/features/nx02/init/hooks/useInitList.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-UI-HOOK-001：開帳存清單 URL 狀態
 *
 * Notes:
 * - @FUNCTION_CODE NX02-INIT-UI-001-F01
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { parsePositiveInt } from '@/shared/lib/parse';

import { listInit } from '../api/init';
import type { InitListRowDto } from '../types';

/**
 * @FUNCTION_CODE NX02-INIT-UI-001-F01
 */
export function useInitList() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const warehouseId = sp.get('warehouseId') ?? '';
  const status = sp.get('status') ?? '';
  const dateFrom = sp.get('dateFrom') ?? '';
  const dateTo = sp.get('dateTo') ?? '';
  const page = parsePositiveInt(sp.get('page'), 1);
  const pageSize = parsePositiveInt(sp.get('pageSize'), 20);

  const setQuery = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [sp, router, pathname],
  );

  const [rows, setRows] = useState<InitListRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    listInit({
      warehouseId: warehouseId || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
    })
      .then((r) => {
        if (!alive) return;
        setRows(r.data);
        setTotal(r.total);
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
  }, [warehouseId, status, dateFrom, dateTo, page, pageSize]);

  return useMemo(
    () => ({
      warehouseId,
      status,
      dateFrom,
      dateTo,
      page,
      pageSize,
      rows,
      total,
      loading,
      error,
      setQuery,
    }),
    [warehouseId, status, dateFrom, dateTo, page, pageSize, rows, total, loading, error, setQuery],
  );
}

export type InitListVm = ReturnType<typeof useInitList>;
