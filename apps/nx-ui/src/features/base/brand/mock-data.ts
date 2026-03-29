/**
 * 廠牌主檔 mock（汽車／零件）
 */

export type BrandKind = 'vehicle' | 'part';

export type BaseBrandRow = {
  id: string;
  code: string;
  name: string;
  originCountry: string;
  kind: BrandKind;
  isActive: boolean;
};

export const MOCK_BASE_BRANDS: BaseBrandRow[] = [
  { id: 'b1', code: 'TOYOTA', name: '豐田', originCountry: 'JP', kind: 'vehicle', isActive: true },
  { id: 'b2', code: 'HONDA', name: '本田', originCountry: 'JP', kind: 'vehicle', isActive: true },
  { id: 'b3', code: 'BOSCH', name: 'BOSCH', originCountry: 'DE', kind: 'part', isActive: true },
  { id: 'b4', code: 'MANN', name: 'MANN-FILTER', originCountry: 'DE', kind: 'part', isActive: true },
  { id: 'b5', code: 'MIT', name: '三菱汽車', originCountry: 'JP', kind: 'vehicle', isActive: false },
];
