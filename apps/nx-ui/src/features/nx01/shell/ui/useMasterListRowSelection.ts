'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 主檔列表「本頁多選」：全選／單選勾選與表頭 indeterminate。
 * 與 BaseUserMasterView／BaseRoleMasterView／BasePartMasterView 共用。
 */
export function useMasterListRowSelection(pageRowIds: readonly string[]) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (!el) return;
    const checkedCount = pageRowIds.filter((id) => checked.has(id)).length;
    el.indeterminate = checkedCount > 0 && checkedCount < pageRowIds.length;
    el.checked = pageRowIds.length > 0 && checkedCount === pageRowIds.length;
  }, [pageRowIds, checked]);

  const toggleOne = useCallback((id: string, on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback(
    (on: boolean) => {
      setChecked((prev) => {
        const next = new Set(prev);
        if (on) pageRowIds.forEach((id) => next.add(id));
        else pageRowIds.forEach((id) => next.delete(id));
        return next;
      });
    },
    [pageRowIds],
  );

  const clearSelection = useCallback(() => setChecked(new Set()), []);

  return {
    checked,
    setChecked,
    headerCheckboxRef,
    toggleOne,
    toggleAllVisible,
    clearSelection,
    hasSelection: checked.size > 0,
  };
}
