/**
 * File: apps/nx-ui/src/features/nx00/users/hooks/useUsersList.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-LIST-001：Users List 資料載入、分頁、搜尋、toggle active
 *
 * Notes:
 * - page/pageSize/q 由 URL query 驅動（單一真實來源）
 * - qInput 與 URL q 解耦，避免使用者打字時一直 reload
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { listUsers, setUserActive, type UserRow } from '@/features/nx00/users/api/users';
import { buildNextUsersListSearchParams, parseUsersListQuery } from '@/features/nx00/users/lib/query';

export type UsersListState = {
  items: UserRow[];
  total: number;
  loading: boolean;
  err: string | null;
  qInput: string;
  totalPages: number;
};

export type UsersListActions = {
  setQInput: (v: string) => void;
  go: (params: { page?: number; pageSize?: number; q?: string }) => void;
  goNew: () => void;
  goEdit: (id: string) => void;
  reload: () => Promise<void>;
  toggleActive: (u: UserRow) => Promise<void>;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F01
 * 說明：
 * - 封裝 Users List 的所有狀態與操作
 * - 讓 UI component 只管 render，不需要知道 API / router 細節
 */
export function useUsersList(): { query: ReturnType<typeof parseUsersListQuery>; state: UsersListState; actions: UsersListActions } {
  const router = useRouter();
  const sp = useSearchParams();

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F02
   * 說明：
   * - 由 URL query 派生狀態（單一真實來源）
   */
  const query = useMemo(() => parseUsersListQuery(sp), [sp]);
  const { page, pageSize, q } = query;

  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F03
   * 說明：
   * - 搜尋框狀態（與 URL q 解耦）
   */
  const [qInput, setQInput] = useState(q);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F04
   * 說明：
   * - 當 URL q 改變時同步輸入框（例如按 Clear 或回上一頁）
   */
  useEffect(() => {
    setQInput(q);
  }, [q]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F05
   * 說明：
   * - 計算總頁數（至少 1）
   */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F06
   * 說明：
   * - 以 query 參數導頁（replace）
   * - 將 URLSearchParams 的組裝規則集中在 lib/query.ts
   */
  const go = useCallback(
    (params: { page?: number; pageSize?: number; q?: string }) => {
      const next = buildNextUsersListSearchParams(new URLSearchParams(sp.toString()), params);
      router.replace(`/dashboard/nx00/users?${next.toString()}`);
    },
    [router, sp]
  );

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F07
   * 說明：
   * - 導向新增頁
   */
  const goNew = useCallback(() => {
    router.push('/dashboard/nx00/users/new');
  }, [router]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F08
   * 說明：
   * - 導向編輯頁
   */
  const goEdit = useCallback(
    (id: string) => {
      router.push(`/dashboard/nx00/users/${id}`);
    },
    [router]
  );

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F09
   * 說明：
   * - 重新載入列表（listUsers）
   * - 依 page/pageSize/q 呼叫 API
   */
  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const r = await listUsers({ page, pageSize, q: q || undefined });
      setItems(r.items);
      setTotal(r.total);
    } catch (e: any) {
      setErr(e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F10
   * 說明：
   * - page/pageSize/q 變更時重新載入
   */
  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-001-F11
   * 說明：
   * - 切換啟用狀態（optimistic + rollback）
   * - 失敗暫用 alert（之後你要換成 toast 也只需改這裡）
   */
  const toggleActive = useCallback(async (u: UserRow) => {
    const next = !u.isActive;

    // optimistic UI
    setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)));

    try {
      await setUserActive(u.id, next);
    } catch (e: any) {
      // rollback
      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !next } : x)));
      alert(e?.message || 'Update failed');
    }
  }, []);

  return {
    query,
    state: { items, total, loading, err, qInput, totalPages },
    actions: { setQInput, go, goNew, goEdit, reload, toggleActive },
  };
}