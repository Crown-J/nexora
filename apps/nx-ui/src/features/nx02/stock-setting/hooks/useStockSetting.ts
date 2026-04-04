/**
 * File: apps/nx-ui/src/features/nx02/stock-setting/hooks/useStockSetting.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STKG-UI-HOOK-001：庫存設定左清單＋右表單
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { parsePositiveInt } from '@/shared/lib/parse';

import {
  createStockSetting,
  getStockSetting,
  listStockSetting,
  patchStockSetting,
  setStockSettingActive,
} from '../api/stock-setting';
import type { StockSettingRowDto } from '../types';

/**
 * @FUNCTION_CODE NX02-STKG-UI-HOOK-001-F01
 */
export function useStockSetting() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const qUrl = sp.get('q') ?? '';
  const warehouseId = sp.get('warehouseId') ?? '';
  const hasMinQty = sp.get('hasMinQty') === 'true';
  const page = parsePositiveInt(sp.get('page'), 1);
  const pageSize = parsePositiveInt(sp.get('pageSize'), 20);
  const selectedId = sp.get('id') ?? '';

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

  const [qInput, setQInput] = useState(qUrl);
  useEffect(() => setQInput(qUrl), [qUrl]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const t = qInput.trim();
      if (t === qUrl.trim()) return;
      setQuery({ q: t || null, page: '1' });
    }, 300);
    return () => window.clearTimeout(t);
  }, [qInput, qUrl, setQuery]);

  const [rows, setRows] = useState<StockSettingRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listStockSetting({
      q: qUrl || undefined,
      warehouseId: warehouseId || undefined,
      hasMinQty,
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
  }, [qUrl, warehouseId, hasMinQty, page, pageSize]);

  const [form, setForm] = useState<StockSettingRowDto | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const selectRow = useCallback(
    (id: string | null) => {
      setQuery({ id: id || null, page: String(page) });
      setIsNew(false);
    },
    [setQuery, page],
  );

  useEffect(() => {
    if (!selectedId) {
      setForm(null);
      return;
    }
    if (isNew) return;
    let alive = true;
    setFormLoading(true);
    getStockSetting(selectedId)
      .then((r) => {
        if (alive) setForm(r);
      })
      .catch(() => {
        if (alive) setForm(null);
      })
      .finally(() => {
        if (alive) setFormLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedId, isNew]);

  const startNew = useCallback(() => {
    setIsNew(true);
    setQuery({ id: null });
    setForm({
      id: '',
      partId: '',
      partCode: '',
      partName: '',
      warehouseId: warehouseId || '',
      warehouseName: '',
      minQty: 0,
      maxQty: 0,
      reorderQty: 0,
      onHandQty: 0,
      availableQty: 0,
      isShortage: false,
      isActive: true,
      remark: null,
    });
  }, [setQuery, warehouseId]);

  const save = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      if (isNew || !form.id) {
        if (!form.partId.trim() || !form.warehouseId.trim()) {
          setError('請填零件與倉庫');
          return;
        }
        const created = await createStockSetting({
          partId: form.partId.trim(),
          warehouseId: form.warehouseId.trim(),
          minQty: form.minQty,
          maxQty: form.maxQty,
          isActive: form.isActive,
          remark: form.remark,
        });
        setIsNew(false);
        setQuery({ id: created.id });
        setForm(created);
      } else {
        const updated = await patchStockSetting(form.id, {
          minQty: form.minQty,
          maxQty: form.maxQty,
          remark: form.remark,
        });
        setForm(updated);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }, [form, isNew, setQuery]);

  const toggleActive = useCallback(async () => {
    if (!form?.id) return;
    setSaving(true);
    try {
      const updated = await setStockSettingActive(form.id, !form.isActive);
      setForm(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '更新失敗');
    } finally {
      setSaving(false);
    }
  }, [form]);

  const reorderPreview =
    form && form.maxQty > 0 ? Math.max(0, form.maxQty - form.onHandQty) : 0;

  return useMemo(
    () => ({
      qInput,
      setQInput,
      warehouseId,
      hasMinQty,
      page,
      pageSize,
      rows,
      total,
      loading,
      error,
      setQuery,
      selectedId,
      selectRow,
      form,
      setForm,
      formLoading,
      saving,
      isNew,
      startNew,
      save,
      toggleActive,
      reorderPreview,
    }),
    [
      qInput,
      warehouseId,
      hasMinQty,
      page,
      pageSize,
      rows,
      total,
      loading,
      error,
      setQuery,
      selectedId,
      selectRow,
      form,
      formLoading,
      saving,
      isNew,
      startNew,
      save,
      toggleActive,
      reorderPreview,
    ],
  );
}

export type StockSettingVm = ReturnType<typeof useStockSetting>;
