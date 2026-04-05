'use client';

import { useCallback, useEffect, useState } from 'react';

import { getNx01Dashboard } from '../../api/dashboard';
import type { Nx01DashboardStats } from '../../types';

export function useNx01Dashboard() {
  const [data, setData] = useState<Nx01DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getNx01Dashboard();
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
