/**
 * File: apps/nx-ui/src/features/nx02/init/hooks/useInitCreate.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-UI-HOOK-003：新增開帳存草稿
 *
 * Notes:
 * - @FUNCTION_CODE NX02-INIT-UI-003-F01
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createInit } from '../api/init';

import type { DraftItem } from './useInitDetail';

function draftsToPayload(rows: DraftItem[]) {
  return rows.map((r) => ({
    partId: r.partId.trim(),
    locationId: r.locationId.trim() || null,
    qty: Number(r.qty),
    unitCost: Number(r.unitCost),
    remark: r.remark.trim() || null,
  }));
}

function utcTodayYmd(): string {
  const n = new Date();
  const y = n.getUTCFullYear();
  const m = String(n.getUTCMonth() + 1).padStart(2, '0');
  const d = String(n.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @FUNCTION_CODE NX02-INIT-UI-003-F01
 */
export function useInitCreate() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [initDate, setInitDate] = useState(utcTodayYmd());
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<DraftItem[]>([
    {
      tempKey: 'n1',
      partId: '',
      partNo: '',
      partName: '',
      locationId: '',
      qty: '',
      unitCost: '',
      remark: '',
    },
  ]);

  const addRow = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        tempKey: `n-${Date.now()}`,
        partId: '',
        partNo: '',
        partName: '',
        locationId: '',
        qty: '',
        unitCost: '',
        remark: '',
      },
    ]);
  }, []);

  const removeRow = useCallback((tempKey: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.tempKey !== tempKey)));
  }, []);

  const updateRow = useCallback((tempKey: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((x) => (x.tempKey === tempKey ? { ...x, ...patch } : x)));
  }, []);

  const submit = useCallback(async () => {
    if (!warehouseId.trim()) {
      setError('請選擇倉庫');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createInit({
        warehouseId: warehouseId.trim(),
        initDate,
        remark: remark.trim() || null,
        items: draftsToPayload(items),
      });
      router.push(`/dashboard/nx02/init/${created.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setSaving(false);
    }
  }, [warehouseId, initDate, remark, items, router]);

  const backToList = useCallback(() => {
    router.push('/dashboard/nx02/init');
  }, [router]);

  return useMemo(
    () => ({
      saving,
      error,
      warehouseId,
      setWarehouseId,
      initDate,
      setInitDate,
      remark,
      setRemark,
      items,
      addRow,
      removeRow,
      updateRow,
      submit,
      backToList,
    }),
    [
      saving,
      error,
      warehouseId,
      initDate,
      remark,
      items,
      addRow,
      removeRow,
      updateRow,
      submit,
      backToList,
    ],
  );
}

export type InitCreateVm = ReturnType<typeof useInitCreate>;
