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
  creditLimit: string | null;
  creditStatus: string;
  paymentTermImport: string | null;
  incoterm: string | null;
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

export type CreatePartnerBody = {
  code: string;
  name: string;
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
  creditLimit?: number;
  creditStatus?: string;
  paymentTermImport?: string;
  incoterm?: string;
  isActive?: boolean;
};

export type UpdatePartnerBody = {
  name?: string;
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
  creditLimit?: number;
  creditStatus?: string;
  paymentTermImport?: string | null;
  incoterm?: string | null;
  isActive?: boolean;
};
