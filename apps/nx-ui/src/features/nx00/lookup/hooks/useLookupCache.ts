/**
 * File: apps/nx-ui/src/features/nx00/lookups/hooks/useLookupCache.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOOKUPS-HOOK-001：Lookup cache helper（避免重複抓取）
 *
 * Notes:
 * - LITE：同一頁 session 內快取（hook 記憶）
 * - 之後要全域快取可改成 zustand 或 react-query
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CacheState<T> = {
    ready: boolean;
    loading: boolean;
    error: string | null;
    data: T;
};

export function useLookupCache<T>(loader: () => Promise<T>, defaultValue: T) {
    const cacheRef = useRef<T | null>(null);

    const [state, setState] = useState<CacheState<T>>({
        ready: false,
        loading: false,
        error: null,
        data: defaultValue,
    });

    const load = useCallback(async () => {
        // 已有 cache 直接回填
        if (cacheRef.current) {
            setState({ ready: true, loading: false, error: null, data: cacheRef.current });
            return;
        }

        setState((p) => ({ ...p, loading: true, error: null }));
        try {
            const data = await loader();
            cacheRef.current = data;
            setState({ ready: true, loading: false, error: null, data });
        } catch (e: any) {
            setState((p) => ({
                ...p,
                ready: true,
                loading: false,
                error: e?.message ?? '載入失敗',
            }));
        }
    }, [loader]);

    useEffect(() => {
        void load();
    }, [load]);

    return { ...state, reload: load } as const;
}