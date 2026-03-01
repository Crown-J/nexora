/**
 * File: apps/nx-ui/src/features/nx00/lookups/hooks/useBrandLookup.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOOKUPS-BRAND-001：Brand lookup（options for select）
 */

'use client';

import { useMemo } from 'react';
import { listLookupBrand } from '@/features/nx00/lookup/api/lookup';
import { useLookupCache } from '@/features/nx00/lookup/hooks/useLookupCache';
import type { SelectOption } from '@/features/nx00/lookup/types';

function toLabel(code: string, name: string) {
    const c = (code ?? '').trim();
    const n = (name ?? '').trim();
    if (c && n) return `${c} ${n}`;
    return c || n || '-';
}

export function useBrandLookup(isActive: boolean = true) {
    const cache = useLookupCache(
        () => listLookupBrand({ isActive }),
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