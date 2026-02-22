/**
 * File: apps/nx-ui/src/features/nx00/users/hooks/useUsersList.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-USERS-LIST-001：Users List 資料載入、分頁、搜尋、toggle active
 *
 * Notes:
 * - page/pageSize/q 由 URL query 驅動（單一真實來源）
 * - qInput 與 URL q 解耦，避免使用者打字時一直 reload
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { listUsers, setUserActive, type UserRow } from '@/features/nx00/users/api/users';
import {
  buildNextUsersListSearchParams,
  parseUsersListQuery,
} from '@/features/nx00/users/lib/query';

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

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * @HOOK_CODE NX00-USERS-LIST-001
 * 說明：
 * - 封裝 Users List 的所有狀態與操作
 * - 讓 UI component 只管 render，不需要知道 API / router 細節
 */
export function useUsersList(): {
  query: ReturnType<typeof parseUsersListQuery>;
  state: UsersListState;
  actions: UsersListActions;
} {
  const router = useRouter();
  const sp = useSearchParams();

  /**
   * @CODE nxui_nx00_users_list_query_001
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
   * @CODE nxui_nx00_users_list_q_input_001
   * 說明：
   * - 搜尋框狀態（與 URL q 解耦）
   */
  const [qInput, setQInput] = useState(q);

  /**
   * @CODE nxui_nx00_users_list_sync_q_001
   * 說明：
   * - 當 URL q 改變時同步輸入框（例如按 Clear / 回上一頁 / 點頁碼）
   */
  useEffect(() => {
    setQInput(q);
  }, [q]);

  /**
   * @CODE nxui_nx00_users_list_total_pages_001
   * 說明：
   * - 計算總頁數（至少 1）
   */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  /**
   * @CODE nxui_nx00_users_list_go_001
   * 說明：
   * - 以 query 參數導頁（replace）
   * - URLSearchParams 組裝規則集中在 lib/query.ts
   */
  const go = useCallback(
    (params: { page?: number; pageSize?: number; q?: string }) => {
      const next = buildNextUsersListSearchParams(new URLSearchParams(sp.toString()), params);
      router.replace(`/dashboard/nx00/users?${next.toString()}`);
    },
    [router, sp]
  );

  /**
   * @CODE nxui_nx00_users_list_go_new_001
   * 說明：
   * - 導向新增頁
   */
  const goNew = useCallback(() => {
    router.push('/dashboard/nx00/users/new');
  }, [router]);

  /**
   * @CODE nxui_nx00_users_list_go_edit_001
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
   * @CODE nxui_nx00_users_list_reload_001
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
    } catch (e: unknown) {
      setErr(getErrorMessage(e) || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q]);

  /**
   * @CODE nxui_nx00_users_list_reload_on_query_001
   * 說明：
   * - page/pageSize/q 變更時重新載入
   */
  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * @CODE nxui_nx00_users_list_toggle_active_001
   * 說明：
   * - 切換啟用狀態（optimistic + rollback）
   * - 失敗暫用 alert（後續要換 toast 也只需改這裡）
   */
  const toggleActive = useCallback(async (u: UserRow) => {
    const next = !u.isActive;

    // optimistic UI
    setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)));

    try {
      await setUserActive(u.id, next);
    } catch (e: unknown) {
      // rollback
      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !next } : x)));
      alert(getErrorMessage(e) || 'Update failed');
    }
  }, []);

  return {
    query,
    state: { items, total, loading, err, qInput, totalPages },
    actions: { setQInput, go, goNew, goEdit, reload, toggleActive },
  };
}