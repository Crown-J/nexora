// apps/nx-api/src/sys-admin/importer/import-templates.ts
// v1.2 對齊軌 C3：7 個匯入範本欄位定義
//
// 給 Excel 範本生成 + 上傳解析共用

export interface TemplateColumn {
  /// Excel 欄位名（中文 header）
  header: string;
  /// 程式內欄位 key（英文）
  field: string;
  /// 是否必填
  required: boolean;
  /// 說明（給範本第一列 helper text 用）
  hint?: string;
  /// 範例（給範本第一列示範用）
  example?: string;
}

export interface TemplateSpec {
  importType: string;
  zhLabel: string;
  /// Excel sheet 名稱
  sheetName: string;
  columns: TemplateColumn[];
}

export const EMPLOYEE_TEMPLATE: TemplateSpec = {
  importType: 'employee',
  zhLabel: '員工',
  sheetName: '員工',
  columns: [
    { header: '姓名', field: 'userName', required: true, example: '王小明' },
    { header: 'Email（登入帳號）', field: 'email', required: true, example: 'employee@company.com' },
    { header: '電話', field: 'phone', required: false, example: '0912-345-678' },
    { header: '角色名稱（可空）', field: 'roleName', required: false, hint: '若該角色不存在、本筆會跳過角色綁定（建議匯入後到「設定→角色與權限」建好角色再回頭指派）', example: '業務' },
    // 「啟用」欄已拿掉（2026-06-03）：匯入一律未啟用、之後在精靈內挑啟用（受席次上限保護）
  ],
};

export const PARTNER_TEMPLATE: TemplateSpec = {
  importType: 'partner',
  zhLabel: '客戶 / 廠商',
  sheetName: '客戶廠商',
  columns: [
    { header: '公司名稱', field: 'name', required: true, example: '和興汽車' },
    { header: '統一編號', field: 'taxId', required: false, example: '12345678' },
    { header: '地址', field: 'address', required: false, example: '台北市信義區...' },
    { header: '電話', field: 'phone', required: false, example: '02-2345-6789' },
    { header: '類型（C/S/V/O/B）', field: 'partnerType', required: true, hint: 'C=保養廠 / S=供應商 / V=一般廠商 / O=同行 / B=銀行', example: 'C' },
  ],
};

export const WAREHOUSE_TEMPLATE: TemplateSpec = {
  importType: 'warehouse',
  zhLabel: '倉庫 / 庫位',
  sheetName: '倉庫庫位',
  columns: [
    { header: '倉庫名稱', field: 'warehouseName', required: true, example: '主倉' },
    { header: '區', field: 'zone', required: false, example: 'A' },
    { header: '位', field: 'position', required: false, example: '01' },
  ],
};

export const PRODUCT_TEMPLATE: TemplateSpec = {
  importType: 'product',
  zhLabel: '產品',
  sheetName: '產品',
  columns: [
    { header: '產品名稱', field: 'name', required: true, example: '剎車片' },
    { header: '產品編碼', field: 'code', required: true, example: 'NX01PART0000001' },
    { header: '類別', field: 'category', required: false, example: '剎車系統' },
    { header: '安全量', field: 'safetyQty', required: false, example: '50' },
    { header: '最高量', field: 'maxQty', required: false, example: '200' },
    { header: '預設庫位', field: 'defaultLocation', required: false, example: 'A01' },
  ],
};

export const PURCHASE_HISTORY_TEMPLATE: TemplateSpec = {
  importType: 'purchase-history',
  zhLabel: '進貨歷史',
  sheetName: '進貨歷史',
  columns: [
    { header: '日期', field: 'date', required: true, example: '2024-05-30' },
    { header: '廠商', field: 'partnerName', required: true, example: '瑞利汽材' },
    { header: '產品', field: 'productName', required: true, example: '剎車片' },
    { header: '數量', field: 'qty', required: true, example: '10' },
    { header: '單價', field: 'unitPrice', required: true, example: '200' },
  ],
};

export const SALE_HISTORY_TEMPLATE: TemplateSpec = {
  importType: 'sale-history',
  zhLabel: '銷貨歷史',
  sheetName: '銷貨歷史',
  columns: [
    { header: '日期', field: 'date', required: true, example: '2024-05-30' },
    { header: '客戶', field: 'partnerName', required: true, example: '和興汽車' },
    { header: '產品', field: 'productName', required: true, example: '剎車片' },
    { header: '數量', field: 'qty', required: true, example: '5' },
    { header: '單價', field: 'unitPrice', required: true, example: '320' },
  ],
};

export const VOUCHER_TEMPLATE: TemplateSpec = {
  importType: 'voucher',
  zhLabel: '票據',
  sheetName: '票據',
  columns: [
    { header: '日期', field: 'date', required: true, example: '2024-05-30' },
    { header: '對象', field: 'partnerName', required: true, example: '和興汽車' },
    { header: '金額', field: 'amount', required: true, example: '5200' },
    { header: '收/付', field: 'direction', required: true, hint: '收 / 付', example: '收' },
    { header: '方式', field: 'method', required: true, hint: '現金 / 匯款 / 支票 / 信用卡', example: '匯款' },
    { header: '上報狀態 ⭐', field: 'uploadStatus', required: true, hint: '已上報 / 未上報（已上報只進系統查詢、不進 401 報表計算）', example: '未上報' },
  ],
};

export const ALL_TEMPLATES: Record<string, TemplateSpec> = {
  employee: EMPLOYEE_TEMPLATE,
  partner: PARTNER_TEMPLATE,
  warehouse: WAREHOUSE_TEMPLATE,
  product: PRODUCT_TEMPLATE,
  'purchase-history': PURCHASE_HISTORY_TEMPLATE,
  'sale-history': SALE_HISTORY_TEMPLATE,
  voucher: VOUCHER_TEMPLATE,
};
