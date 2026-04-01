/**
 * 零件主檔列／表單列型別（API 載入後映射為此結構）
 */

export type BasePartRow = {
  id: string;
  sku: string;
  name: string;
  spec: string;
  unit: string;
  isActive: boolean;
  partBrandId: string | null;
  brandCode: string | null;
  brandName: string | null;
  isOem: boolean;
  carBrandId: string | null;
  carBrandCode: string | null;
  carBrandName: string | null;
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
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
};

export const MOCK_BASE_PARTS: BasePartRow[] = [
  {
    id: 'p1',
    sku: 'BRK-201',
    name: '前來令片組',
    spec: '陶瓷／適用 CAMRY 18-',
    unit: '組',
    isActive: true,
    partBrandId: null,
    brandCode: null,
    brandName: null,
    isOem: true,
    carBrandId: null,
    carBrandCode: null,
    carBrandName: null,
    partType: null,
    secCode: null,
    seg1: null,
    seg2: null,
    seg3: null,
    seg4: null,
    seg5: null,
    countryId: null,
    countryCode: null,
    countryName: null,
    partGroupId: null,
    partGroupCode: null,
    partGroupName: null,
    createdAt: '',
    createdBy: null,
    createdByName: null,
    updatedAt: '',
    updatedBy: null,
    updatedByName: null,
  },
];
