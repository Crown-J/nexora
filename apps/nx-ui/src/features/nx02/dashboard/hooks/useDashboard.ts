/**
 * File: apps/nx-ui/src/features/nx02/dashboard/hooks/useDashboard.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-DSH-UI-HOOK-001：庫存首頁統計載入
 *
 * Notes:
 * - @FUNCTION_CODE NX02-DSH-UI-001-F01
 */

'use client';

import { useEffect, useState } from 'react';

import { getNx02Dashboard } from '../api/dashboard';
import type { Nx02DashboardDto } from '../api/dashboard';

export function useDashboard() {
  const [data, setData] = useState<Nx02DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getNx02Dashboard()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (alive) {
          setError(e instanceof Error ? e.message : '載入失敗');
          setData(null);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading, error };
}
