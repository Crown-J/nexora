/**
 * File: apps/nx-ui/src/features/nx00/parts/hooks/usePartLookups.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-004：Parts 共用 lookups 載入（brands/function-groups/status）
 *
 * Notes:
 * - 集中管理 loading/error
 * - UI 只負責 render
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { listBrands, listFunctionGroups, listPartStatuses } from '@/features/nx00/lookups/api/lookups';
import type { LookupRow, PartStatusRow } from '@/features/nx00/lookups/types';

export type PartLookupsState = {
  brands: LookupRow[];
  functionGroups: LookupRow[];
  partStatuses: PartStatusRow[];
  loading: boolean;
  error: string | null;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * @HOOK_CODE NX00-UI-004-H01
 * 說明：
 * - 載入 parts 需要的 lookup 字典
 * - 回傳資料、loading、error、refresh()
 */
export function usePartLookups(isActiveOnly: boolean = true) {
  const [state, setState] = useState<PartLookupsState>({
    brands: [],
    functionGroups: [],
    partStatuses: [],
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((p) => ({ ...p, loading: true, error: null }));

    try {
      const params = isActiveOnly ? { isActive: true } : {};
      const [brands, functionGroups, partStatuses] = await Promise.all([
        listBrands(params),
        listFunctionGroups(params),
        listPartStatuses(params),
      ]);

      setState({
        brands,
        functionGroups,
        partStatuses,
        loading: false,
        error: null,
      });
    } catch (e: unknown) {
      setState((p) => ({
        ...p,
        loading: false,
        error: getErrorMessage(e) || 'Load lookups failed',
      }));
    }
  }, [isActiveOnly]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await refresh();
    })();

    return () => {
      alive = false;
    };
  }, [refresh]);

  return { ...state, refresh };
}