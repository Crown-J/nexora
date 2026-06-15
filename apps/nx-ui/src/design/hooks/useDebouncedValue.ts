/**
 * File: apps/nx-ui/src/shared/hooks/useDebouncedValue.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-DEBOUNCE-001：Debounced value hook（輸入延遲）
 *
 * Notes:
 * - 常用於搜尋輸入：使用者輸入停止一段時間後才觸發查詢
 */

'use client';

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number) {
    const [debounced, setDebounced] = useState<T>(value);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);

    return debounced;
}