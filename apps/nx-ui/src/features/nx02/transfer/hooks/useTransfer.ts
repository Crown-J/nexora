/**
 * File: apps/nx-ui/src/features/nx02/transfer/hooks/useTransfer.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-XFER-UI-HOOK-001：調撥列表
 * - NX02-XFER-UI-HOOK-002：調撥單新增／明細（草稿儲存、過帳、作廢）
 *
 * @FUNCTION_CODE NX02-XFER-UI-HOOK-001-F01
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  createTransfer,
  getTransfer,
  listTransfer,
  patchTransfer,
  postTransfer,
  voidTransfer,
} from '../api/transfer';
import type { TransferItemInput } from '../api/transfer';
import type { TransferDetailDto, TransferListResponse } from '../types';

/**
 * @FUNCTION_CODE NX02-XFER-UI-HOOK-001-F01
 */
export function useTransferList() {
  const [data, setData] = useState<TransferListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listTransfer({
        page,
        pageSize: 20,
        status: status || undefined,
      });
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, page, setPage, status, setStatus, reload: load };
}

export type TransferDraftRow = {
  tempKey: string;
  partId: string;
  partNo: string;
  partName: string;
  fromLocationId: string;
  toLocationId: string;
  qty: string;
  remark: string;
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rowsToPayload(rows: TransferDraftRow[]): TransferItemInput[] {
  return rows
    .filter((r) => r.partId.trim())
    .map((r) => ({
      partId: r.partId.trim(),
      qty: Number(r.qty),
      fromLocationId: r.fromLocationId.trim() || null,
      toLocationId: r.toLocationId.trim() || null,
      remark: r.remark.trim() || null,
    }));
}

function detailItemsToRows(d: TransferDetailDto): TransferDraftRow[] {
  return d.items.map((it) => ({
    tempKey: it.id,
    partId: it.partId,
    partNo: it.partNo,
    partName: it.partName,
    fromLocationId: it.fromLocationId ?? '',
    toLocationId: it.toLocationId ?? '',
    qty: String(it.qty),
    remark: it.remark ?? '',
  }));
}

/**
 * @FUNCTION_CODE NX02-XFER-UI-HOOK-002-F01
 * @param transferId 新建傳 undefined；明細傳 id
 */
export function useTransferDoc(transferId: string | undefined) {
  const router = useRouter();
  const [doc, setDoc] = useState<TransferDetailDto | null>(null);
  const [loading, setLoading] = useState(Boolean(transferId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [stDate, setStDate] = useState(todayYmd());
  const [remark, setRemark] = useState('');
  const [rows, setRows] = useState<TransferDraftRow[]>([]);

  const load = useCallback(async () => {
    if (!transferId) {
      setLoading(false);
      setDoc(null);
      setStDate(todayYmd());
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await getTransfer(transferId);
      setDoc(d);
      setFromWarehouseId(d.fromWarehouseId);
      setToWarehouseId(d.toWarehouseId);
      setStDate(d.stDate);
      setRemark(d.remark ?? '');
      setRows(detailItemsToRows(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isDraft = doc?.status === 'D' || !transferId;
  const readOnly = doc != null && doc.status !== 'D';

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const items = rowsToPayload(rows);
      if (!fromWarehouseId || !toWarehouseId) throw new Error('請選擇來源倉與目標倉');
      if (fromWarehouseId === toWarehouseId) throw new Error('來源倉與目標倉不可相同');
      if (!items.length) throw new Error('至少一筆明細');
      if (!transferId) {
        const created = await createTransfer({
          fromWarehouseId,
          toWarehouseId,
          stDate,
          remark: remark.trim() || null,
          items,
        });
        router.replace(`/dashboard/nx02/transfer/${created.id}`);
        return;
      }
      const updated = await patchTransfer(transferId, {
        stDate,
        remark: remark.trim() || null,
        items,
      });
      setDoc(updated);
      setRows(detailItemsToRows(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }, [fromWarehouseId, remark, rows, router, stDate, toWarehouseId, transferId]);

  const doPost = useCallback(async () => {
    if (!transferId) return;
    if (!window.confirm('確定過帳？過帳後將異動庫存與台帳。')) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await postTransfer(transferId);
      setDoc(updated);
      setRows(detailItemsToRows(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : '過帳失敗');
    } finally {
      setSaving(false);
    }
  }, [load, transferId]);

  const doVoid = useCallback(async () => {
    if (!transferId) return;
    if (!window.confirm('確定作廢此草稿？')) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await voidTransfer(transferId);
      setDoc(updated);
      setRows(detailItemsToRows(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : '作廢失敗');
    } finally {
      setSaving(false);
    }
  }, [transferId]);

  const addRow = useCallback(() => {
    const tempKey =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `t-${Date.now()}`;
    setRows((prev) => [
      ...prev,
      {
        tempKey,
        partId: '',
        partNo: '',
        partName: '',
        fromLocationId: '',
        toLocationId: '',
        qty: '1',
        remark: '',
      },
    ]);
  }, []);

  const removeRow = useCallback((tempKey: string) => {
    setRows((prev) => prev.filter((r) => r.tempKey !== tempKey));
  }, []);

  const updateRow = useCallback((tempKey: string, patch: Partial<TransferDraftRow>) => {
    setRows((prev) => prev.map((r) => (r.tempKey === tempKey ? { ...r, ...patch } : r)));
  }, []);

  const backToList = useCallback(() => {
    router.push('/dashboard/nx02/transfer');
  }, [router]);

  const warehousesLocked = Boolean(transferId);

  return {
    doc,
    loading,
    saving,
    error,
    fromWarehouseId,
    setFromWarehouseId,
    toWarehouseId,
    setToWarehouseId,
    stDate,
    setStDate,
    remark,
    setRemark,
    rows,
    setRows,
    isDraft,
    readOnly,
    save,
    post: doPost,
    voidDoc: doVoid,
    reload: load,
    addRow,
    removeRow,
    updateRow,
    backToList,
    warehousesLocked,
  };
}
