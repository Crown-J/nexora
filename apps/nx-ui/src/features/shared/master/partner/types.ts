/**
 * Partner Types（SSOT，對齊 nx01_partners API）
 */

// partner 改制六分類（Crown 2026-05-28）：C=保養廠 / O=同行 / S=供應商 / T=外包物流 / B=銀行 / V=一般廠商
export type PartnerType = 'C' | 'O' | 'S' | 'T' | 'V' | 'B';

export type PartnerDto = {
  id: string;
  code: string;
  name: string;
  partnerType: PartnerType;
  canTransferStock: boolean;
  contactName: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  remark: string | null;
  isActive: boolean;
  taxId: string | null;
  paymentTermDomestic: string;
  customerGradeId: string | null;
  customerGradeCode?: string | null;
  customerGradeName?: string | null;
  supplierGradeId?: string | null;
  supplierGradeCode?: string | null;
  supplierGradeName?: string | null;
  creditLimit: string | null;
  creditStatus: string;
  paymentTermImport: string | null;
  incoterm: string | null;
  // v1.2 階段 E P2：basic 補欄
  shortName?: string | null;
  nameEn?: string | null;
  fax?: string | null;
  website?: string | null;
  serviceLocation?: string | null;
  // v1.2 階段 E P2：sales 補欄
  defaultWarehouseId?: string | null;
  defaultWarehouseCode?: string | null;
  defaultWarehouseName?: string | null;
  salesUserId?: string | null;
  salesUserAccount?: string | null;
  salesUserName?: string | null;
  // v1.2 階段 E P2：finance 補欄
  defaultCurrencyId?: string | null;
  defaultCurrencyCode?: string | null;
  defaultCurrencyName?: string | null;
  // W3 [3-2] 舊代號（純對照）
  legacyCode?: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByUsername?: string | null;
  createdByName?: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername?: string | null;
  updatedByName?: string | null;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

// v1.2 階段 E P2：共用 partner 寫入欄位（除 code/name/partnerType 必填外、create/update 皆 optional）
export type PartnerWritableFields = {
  partnerType?: PartnerType;
  canTransferStock?: boolean;
  contactName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  remark?: string | null;
  taxId?: string | null;
  paymentTermDomestic?: string;
  customerGradeId?: string | null;
  supplierGradeId?: string | null;
  creditLimit?: number;
  creditStatus?: string;
  paymentTermImport?: string | null;
  incoterm?: string | null;
  isActive?: boolean;
  // v1.2 階段 E P2：補欄
  shortName?: string | null;
  nameEn?: string | null;
  fax?: string | null;
  website?: string | null;
  serviceLocation?: string | null;
  defaultWarehouseId?: string | null;
  salesUserId?: string | null;
  defaultCurrencyId?: string | null;
  // W3 [3-2] 舊代號（純對照）
  legacyCode?: string | null;
};

// W3 [3-1]：code 改 optional（未填系統自動產 類型碼+4 碼、可手動覆寫）
export type CreatePartnerBody = PartnerWritableFields & {
  code?: string;
  name: string;
};

export type UpdatePartnerBody = PartnerWritableFields & {
  name?: string;
};
