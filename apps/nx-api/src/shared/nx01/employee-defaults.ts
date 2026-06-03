// apps/nx-api/src/shared/nx01/employee-defaults.ts
// 員工統一初始密碼 + 預設 isActive 規則
// 適用所有建立員工途徑：Innova 代匯入 importer / 客戶系統內單筆新增 CreateUserDialog
//
// 安全考量：明文常數可接受、因為帳號一律 mustChangePassword=true 強制首登改。
// ⚠️ 暫時值。Email 通知功能上線後改成「系統產生隨機密碼 + 寄信」、
//    屆時這個檔跟前端 wizard/constants.ts、CreateUserDialog 寫死值一起拿掉。

/** 員工統一初始密碼（首登強制改、auth.service.ts:316 機制） */
export const DEFAULT_EMPLOYEE_PASSWORD = 'changeme';
