/**
 * 零件主檔列／表單列型別（API 載入後映射為此結構）
 */

export type BasePartRow = {
  id: string;
  codeRuleId: string;
  codeRuleName: string | null;
  sku: string;
  name: string;
  spec: string;
  unit: string;
  isActive: boolean;
  partBrandId: string | null;
  brandCode: string | null;
  brandName: string | null;
  isOem: boolean;
  partType: string | null;
  secCode: string | null;
  seg1: string | null;
  seg2: string | null;
  seg3: string | null;
  seg4: string | null;
  seg5: string | null;
  countryId: string | null;
  countryCode: string | null;
  countryName: string | null;
  partGroupId: string | null;
  partGroupCode: string | null;
  partGroupName: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByUsername: string | null;
  createdByName: string | null;
  createdByPerson: string;
  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
  updatedByName: string | null;
  updatedByPerson: string;
};

export const MOCK_BASE_PARTS: BasePartRow[] = [];
