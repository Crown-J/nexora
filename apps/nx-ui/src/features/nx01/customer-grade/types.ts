// apps/nx-ui/src/features/nx01/customer-grade/types.ts
// 對應規格：docs/nx01/spec/intent/nx01-07-base-catalog.md v1.0
export type CustomerGradeDto = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  /** 最低毛利率（%）、Decimal(5,2) 序列化為 string */
  marginPct: string | null;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type PagedCustomerGrade = {
  page: number;
  pageSize: number;
  total: number;
  rows: CustomerGradeDto[];
};

export type ListCustomerGradeParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
};

/** 規格 §6 Q1=A：OWNER 可改 marginPct + name + sortNo + isActive、code 鎖 */
export type UpdateCustomerGradeBody = {
  name?: string;
  marginPct?: string;
  sortNo?: number;
  isActive?: boolean;
};
