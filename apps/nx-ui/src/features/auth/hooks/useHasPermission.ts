// apps/nx-ui/src/features/auth/hooks/useHasPermission.ts
// v1.2 對齊軌 A+B：權限檢查 hook
//
// 用法：
//   const can = useHasPermission('sale.quote.create');
//   if (can) <button>新增報價</button>
//
//   const canSeeMenu = useHasAnyPermission(['sale.quote.list', 'sale.so.list']);
//
// 後端 /nx01/permissions/mine 回 string[]：
//   - SYSADMIN / OWNER → ['*']（前端視為全擁有）
//   - 一般 user → 該 user 擁有的權限 codes 陣列

'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';
import { getToken } from '@data/auth/token';

let cachedPermissions: string[] | null = null;
let inFlight: Promise<string[]> | null = null;
const subscribers = new Set<(perms: string[]) => void>();

async function fetchPermissions(): Promise<string[]> {
  if (cachedPermissions) return cachedPermissions;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const token = getToken();
      if (!token) return [];
      const res = await apiFetch('/nx01/permissions/mine', { method: 'GET' });
      if (res.status === 401 || res.status === 403) {
        // 未登入或無法存取、視為無權限
        return [];
      }
      await assertOk(res, 'nxui_perm_mine');
      const data = (await res.json()) as string[];
      cachedPermissions = data;
      subscribers.forEach((cb) => cb(data));
      return data;
    } catch {
      return [];
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/// 登出時呼叫、清掉快取
export function clearPermissionsCache() {
  cachedPermissions = null;
  inFlight = null;
  subscribers.forEach((cb) => cb([]));
}

/// 取得當前 user 所有權限 codes（背景載入、第一次回空）
export function usePermissions(): { permissions: string[]; loading: boolean } {
  const [permissions, setPermissions] = useState<string[]>(
    () => cachedPermissions ?? [],
  );
  const [loading, setLoading] = useState<boolean>(() => cachedPermissions === null);

  useEffect(() => {
    let alive = true;
    const handler = (perms: string[]) => {
      if (!alive) return;
      setPermissions(perms);
      setLoading(false);
    };
    subscribers.add(handler);
    void fetchPermissions().then((perms) => {
      if (!alive) return;
      setPermissions(perms);
      setLoading(false);
    });
    return () => {
      alive = false;
      subscribers.delete(handler);
    };
  }, []);

  return { permissions, loading };
}

/// 檢查當前 user 是否擁有指定權限（單個）
export function useHasPermission(code: string): boolean {
  const { permissions } = usePermissions();
  if (permissions.includes('*')) return true;
  return permissions.includes(code);
}

/// 檢查當前 user 是否擁有任一指定權限（OR 邏輯、給導覽 / 卡片可見性用）
export function useHasAnyPermission(codes: string[]): boolean {
  const { permissions } = usePermissions();
  if (permissions.includes('*')) return true;
  return codes.some((c) => permissions.includes(c));
}

/// 檢查是否「擁有全部」（AND 邏輯、罕用）
export function useHasAllPermissions(codes: string[]): boolean {
  const { permissions } = usePermissions();
  if (permissions.includes('*')) return true;
  return codes.every((c) => permissions.includes(c));
}
