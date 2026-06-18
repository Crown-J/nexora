// apps/nx-ui/src/features/nx01/shell/ui/columns-config/useColumnsPref.ts
// 2026-06-18 主檔欄位偏好（顯示 / 順序 + localStorage 記憶 + 還原預設）
//   - storageKey 跨頁獨立、跨 session 持久
//   - 過濾掉 allKeys 不存在的條目（schema 演進時自動忽略過時 key）
//   - 預設值落空時 fallback all
'use client';

import { useCallback, useEffect, useState } from 'react';

export function useColumnsPref(
  storageKey: string,
  defaultVisibleKeys: string[],
  allKeys: string[],
): {
  visibleKeys: string[];
  setVisibleKeys: (next: string[]) => void;
  resetToDefault: () => void;
  hiddenCount: number;
} {
  const [visibleKeys, setVisibleKeysInternal] = useState<string[]>(defaultVisibleKeys);

  // mount 時從 localStorage 讀
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((k): k is string => typeof k === 'string' && allKeys.includes(k));
      if (valid.length > 0) setVisibleKeysInternal(valid);
    } catch {
      // ignore parse errors、fallback default
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const setVisibleKeys = useCallback(
    (next: string[]) => {
      const filtered = next.filter((k) => allKeys.includes(k));
      setVisibleKeysInternal(filtered);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(filtered));
      } catch {
        // quota exceeded / private mode、忽略
      }
    },
    [storageKey, allKeys],
  );

  const resetToDefault = useCallback(() => {
    setVisibleKeysInternal(defaultVisibleKeys);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey, defaultVisibleKeys]);

  return {
    visibleKeys,
    setVisibleKeys,
    resetToDefault,
    hiddenCount: Math.max(0, allKeys.length - visibleKeys.length),
  };
}
