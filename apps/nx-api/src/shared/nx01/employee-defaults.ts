// apps/nx-api/src/shared/nx01/employee-defaults.ts
// 員工統一初始密碼 + 預設 isActive 規則（importer + 主檔手動建/啟用 都用此常數）
//
// 安全考量：明文常數可接受、因為帳號一律 mustChangePassword=true 強制首登改。
// 後續若改為「系統隨機產生 + 寄信」（Email 通知做好後）只需改這一個檔。

/** 員工統一初始密碼（首登強制改、auth.service.ts:316 機制） */
export const DEFAULT_EMPLOYEE_PASSWORD = 'Temp123!';
