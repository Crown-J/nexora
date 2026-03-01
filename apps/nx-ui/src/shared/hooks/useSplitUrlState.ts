/**
 * File: apps/nx-ui/src/shared/hooks/useSplitUrlState.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - SHARED-HOOK-SPLIT-URL-001：Split URL State（SSOT）
 *
 * Notes:
 * - 封裝 next/navigation 的 query 讀取與 patch 更新
 * - 讓各模組 split hook 不再重複 setQuery / parse page/pageSize/id/mode
 */

'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { parsePositiveInt, trimOrEmpty } from '@/shared/lib/parse';

export type SplitMode = 'empty' | 'new' | 'edit';

export type SplitUrlState = {
    q: string;
    page: number;
    pageSize: number;
    selectedId: string;
    modeParam: string | null;
    splitMode: SplitMode;
    setQuery: (patch: Record<string, string | null | undefined>) => void;
};

export function useSplitUrlState(defaults?: { pageSize?: number }): SplitUrlState {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();

    const q = useMemo(() => trimOrEmpty(sp.get('q')), [sp]);
    const page = useMemo(() => parsePositiveInt(sp.get('page'), 1), [sp]);
    const pageSize = useMemo(() => parsePositiveInt(sp.get('pageSize'), defaults?.pageSize ?? 20), [sp, defaults]);
    const selectedId = useMemo(() => sp.get('id') ?? '', [sp]);
    const modeParam = useMemo(() => sp.get('mode'), [sp]); // 'new' | null

    const splitMode: SplitMode = useMemo(() => {
        if (modeParam === 'new') return 'new';
        if (selectedId) return 'edit';
        return 'empty';
    }, [modeParam, selectedId]);

    const setQuery = useCallback(
        (patch: Record<string, string | null | undefined>) => {
            const next = new URLSearchParams(sp.toString());
            Object.entries(patch).forEach(([k, v]) => {
                if (v === null || v === undefined || v === '') next.delete(k);
                else next.set(k, String(v));
            });
            const qs = next.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
        },
        [sp, router, pathname],
    );

    return { q, page, pageSize, selectedId, modeParam, splitMode, setQuery };
}