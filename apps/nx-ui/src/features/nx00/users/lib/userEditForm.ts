/**
 * File: apps/nx-ui/src/features/nx00/users/lib/userEditForm.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-USERS-FORM-001：User Edit 表單工具（normalize / validate）
 *
 * Notes:
 * - 只放純函式（無 React / 無副作用）
 * - hook / UI 都能重用
 */

export type UserEditFormState = {
  displayName: string;
  email: string;
  phone: string;
};

export type UpdateUserPayload = {
  displayName: string;
  email: string | null;
  phone: string | null;
};

function normalizeText(value: string): string {
  return value.trim();
}

function toNullableTrimmed(value: string): string | null {
  const v = value.trim();
  return v ? v : null;
}

/**
 * @CODE nxui_nx00_users_edit_form_to_payload_001
 * 說明：
 * - 將表單值轉為 API payload
 * - 規則：
 *   - displayName 會 trim
 *   - email/phone：空字串 → null（符合後端常見 nullable 設計）
 */
export function toUpdatePayload(form: UserEditFormState): UpdateUserPayload {
  const displayName = normalizeText(form.displayName);

  return {
    displayName,
    email: toNullableTrimmed(form.email),
    phone: toNullableTrimmed(form.phone),
  };
}

/**
 * @CODE nxui_nx00_users_edit_form_validate_001
 * 說明：
 * - 基本表單驗證（可擴充）
 * - 目前只要求 displayName 必填
 *
 * 回傳：
 * - null：代表驗證通過
 * - string：代表錯誤訊息（給 UI 顯示）
 */
export function validateUserEditForm(form: UserEditFormState): string | null {
  if (!normalizeText(form.displayName)) return 'Display name is required';
  return null;
}

/**
 * @CODE nxui_nx00_users_edit_form_validate_password_001
 * 說明：
 * - 密碼驗證（目前只擋空）
 * - 未來可加長度、複雜度規則都集中在這
 */
export function validatePassword(pw: string): string | null {
  if (!normalizeText(pw)) return 'Password required';
  return null;
}