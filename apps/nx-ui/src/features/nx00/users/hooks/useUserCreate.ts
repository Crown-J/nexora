/**
 * File: apps/nx-ui/src/features/nx00/users/hooks/useUserCreate.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-USERS-CREATE-001：User Create（表單狀態 + submit + 導頁）封裝
 *
 * Notes:
 * - 使用 users/api/users.createUser
 * - 表單驗證與 payload 正規化集中在 lib/userCreateForm
 */

'use client';

import type { FormEvent } from 'react';
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
  submit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * @HOOK_CODE NX00-USERS-CREATE-001
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
   * @CODE nxui_nx00_users_create_set_form_001
   * 說明：
   * - 提供 updater 形式的 setForm，避免 UI 直接處理物件複製細節
   */
  const setForm = useCallback((updater: (prev: UserCreateFormState) => UserCreateFormState) => {
    _setForm((prev) => updater(prev));
  }, []);

  /**
   * @CODE nxui_nx00_users_create_back_001
   * 說明：
   * - 返回上一頁（暫用 router.back）
   * - 若要固定回列表，可改成 router.push('/dashboard/nx00/users')
   */
  const back = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * @CODE nxui_nx00_users_create_submit_001
   * 說明：
   * - submit：Create 表單送出
   * - 失敗會寫入 err，給 UI 顯示
   */
  const submit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErr(null);

      const msg = validateUserCreateForm(form);
      if (msg) {
        setErr(msg);
        return;
      }

      setSaving(true);
      try {
        const payload = toCreatePayload(form);
        const created = await createUser(payload);

        // ✅ 對齊路由：/dashboard/nx00/users/:id
        router.replace(`/dashboard/nx00/users/${created.id}`);
      } catch (e: unknown) {
        setErr(getErrorMessage(e) || 'Create failed');
      } finally {
        setSaving(false);
      }
    },
    [form, router]
  );

  return {
    state: { saving, err, form },
    actions: { setForm, back, submit },
  };
}