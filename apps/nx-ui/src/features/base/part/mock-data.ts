/**
 * 零件主檔 mock（未接 API）
 */

export type BasePartRow = {
  id: string;
  sku: string;
  name: string;
  spec: string;
  unit: string;
  isActive: boolean;
  /** nx00_part_brand.id */
  partBrandId: string | null;
  brandCode: string | null;
  brandName: string | null;
  isOem: boolean;
  carBrandId: string | null;
  carBrandCode: string | null;
  carBrandName: string | null;
  /** A/B/C/D */
  partType: string | null;
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
  },
  {
    id: 'p2',
    sku: 'OIL-5W30-4L',
    name: '引擎油 5W-30',
    spec: '4L／全合成',
    unit: '桶',
    isActive: true,
    partBrandId: null,
    brandCode: null,
    brandName: null,
    isOem: true,
    carBrandId: null,
    carBrandCode: null,
    carBrandName: null,
    partType: null,
  },
  {
    id: 'p3',
    sku: 'FLT-MANN-CU',
    name: '冷氣濾網',
    spec: 'MANN CU 2939',
    unit: '片',
    isActive: false,
    partBrandId: null,
    brandCode: null,
    brandName: null,
    isOem: true,
    carBrandId: null,
    carBrandCode: null,
    carBrandName: null,
    partType: null,
  },
];
