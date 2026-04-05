/**
 * File: apps/nx-ui/src/features/nx02/shortage/hooks/useShortage.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-SHOR-UI-HOOK-001：缺貨簿列表、批次轉 RFQ、忽略
 *
 * @FUNCTION_CODE NX02-SHOR-UI-HOOK-001-F01
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

import { ignoreShortage, listShortage, shortageToRfq } from '../api/shortage';
import type { ShortageListResponse } from '../types';

/**
 * @FUNCTION_CODE NX02-SHOR-UI-HOOK-001-F01
 */
export function useShortage() {
  const [data, setData] = useState<ShortageListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qInput, setQInput] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [status, setStatus] = useState('O');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listShortage({
        q: appliedQ || undefined,
        warehouseId: warehouseId || undefined,
        status: status || undefined,
        page,
        pageSize: 20,
      });
      setData(r);
      setSelected({});
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [appliedQ, page, status, warehouseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const toggleAllOnPage = (on: boolean) => {
    if (!data) return;
    const next = { ...selected };
    for (const r of data.rows) {
      if (r.status === 'O') next[r.id] = on;
    }
    setSelected(next);
  };

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const toRfq = async () => {
    if (!selectedIds.length) return;
    setBusy(true);
    setError(null);
    try {
      const { rfqId } = await shortageToRfq(selectedIds);
      await load();
      window.alert(`已建立 RFQ：${rfqId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '轉 RFQ 失敗');
    } finally {
      setBusy(false);
    }
  };

  const ignore = async (id: string) => {
    if (!window.confirm('忽略此筆缺貨紀錄？')) return;
    setBusy(true);
    setError(null);
    try {
      await ignoreShortage(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗');
    } finally {
      setBusy(false);
    }
  };

  return {
    data,
    loading,
    error,
    qInput,
    setQInput,
    warehouseId,
    setWarehouseId,
    status,
    setStatus,
    page,
    setPage,
    selected,
    toggle,
    toggleAllOnPage,
    selectedIds,
    toRfq,
    ignore,
    busy,
    reload: load,
    search: () => {
      setAppliedQ(qInput.trim());
      setPage(1);
    },
  };
}
