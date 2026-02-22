/**
 * File: features/nx00/parts/hooks/usePartsList.ts
 * Purpose:
 * - NX00-UI-PARTS-LIST-HOOK-001
 * - 集中管理 Parts List 的狀態 / reload / filter / toggleActive
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { listParts, setPartActive } from '@/features/nx00/parts/api/parts';
import { listBrands, listFunctionGroups, listPartStatuses } from '@/features/nx00/lookups/api/lookups';

import type { PartRow } from '@/features/nx00/parts/types';
import type { LookupRow, PartStatusRow } from '@/features/nx00/lookups/types';

function safeInt(v: string | null, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

export function usePartsList() {
  const router = useRouter();
  const sp = useSearchParams();

  // ======================
  // Query
  // ======================
  const page = safeInt(sp.get('page'), 1);
  const pageSize = safeInt(sp.get('pageSize'), 20);

  const keyword = sp.get('keyword') || '';
  const brandId = sp.get('brandId') || '';
  const functionGroupId = sp.get('functionGroupId') || '';
  const statusId = sp.get('statusId') || '';
  const isActive = sp.get('isActive') || '';

  const sortBy = (sp.get('sortBy') || 'partNo') as 'partNo' | 'nameZh' | 'createdAt';
  const sortDir = (sp.get('sortDir') || 'asc') as 'asc' | 'desc';

  // ======================
  // State
  // ======================
  const [items, setItems] = useState<PartRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [brands, setBrands] = useState<LookupRow[]>([]);
  const [functionGroups, setFunctionGroups] = useState<LookupRow[]>([]);
  const [partStatuses, setPartStatuses] = useState<PartStatusRow[]>([]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  // ======================
  // Navigation helper
  // ======================
  const go = useCallback(
    (params: Record<string, any>) => {
      const next = new URLSearchParams(sp.toString());

      Object.entries(params).forEach(([k, v]) => {
        if (v === '' || v === undefined) next.delete(k);
        else next.set(k, String(v));
      });

      router.replace(`/dashboard/nx00/parts?${next.toString()}`);
    },
    [router, sp]
  );

  // ======================
  // Load lookups
  // ======================
  const loadLookups = useCallback(async () => {
    const [b, fg, ps] = await Promise.all([
      listBrands({ isActive: true }),
      listFunctionGroups({ isActive: true }),
      listPartStatuses({ isActive: true }),
    ]);

    setBrands(b);
    setFunctionGroups(fg);
    setPartStatuses(ps);
  }, []);

  // ======================
  // Reload list
  // ======================
  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const r = await listParts({
        keyword: keyword || undefined,
        brandId: brandId || undefined,
        functionGroupId: functionGroupId || undefined,
        statusId: statusId || undefined,
        isActive: isActive === '' ? undefined : isActive === 'true',
        page,
        pageSize,
        sortBy,
        sortDir,
      });

      setItems(r.items);
      setTotal(r.total);
    } catch (e: any) {
      setErr(e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [
    brandId,
    functionGroupId,
    isActive,
    keyword,
    page,
    pageSize,
    sortBy,
    sortDir,
    statusId,
  ]);

  // ======================
  // Toggle active
  // ======================
  const toggleActive = useCallback(async (row: PartRow) => {
    const next = !row.isActive;

    setItems((prev) =>
      prev.map((x) => (x.id === row.id ? { ...x, isActive: next } : x))
    );

    try {
      await setPartActive(row.id, next);
    } catch (e) {
      setItems((prev) =>
        prev.map((x) => (x.id === row.id ? { ...x, isActive: !next } : x))
      );
    }
  }, []);

  // ======================
  // Effects
  // ======================
  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    query: {
      page,
      pageSize,
      keyword,
      brandId,
      functionGroupId,
      statusId,
      isActive,
      sortBy,
      sortDir,
    },
    state: {
      items,
      total,
      totalPages,
      loading,
      err,
      brands,
      functionGroups,
      partStatuses,
    },
    actions: {
      go,
      reload,
      toggleActive,
    },
  };
}