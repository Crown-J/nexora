// apps/nx-ui/src/features/wizard/constants.ts
// 精靈共用常數（前端顯示用）
//
// ⚠️ 與後端 `apps/nx-api/src/shared/nx01/employee-defaults.ts`
//    跟前端 `features/base/users/CreateUserDialog.tsx` 的同名常數保持同步。
//    Email 通知功能上線後改成「系統隨機產生 + 寄信」、三處一起拿掉。

/** 員工統一初始密碼（匯入 + 主檔啟用、首登 mustChangePassword=true 強制改） */
export const DEFAULT_EMPLOYEE_PASSWORD = 'changeme';
