// apps/nx-ui/src/features/wizard/constants.ts
// 精靈共用常數（前端顯示用）
//
// ⚠️ 與後端 `apps/nx-api/src/shared/nx01/employee-defaults.ts`
//    的 DEFAULT_EMPLOYEE_PASSWORD 保持同步。
//    後續改為「系統隨機產生 + Email 寄信」時，兩處同時調整。

/** 員工統一初始密碼（匯入 + 主檔啟用、首登 mustChangePassword=true 強制改） */
export const DEFAULT_EMPLOYEE_PASSWORD = 'Temp123!';
