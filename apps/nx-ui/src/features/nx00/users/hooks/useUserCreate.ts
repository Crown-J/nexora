/**
 * File: apps/nx-ui/src/features/nx00/users/hooks/useUserCreate.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-CREATE-001：User Create（表單狀態 + submit + 導頁）封裝
 */

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUser } from '@/features/nx00/users/api/users';
import {
  toCreatePayload,
  validateUserCreateForm,
  type UserCreateFormState,
} from '@/features/nx00/users/lib/userCreateForm';

export type UserCreateState = {
  saving: boolean;
  err: string | null;
  form: UserCreateFormState;
};

export type UserCreateActions = {
  setForm: (updater: (prev: UserCreateFormState) => UserCreateFormState) => void;
  back: () => void;
  submit: (e: React.FormEvent) => Promise<void>;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-CREATE-001-F01
 * 說明：
 * - useUserCreate：封裝 Create 頁面的狀態與送出流程
 * - 流程：
 *   1) preventDefault
 *   2) validate
 *   3) normalize payload
 *   4) createUser
 *   5) 成功後導向 edit 頁（/dashboard/nx00/users/:id）
 */
export function useUserCreate(): { state: UserCreateState; actions: UserCreateActions } {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, _setForm] = useState<UserCreateFormState>({
    username: '',
    displayName: '',
    email: '',
    phone: '',
    password: '',
  });

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-CREATE-001-F02
   * 說明：
   * - 提供 updater 形式的 setForm，避免 UI 直接處理物件複製細節
   */
  const setForm = useCallback((updater: (prev: UserCreateFormState) => UserCreateFormState) => {
    _setForm((prev) => updater(prev));
  }, []);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-CREATE-001-F03
   * 說明：
   * - 返回上一頁（暫用 router.back）
   * - 若你想固定回列表，可改成 router.push('/dashboard/nx00/users')
   */
  const back = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-USERS-CREATE-001-F04
   * 說明：
   * - submit：Create 表單送出
   * - 失敗會寫入 err，給 UI 顯示
   */
  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErr(null);

      const v = validateUserCreateForm(form);
      if (v) return setErr(v);

      setSaving(true);
      try {
        const payload = toCreatePayload(form);
        const r = await createUser(payload);

        // ✅ 對齊新路由：導向 /dashboard/nx00/users/:id
        router.replace(`/dashboard/nx00/users/${r.id}`);
      } catch (e: any) {
        setErr(e?.message || 'Create failed');
      } finally {
        setSaving(false);
      }
    },
    [form, router]
  );

  return { state: { saving, err, form }, actions: { setForm, back, submit } };
}