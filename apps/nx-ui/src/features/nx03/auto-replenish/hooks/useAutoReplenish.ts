/**
 * File: apps/nx-ui/src/features/nx02/auto-replenish/hooks/useAutoReplenish.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-AURE-UI-HOOK-001：自動補貨規則左清單＋右表單
 *
 * @FUNCTION_CODE NX02-AURE-UI-HOOK-001-F01
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createAutoReplenish,
  deleteAutoReplenish,
  getAutoReplenish,
  listAutoReplenish,
  patchAutoReplenish,
  setAutoReplenishActive,
} from '../api/auto-replenish';
import type { AutoReplenishDetail, AutoReplenishRow } from '../types';

export type AutoReplenishFormState = {
  fromWarehouseId: string;
  toWarehouseId: string;
  priority: string;
  remark: string;
  isActive: boolean;
};

const emptyForm = (): AutoReplenishFormState => ({
  fromWarehouseId: '',
  toWarehouseId: '',
  priority: '1',
  remark: '',
  isActive: true,
});

function detailToForm(d: AutoReplenishDetail): AutoReplenishFormState {
  return {
    fromWarehouseId: d.fromWarehouseId,
    toWarehouseId: d.toWarehouseId,
    priority: String(d.priority),
    remark: d.remark ?? '',
    isActive: d.isActive,
  };
}

/**
 * @FUNCTION_CODE NX02-AURE-UI-HOOK-001-F01
 */
export function useAutoReplenish() {
  const [rows, setRows] = useState<AutoReplenishRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<AutoReplenishFormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listAutoReplenish();
      setRows(r.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const selectRow = useCallback(
    async (id: string) => {
      setIsNew(false);
      setSelectedId(id);
      setSaving(false);
      setError(null);
      try {
        const d = await getAutoReplenish(id);
        setForm(detailToForm(d));
      } catch (e) {
        setError(e instanceof Error ? e.message : '載入規則失敗');
      }
    },
    [],
  );

  const startNew = useCallback(() => {
    setIsNew(true);
    setSelectedId(null);
    setForm(emptyForm());
    setError(null);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const priority = Math.floor(Number(form.priority));
      if (!Number.isFinite(priority) || priority < 0) throw new Error('優先順序須為非負整數');
      if (!form.fromWarehouseId || !form.toWarehouseId) throw new Error('請選擇來源倉與目標倉');
      if (form.fromWarehouseId === form.toWarehouseId) throw new Error('來源倉與目標倉不可相同');

      if (isNew) {
        const d = await createAutoReplenish({
          fromWarehouseId: form.fromWarehouseId,
          toWarehouseId: form.toWarehouseId,
          priority,
          isActive: form.isActive,
          remark: form.remark.trim() || null,
        });
        setIsNew(false);
        setSelectedId(d.id);
        setForm(detailToForm(d));
      } else if (selectedId) {
        const d = await patchAutoReplenish(selectedId, {
          fromWarehouseId: form.fromWarehouseId,
          toWarehouseId: form.toWarehouseId,
          priority,
          remark: form.remark.trim() || null,
        });
        setForm(detailToForm(d));
      }
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }, [form, isNew, loadList, selectedId]);

  const remove = useCallback(async () => {
    if (!selectedId || isNew) return;
    if (!window.confirm('刪除此規則？')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteAutoReplenish(selectedId);
      setSelectedId(null);
      setForm(emptyForm());
      setIsNew(false);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '刪除失敗');
    } finally {
      setSaving(false);
    }
  }, [isNew, loadList, selectedId]);

  const toggleActive = useCallback(
    async (next: boolean) => {
      if (!selectedId || isNew) return;
      setSaving(true);
      setError(null);
      try {
        await setAutoReplenishActive(selectedId, next);
        setForm((f) => ({ ...f, isActive: next }));
        await loadList();
      } catch (e) {
        setError(e instanceof Error ? e.message : '更新失敗');
      } finally {
        setSaving(false);
      }
    },
    [isNew, loadList, selectedId],
  );

  return {
    rows,
    loading,
    error,
    selectedId,
    isNew,
    form,
    setForm,
    selectRow,
    startNew,
    save,
    remove,
    toggleActive,
    saving,
    reload: loadList,
  };
}
