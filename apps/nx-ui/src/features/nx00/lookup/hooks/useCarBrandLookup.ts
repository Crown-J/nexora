/**
 * Car brand lookup（nx00_car_brand）— 表單下拉用
 */

'use client';

import { useMemo } from 'react';
import { listLookupCarBrand } from '@/features/nx00/lookup/api/lookup';
import { useLookupCache } from '@/features/nx00/lookup/hooks/useLookupCache';
import type { SelectOption } from '@/features/nx00/lookup/types';

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
