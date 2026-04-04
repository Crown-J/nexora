/**
 * File: apps/nx-ui/src/features/nx02/balance/hooks/useBalance.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-BAL-UI-HOOK-001：庫存一覽 URL 狀態 + 列表／摘要載入（q debounce 300ms）
 *
 * Notes:
 * - @FUNCTION_CODE NX02-BAL-UI-001-F01
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { parsePositiveInt } from '@/shared/lib/parse';

import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';

import { getBalanceSummary, listBalance } from '../api/balance';
import type { BalanceRowDto, BalanceSummaryResponse, WarehouseOption } from '../types';

const DEBOUNCE_MS = 300;

export function useBalance() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const warehouseId = sp.get('warehouseId') ?? '';
  const status = sp.get('status') ?? 'all';
  const page = parsePositiveInt(sp.get('page'), 1);
  const pageSize = parsePositiveInt(sp.get('pageSize'), 20);
  const sortBy = sp.get('sortBy') ?? 'last_move_at';
  const sortDir = sp.get('sortDir') === 'desc' ? 'desc' : 'asc';
  const qUrl = sp.get('q') ?? '';

  const [qInput, setQInput] = useState(qUrl);
  useEffect(() => {
    setQInput(qUrl);
  }, [qUrl]);

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

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = qInput.trim();
      if (trimmed === qUrl.trim()) return;
      setQuery({ q: trimmed || null, page: '1' });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [qInput, qUrl, setQuery]);

  const [rows, setRows] = useState<BalanceRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<BalanceSummaryResponse | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    listBalance({
      q: qUrl || undefined,
      warehouseId: warehouseId || undefined,
      status,
      page,
      pageSize,
      sortBy,
      sortDir,
    })
      .then((res) => {
        if (!alive) return;
        setRows(res.data);
        setTotal(res.total);
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
  }, [qUrl, warehouseId, status, page, pageSize, sortBy, sortDir]);

  useEffect(() => {
    let alive = true;
    getBalanceSummary(warehouseId || undefined)
      .then((s) => {
        if (alive) setSummary(s);
      })
      .catch(() => {
        if (alive) setSummary(null);
      });
    return () => {
      alive = false;
    };
  }, [warehouseId]);

  useEffect(() => {
    let alive = true;
    listLookupWarehouse({ isActive: true })
      .then((w) => {
        if (alive)
          setWarehouses(
            w.map((row) => ({
              id: row.id,
              code: row.code,
              name: row.name,
            })),
          );
      })
      .catch(() => {
        if (alive) setWarehouses([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const toggleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setQuery({ sortDir: sortDir === 'asc' ? 'desc' : 'asc', page: '1' });
      } else {
        setQuery({ sortBy: field, sortDir: 'asc', page: '1' });
      }
    },
    [sortBy, sortDir, setQuery],
  );

  const ledgerHrefForPart = useCallback(
    (partCode: string) => {
      const p = new URLSearchParams();
      p.set('q', partCode);
      return `/dashboard/nx02/ledger?${p.toString()}`;
    },
    [],
  );

  return useMemo(
    () => ({
      qInput,
      setQInput,
      warehouseId,
      status,
      page,
      pageSize,
      sortBy,
      sortDir,
      rows,
      total,
      summary,
      warehouses,
      loading,
      error,
      setQuery,
      toggleSort,
      ledgerHrefForPart,
    }),
    [
      qInput,
      warehouseId,
      status,
      page,
      pageSize,
      sortBy,
      sortDir,
      rows,
      total,
      summary,
      warehouses,
      loading,
      error,
      setQuery,
      toggleSort,
      ledgerHrefForPart,
    ],
  );
}

export type BalanceVm = ReturnType<typeof useBalance>;
