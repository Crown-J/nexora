/**
 * File: apps/nx-ui/src/features/nx00/users/lib/userEditForm.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-FORM-001：User Edit 表單工具（normalize / validate）
 *
 * Notes:
 * - 這裡只放「純函式」，不依賴 React / router / API
 * - 讓 hook / UI 都能重用
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

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-FORM-001-F01
 * 說明：
 * - 將表單值轉為 API payload
 * - 規則：
 *   - displayName 會 trim
 *   - email/phone：空字串 → null（符合後端常見 nullable 設計）
 */
export function toUpdatePayload(form: UserEditFormState): UpdateUserPayload {
  const displayName = form.displayName.trim();

  return {
    displayName,
    email: form.email.trim() ? form.email.trim() : null,
    phone: form.phone.trim() ? form.phone.trim() : null,
  };
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-FORM-001-F02
 * 說明：
 * - 基本表單驗證（可擴充）
 * - 目前只要求 displayName 必填
 *
 * 回傳：
 * - null：代表驗證通過
 * - string：代表錯誤訊息（給 UI 顯示）
 */
export function validateUserEditForm(form: UserEditFormState): string | null {
  if (!form.displayName.trim()) return 'Display name is required';
  return null;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-FORM-001-F03
 * 說明：
 * - 密碼驗證（目前只擋空）
 * - 未來可加長度、複雜度規則都集中在這
 */
export function validatePassword(pw: string): string | null {
  if (!pw.trim()) return 'Password required';
  return null;
}