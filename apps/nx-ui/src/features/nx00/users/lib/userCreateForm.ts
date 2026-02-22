/**
 * File: apps/nx-ui/src/features/nx00/users/lib/userCreateForm.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-CREATE-FORM-001：User Create 表單工具（validate / normalize）
 *
 * Notes:
 * - 只放純函式，hook/UI 都可重用
 */

export type UserCreateFormState = {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  password: string;
};

export type CreateUserPayload = {
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  password?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-CREATE-FORM-001-F01
 * 說明：
 * - 基本驗證（可擴充）
 * - 目前規則：
 *   1) username 必填
 *   2) displayName 必填
 */
export function validateUserCreateForm(form: UserCreateFormState): string | null {
  if (!form.username.trim()) return 'username required';
  if (!form.displayName.trim()) return 'displayName required';
  return null;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-CREATE-FORM-001-F02
 * 說明：
 * - 表單 normalize → API payload
 * - 規則：
 *   - username/displayName trim
 *   - email/phone 空字串 → null
 *   - password 空字串 → 不帶（undefined）
 */
export function toCreatePayload(form: UserCreateFormState): CreateUserPayload {
  const username = form.username.trim();
  const displayName = form.displayName.trim();

  const email = form.email.trim() ? form.email.trim() : null;
  const phone = form.phone.trim() ? form.phone.trim() : null;

  const password = form.password.trim() ? form.password : undefined;

  return { username, displayName, email, phone, password };
}