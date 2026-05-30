// apps/nx-ui/src/features/wizard/types.ts
// v1.2 對齊軌 C：精靈型別

export interface WizardStatus {
  importWizardCompleted: boolean;
  importWizardCompletedAt: string | null;
  seenPages: { pageKey: string; seenAt: string }[];
}

export interface ImportBatch {
  id: string;
  importType: string;
  fileName: string | null;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: 'previewing' | 'imported' | 'cancelled';
  createdAt: string;
  importedAt: string | null;
}

export const IMPORT_TYPES = [
  { key: 'employee', label: '員工', desc: '姓名 / Email / 角色（可空）' },
  { key: 'partner', label: '客戶 / 廠商', desc: '公司名 / 統編 / 地址 / 類型（C/S/V/O/B）' },
  { key: 'warehouse', label: '倉庫 / 庫位', desc: '倉庫名 / 區 / 位' },
  { key: 'product', label: '產品', desc: '產品名 / 編碼 / 類別 / 安全量' },
  { key: 'purchase-history', label: '進貨歷史', desc: '日期 / 廠商 / 產品 / 數量 / 單價' },
  { key: 'sale-history', label: '銷貨歷史', desc: '日期 / 客戶 / 產品 / 數量 / 單價' },
  { key: 'voucher', label: '票據', desc: '日期 / 對象 / 金額 / 收/付 / 上報狀態 ⭐' },
] as const;
