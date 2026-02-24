/**
 * File: apps/nx-ui/src/shared/hooks/useListLocalPref.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-LISTPREF-001：List preference（localStorage / account scoped）
 *
 * Notes:
 * - 避免 Maximum update depth：defaultValue 用 ref 固定，不放進讀取 effect 依賴
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getToken } from '@/features/auth/token';
import { decodeJwtSub } from '@/shared/lib/jwt';

function getLS(key: string) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}
function setLS(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // ignore
    }
}

export type ListLocalPref<T> = {
    version: number;
    value: T;
};

export function useListLocalPref<T>(prefKey: string, version: number, defaultValue: T) {
    const defaultRef = useRef<T>(defaultValue);
    // 若你希望 defaultValue 改變時也能更新 defaultRef（通常不需要），可以加一行：
    // defaultRef.current = defaultValue;

    const scopedKey = useMemo(() => {
        const sub = decodeJwtSub(getToken());
        return `nx.pref.${sub ?? 'guest'}.${prefKey}`;
    }, [prefKey]);

    const [value, setValue] = useState<T>(defaultRef.current);
    const [ready, setReady] = useState(false);

    // ✅ 讀取 localStorage：只依賴 scopedKey/version（不要依賴 defaultValue）
    useEffect(() => {
        const raw = getLS(scopedKey);
        if (!raw) {
            setValue(defaultRef.current);
            setReady(true);
            return;
        }

        try {
            const parsed = JSON.parse(raw) as ListLocalPref<T> | null;
            if (!parsed || parsed.version !== version || parsed.value === undefined) {
                setValue(defaultRef.current);
            } else {
                setValue(parsed.value);
            }
        } catch {
            setValue(defaultRef.current);
        } finally {
            setReady(true);
        }
    }, [scopedKey, version]);

    // ✅ 寫回 localStorage：ready 後才寫
    useEffect(() => {
        if (!ready) return;
        const payload: ListLocalPref<T> = { version, value };
        setLS(scopedKey, JSON.stringify(payload));
    }, [scopedKey, version, value, ready]);

    return { value, setValue, ready, scopedKey } as const;
}