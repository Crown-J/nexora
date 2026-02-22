/**
 * File: apps/nx-ui/src/features/nx00/users/lib/userCreateForm.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-USERS-CREATE-FORM-001：User Create 表單工具（validate / normalize）
 *
 * Notes:
 * - 只放純函式（無 React/無副作用），hook/UI 都可重用
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

function normalizeText(value: string): string {
  return value.trim();
}

function toNullableTrimmed(value: string): string | null {
  const v = value.trim();
  return v ? v : null;
}

/**
 * @CODE nxui_nx00_users_create_form_validate_001
 * 說明：
 * - 基本驗證（可擴充）
 * - 目前規則：
 *   1) username 必填
 *   2) displayName 必填
 */
export function validateUserCreateForm(form: UserCreateFormState): string | null {
  if (!normalizeText(form.username)) return 'username required';
  if (!normalizeText(form.displayName)) return 'displayName required';
  return null;
}

/**
 * @CODE nxui_nx00_users_create_form_to_payload_001
 * 說明：
 * - 表單 normalize → API payload
 * - 規則：
 *   - username/displayName trim
 *   - email/phone 空字串 → null
 *   - password 空字串 → 不帶（undefined）
 */
export function toCreatePayload(form: UserCreateFormState): CreateUserPayload {
  const username = normalizeText(form.username);
  const displayName = normalizeText(form.displayName);

  const email = toNullableTrimmed(form.email);
  const phone = toNullableTrimmed(form.phone);

  const pw = normalizeText(form.password);
  const password = pw ? pw : undefined;

  return { username, displayName, email, phone, password };
}