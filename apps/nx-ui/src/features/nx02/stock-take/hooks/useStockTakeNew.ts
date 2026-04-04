/**
 * File: apps/nx-ui/src/features/nx02/stock-take/hooks/useStockTakeNew.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-UI-HOOK-003：新增盤點單
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createStockTake } from '../api/stock-take';

function utcTodayYmd(): string {
  const n = new Date();
  const y = n.getUTCFullYear();
  const m = String(n.getUTCMonth() + 1).padStart(2, '0');
  const d = String(n.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @FUNCTION_CODE NX02-STTK-UI-HOOK-003-F01
 */
export function useStockTakeNew() {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState('');
  const [stockTakeDate, setStockTakeDate] = useState(utcTodayYmd());
  const [scopeType, setScopeType] = useState<'F' | 'P'>('F');
  const [selectedParts, setSelectedParts] = useState<{ id: string; code: string; name: string }[]>(
    [],
  );
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scopeType === 'F') setSelectedParts([]);
  }, [scopeType]);

  const addPart = useCallback((p: { id: string; code: string; name: string }) => {
    setSelectedParts((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
  }, []);

  const removePart = useCallback((id: string) => {
    setSelectedParts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const submit = useCallback(async () => {
    if (!warehouseId.trim()) {
      setError('請選倉庫');
      return;
    }
    if (scopeType === 'P' && selectedParts.length === 0) {
      setError('部分盤點請至少選擇一個零件');
      return;
    }
    const partIds = scopeType === 'P' ? selectedParts.map((p) => p.id) : undefined;
    setSaving(true);
    setError(null);
    try {
      const d = await createStockTake({
        warehouseId: warehouseId.trim(),
        stockTakeDate,
        scopeType,
        remark: remark.trim() || null,
        partIds,
      });
      router.push(`/dashboard/nx02/stock-take/${d.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setSaving(false);
    }
  }, [warehouseId, stockTakeDate, scopeType, selectedParts, remark, router]);

  const back = useCallback(() => router.push('/dashboard/nx02/stock-take'), [router]);

  return useMemo(
    () => ({
      warehouseId,
      setWarehouseId,
      stockTakeDate,
      setStockTakeDate,
      scopeType,
      setScopeType,
      selectedParts,
      addPart,
      removePart,
      remark,
      setRemark,
      saving,
      error,
      submit,
      back,
    }),
    [
      warehouseId,
      stockTakeDate,
      scopeType,
      selectedParts,
      addPart,
      removePart,
      remark,
      saving,
      error,
      submit,
      back,
    ],
  );
}

export type StockTakeNewVm = ReturnType<typeof useStockTakeNew>;
