/**
 * File: apps/nx-ui/src/features/nx00/users/hooks/useUserEdit.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-EDIT-001：User Edit（資料載入/儲存/啟用切換/改密碼）集中封裝
 *
 * Notes:
 * - 讓 UI component 只負責 render
 * - 讓 page entry 只負責掛載 view
 */

'use client';

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

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-EDIT-001-F01
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
   * @FUNCTION_CODE NX00-UI-NX00-USERS-EDIT-001-F02
   * 說明：
   * - 讀取 route param：/dashboard/nx00/users/:id
   * - 用 useMemo 固定 id，避免不必要 re-render 觸發
   */
  const id = useMemo(() => params.id, [params.id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [user, setUser] = useState<UserRow | null>(null);
  const [form, _setForm] = useState<UserEditFormState>({ displayName: '', email: '', phone: '' });
  const [pw, setPw] = useState('');

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-EDIT-001-F03
   * 說明：
   * - 提供 setForm(updater) 形式，避免 UI 直接接觸內部 _setForm
   */
  const setForm = useCallback((updater: (prev: UserEditFormState) => UserEditFormState) => {
    _setForm((prev) => updater(prev));
  }, []);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-EDIT-001-F04
   * 說明：
   * - 返回列表（對齊你現在 nx00 路由）
   */
  const backToList = useCallback(() => {
    router.push('/dashboard/nx00/users');
  }, [router]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-EDIT-001-F05
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
      _setForm({ displayName: u.displayName || '', email: u.email || '', phone: u.phone || '' });
    } catch (e: any) {
      setErr(e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-EDIT-001-F06
   * 說明：
   * - id 變更時重新載入
   */
  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-EDIT-001-F07
   * 說明：
   * - 儲存更新（updateUser）
   * - 流程：
   *   1) validate
   *   2) normalize -> payload
   *   3) 呼叫 API
   *   4) 更新 user state
   *
   * 註：
   * - 成功提示目前仍用 alert（後續你要換 toast 可集中改）
   */
  const save = useCallback(async () => {
    if (!user) return;

    const v = validateUserEditForm(form);
    if (v) {
      setErr(v);
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const payload = toUpdatePayload(form);
      const u = await updateUser(user.id, payload);
      setUser(u);
      alert('Saved');
    } catch (e: any) {
      setErr(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [form, user]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-EDIT-001-F08
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
      const u = await setUserActive(user.id, next);
      setUser(u);
    } catch (e: any) {
      setUser({ ...user, isActive: !next });
      alert(e?.message || 'Update failed');
    }
  }, [user]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-EDIT-001-F09
   * 說明：
   * - 變更密碼（changeUserPassword）
   * - 規則：
   *   - 先驗證（目前只擋空）
   *   - 成功後清空 pw input
   */
  const changePassword = useCallback(async () => {
    if (!user) return;

    const v = validatePassword(pw);
    if (v) return alert(v);

    try {
      await changeUserPassword(user.id, pw);
      setPw('');
      alert('Password updated');
    } catch (e: any) {
      alert(e?.message || 'Change password failed');
    }
  }, [pw, user]);

  return {
    state: { id, user, form, pw, loading, saving, err },
    actions: { setForm, setPw, backToList, reload, save, toggleActive, changePassword },
  };
}