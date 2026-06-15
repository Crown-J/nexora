/**
 * Car brand lookup — 表單下拉用
 * W6-Phase 4a 2026-06-06：底層 listLookupCarBrand 已切 nx01/brands + isCar=true、本 hook 介面不變
 */

'use client';

import { useMemo } from 'react';
import { listLookupCarBrand } from '@/features/shared/master/lookup/api/lookup';
import { useLookupCache } from '@/features/shared/master/lookup/hooks/useLookupCache';
import type { SelectOption } from '@data/types/shared/master/lookup';

function toLabel(code: string, name: string) {
  const c = (code ?? '').trim();
  const n = (name ?? '').trim();
  if (c && n) return `${c} — ${n}`;
  return c || n || '-';
}

export function useCarBrandLookup(isActive: boolean = true) {
  const cache = useLookupCache(
    () => listLookupCarBrand({ isActive }),
    [],
  );

  const options = useMemo<SelectOption[]>(() => {
    return (cache.data ?? []).map((r) => ({
      value: r.id,
      label: toLabel(r.code, r.name),
      code: r.code,
      name: r.name,
      disabled: !r.isActive,
    }));
  }, [cache.data]);

  return { ...cache, options } as const;
}
