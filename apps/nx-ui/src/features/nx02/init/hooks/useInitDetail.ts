/**
 * File: apps/nx-ui/src/features/nx02/init/hooks/useInitDetail.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-UI-HOOK-002：開帳存明細載入／儲存／過帳／作廢
 *
 * Notes:
 * - @FUNCTION_CODE NX02-INIT-UI-002-F01
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getInit, patchInit, postInit, voidInit } from '../api/init';
import type { InitDetailDto, InitItemDto } from '../types';

import type { InitItemInput } from '../api/init';

export type DraftItem = {
  tempKey: string;
  partId: string;
  partNo: string;
  partName: string;
  locationId: string;
  qty: string;
  unitCost: string;
  remark: string;
};

function itemToDraft(it: InitItemDto): DraftItem {
  return {
    tempKey: it.id,
    partId: it.partId,
    partNo: it.partNo,
    partName: it.partName,
    locationId: it.locationId ?? '',
    qty: String(it.qty),
    unitCost: String(it.unitCost),
    remark: it.remark ?? '',
  };
}

function draftsToPayload(rows: DraftItem[]): InitItemInput[] {
  return rows.map((r) => ({
    partId: r.partId.trim(),
    locationId: r.locationId.trim() || null,
    qty: Number(r.qty),
    unitCost: Number(r.unitCost),
    remark: r.remark.trim() || null,
  }));
}

/**
 * @FUNCTION_CODE NX02-INIT-UI-002-F01
 */
export function useInitDetail(initId: string) {
  const router = useRouter();
  const [doc, setDoc] = useState<InitDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [initDate, setInitDate] = useState('');
  const [remark, setRemark] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getInit(initId);
      setDoc(d);
      setInitDate(d.initDate);
      setRemark(d.remark ?? '');
      setWarehouseId(d.warehouseId);
      setItems(d.items.map(itemToDraft));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [initId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isDraft = doc?.status === 'D';

  const save = useCallback(async () => {
    if (!doc || !isDraft) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await patchInit(doc.id, {
        initDate,
        remark: remark || null,
        items: draftsToPayload(items),
      });
      setDoc(updated);
      setItems(updated.items.map(itemToDraft));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }, [doc, isDraft, initDate, remark, items]);

  const post = useCallback(async () => {
    if (!doc || !isDraft) return;
    if (!window.confirm('確定過帳？過帳後將寫入庫存台帳與餘額。')) return;
    setSaving(true);
    setError(null);
    try {
      await patchInit(doc.id, {
        initDate,
        remark: remark || null,
        items: draftsToPayload(items),
      });
      const updated = await postInit(doc.id);
      setDoc(updated);
      setItems(updated.items.map(itemToDraft));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '過帳失敗');
    } finally {
      setSaving(false);
    }
  }, [doc, isDraft, initDate, remark, items]);

  const voidDoc = useCallback(async () => {
    if (!doc || !isDraft) return;
    if (!window.confirm('確定作廢此草稿？')) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await voidInit(doc.id);
      setDoc(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '作廢失敗');
    } finally {
      setSaving(false);
    }
  }, [doc, isDraft]);

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
    setItems((prev) => prev.filter((x) => x.tempKey !== tempKey));
  }, []);

  const updateRow = useCallback((tempKey: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((x) => (x.tempKey === tempKey ? { ...x, ...patch } : x)));
  }, []);

  const backToList = useCallback(() => {
    router.push('/dashboard/nx02/init');
  }, [router]);

  return useMemo(
    () => ({
      doc,
      loading,
      saving,
      error,
      initDate,
      setInitDate,
      remark,
      setRemark,
      warehouseId,
      setWarehouseId,
      items,
      isDraft,
      save,
      post,
      voidDoc,
      addRow,
      removeRow,
      updateRow,
      reload: load,
      backToList,
    }),
    [
      doc,
      loading,
      saving,
      error,
      initDate,
      remark,
      warehouseId,
      items,
      isDraft,
      save,
      post,
      voidDoc,
      addRow,
      removeRow,
      updateRow,
      load,
      backToList,
    ],
  );
}

export type InitDetailVm = ReturnType<typeof useInitDetail>;
