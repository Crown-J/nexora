/**
 * File: apps/nx-ui/src/features/nx00/users/hooks/useUserEdit.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-USERS-EDIT-001：User Edit（資料載入/儲存/啟用切換/改密碼）集中封裝
 *
 * Notes:
 * - 讓 UI component 只負責 render
 * - 讓 page entry 只負責掛載 view
 */

'use client';

import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
  changeUserPassword,
  getUser,
  setUserActive,
  updateUser,
  type UserRow,
} from '@/features/nx00/users/api/users';
import {
  toUpdatePayload,
  validatePassword,
  validateUserEditForm,
  type UserEditFormState,
} from '@/features/nx00/users/lib/userEditForm';

export type UserEditState = {
  id: string;
  user: UserRow | null;
  form: UserEditFormState;
  pw: string;

  loading: boolean;
  saving: boolean;
  err: string | null;
};

export type UserEditActions = {
  setForm: (updater: (prev: UserEditFormState) => UserEditFormState) => void;
  setPw: (pw: string) => void;

  backToList: () => void;
  reload: () => Promise<void>;
  save: () => Promise<void>;
  toggleActive: () => Promise<void>;
  changePassword: () => Promise<void>;
};

type RouteParams = { id: string };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * @HOOK_CODE NX00-USERS-EDIT-001
 * 說明：
 * - 封裝 User Edit 頁面所有狀態與操作
 * - 內含：
 *   1) route param 取得 id
 *   2) getUser 載入與初始化 form
 *   3) updateUser 儲存（含 validate + normalize）
 *   4) setUserActive optimistic + rollback
 *   5) changeUserPassword 驗證 + 成功清空 input
 */
export function useUserEdit(): { state: UserEditState; actions: UserEditActions } {
  const router = useRouter();
  const params = useParams<RouteParams>();

  /**
   * @CODE nxui_nx00_users_edit_id_001
   * 說明：
   * - 讀取 route param：/dashboard/nx00/users/:id
   * - 用 useMemo 固定 id，避免不必要 re-render 觸發
   */
  const id = useMemo(() => params.id, [params.id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [user, setUser] = useState<UserRow | null>(null);
  const [form, _setForm] = useState<UserEditFormState>({
    displayName: '',
    email: '',
    phone: '',
  });
  const [pw, setPw] = useState('');

  /**
   * @CODE nxui_nx00_users_edit_set_form_001
   * 說明：
   * - 提供 setForm(updater) 形式，避免 UI 直接接觸內部 _setForm
   */
  const setForm = useCallback((updater: (prev: UserEditFormState) => UserEditFormState) => {
    _setForm((prev) => updater(prev));
  }, []);

  /**
   * @CODE nxui_nx00_users_edit_back_to_list_001
   * 說明：
   * - 返回列表（對齊 nx00 路由）
   */
  const backToList = useCallback(() => {
    router.push('/dashboard/nx00/users');
  }, [router]);

  /**
   * @CODE nxui_nx00_users_edit_reload_001
   * 說明：
   * - 載入使用者資料（getUser）
   * - 成功後初始化：
   *   - user state
   *   - form 預設值（displayName/email/phone）
   */
  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const u = await getUser(id);

      setUser(u);
      _setForm({
        displayName: u.displayName ?? '',
        email: u.email ?? '',
        phone: u.phone ?? '',
      });
    } catch (e: unknown) {
      setErr(getErrorMessage(e) || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  /**
   * @CODE nxui_nx00_users_edit_reload_on_id_001
   * 說明：
   * - id 變更時重新載入
   */
  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * @CODE nxui_nx00_users_edit_save_001
   * 說明：
   * - 儲存更新（updateUser）
   * - 流程：
   *   1) validate
   *   2) normalize -> payload
   *   3) 呼叫 API
   *   4) 更新 user state
   *
   * Notes:
   * - 成功提示目前仍用 alert（後續可改 toast）
   */
  const save = useCallback(async () => {
    if (!user) return;

    const msg = validateUserEditForm(form);
    if (msg) {
      setErr(msg);
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const payload = toUpdatePayload(form);
      const updated = await updateUser(user.id, payload);
      setUser(updated);
      alert('Saved');
    } catch (e: unknown) {
      setErr(getErrorMessage(e) || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [form, user]);

  /**
   * @CODE nxui_nx00_users_edit_toggle_active_001
   * 說明：
   * - 切換啟用狀態（setUserActive）
   * - 使用 optimistic + rollback
   */
  const toggleActive = useCallback(async () => {
    if (!user) return;

    const next = !user.isActive;

    // optimistic
    setUser({ ...user, isActive: next });

    try {
      const updated = await setUserActive(user.id, next);
      setUser(updated);
    } catch (e: unknown) {
      // rollback
      setUser({ ...user, isActive: !next });
      alert(getErrorMessage(e) || 'Update failed');
    }
  }, [user]);

  /**
   * @CODE nxui_nx00_users_edit_change_password_001
   * 說明：
   * - 變更密碼（changeUserPassword）
   * - 規則：
   *   - 先驗證（validatePassword）
   *   - 成功後清空 pw input
   */
  const changePassword = useCallback(async () => {
    if (!user) return;

    const msg = validatePassword(pw);
    if (msg) {
      alert(msg);
      return;
    }

    try {
      await changeUserPassword(user.id, pw);
      setPw('');
      alert('Password updated');
    } catch (e: unknown) {
      alert(getErrorMessage(e) || 'Change password failed');
    }
  }, [pw, user]);

  return {
    state: { id, user, form, pw, loading, saving, err },
    actions: { setForm, setPw, backToList, reload, save, toggleActive, changePassword },
  };
}