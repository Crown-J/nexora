/**
 * File: apps/nx-ui/src/features/nx02/ledger/hooks/useLedger.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-LED-UI-HOOK-001：庫存台帳 URL 狀態 + 列表；補預設本月區間；前端區間 ≤92 天檢查
 *
 * Notes:
 * - @FUNCTION_CODE NX02-LED-UI-001-F01
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { parsePositiveInt } from '@/shared/lib/parse';

import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';
import type { WarehouseOption } from '../../balance/types';
import { listLedger } from '../api/ledger';
import type { LedgerRowDto } from '../types';

const MAX_RANGE_DAYS = 92;

function utcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthStartYmd(): string {
  const n = new Date();
  return utcYmd(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)));
}

function rangeDayCount(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00.000Z`).getTime();
  const b = new Date(`${to}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 999;
  return Math.floor((b - a) / 86400000) + 1;
}

export function useLedger() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    const df = sp.get('dateFrom');
    const dt = sp.get('dateTo');
    if (df && dt) {
      seededRef.current = true;
      return;
    }
    const next = new URLSearchParams(sp.toString());
    if (!df) next.set('dateFrom', monthStartYmd());
    if (!dt) next.set('dateTo', utcYmd(new Date()));
    seededRef.current = true;
    router.replace(`${pathname}?${next.toString()}`);
  }, [sp, router, pathname]);

  const warehouseId = sp.get('warehouseId') ?? '';
  const movementType = sp.get('movementType') ?? '';
  const sourceDocType = sp.get('sourceDocType') ?? '';
  const dateFrom = sp.get('dateFrom') ?? '';
  const dateTo = sp.get('dateTo') ?? '';
  const page = parsePositiveInt(sp.get('page'), 1);
  const pageSize = parsePositiveInt(sp.get('pageSize'), 20);
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
      router.replace(`${pathname}?${next.toString()}`);
    },
    [sp, router, pathname],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = qInput.trim();
      if (trimmed === qUrl.trim()) return;
      setQuery({ q: trimmed || null, page: '1' });
    }, 300);
    return () => window.clearTimeout(t);
  }, [qInput, qUrl, setQuery]);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
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

  const [rows, setRows] = useState<LedgerRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeError = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    const n = rangeDayCount(dateFrom, dateTo);
    if (n > MAX_RANGE_DAYS) return `日期區間不可超過 ${MAX_RANGE_DAYS} 天（約 3 個月）`;
    if (n < 1) return '結束日需大於或等於起始日';
    return null;
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!dateFrom || !dateTo || rangeError) {
      setRows([]);
      setTotal(0);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    listLedger({
      q: qUrl || undefined,
      warehouseId: warehouseId || undefined,
      movementType: movementType || undefined,
      sourceDocType: sourceDocType || undefined,
      dateFrom,
      dateTo,
      page,
      pageSize,
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
  }, [qUrl, warehouseId, movementType, sourceDocType, dateFrom, dateTo, page, pageSize, rangeError]);

  return useMemo(
    () => ({
      qInput,
      setQInput,
      warehouseId,
      movementType,
      sourceDocType,
      dateFrom,
      dateTo,
      page,
      pageSize,
      rows,
      total,
      loading,
      error,
      rangeError,
      setQuery,
      warehouses,
    }),
    [
      qInput,
      warehouseId,
      movementType,
      sourceDocType,
      dateFrom,
      dateTo,
      page,
      pageSize,
      rows,
      total,
      loading,
      error,
      rangeError,
      setQuery,
      warehouses,
    ],
  );
}

export type LedgerVm = ReturnType<typeof useLedger>;
