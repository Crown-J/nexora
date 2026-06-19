// apps/nx-ui/src/features/nx01/partner/supplier-supply/mock-data.ts
// 供應商供貨對應 mock 資料（Step 6 / 純前端 UI 跑通用）
// 後續軌（API 串接）會用 PartnerDto(type=S) / SupplyRecordDto 替換
//
// 業務語意（執行長拍板採 B 建模）：
//   - 紀錄粒度 = 零件（不是品牌）；採購端查「誰供這顆零件」一張 join 表
//   - 品牌作為「批次操作工具」：「加入品牌」一次帶該品牌全品項、UI 按品牌分組
//   - 「該品牌不一定全品項都供」用上層 UI 表達（accordion meta：已供 N / 共 M）

export type BrandMock = { id: string; name: string };
export type PartMock = {
  code: string;
  name: string;
  brand: string; // brand.id
  origin: string;
};
export type SupplierMock = { id: string; name: string };

export type SupplyRecord = {
  partCode: string;
  vendorCode: string;
  price: number | null;
  lead: number | null; // 交期天數
  moq: number | null;
  primary: boolean; // 主要供應商標記
};

export const BRANDS: BrandMock[] = [
  { id: 'BSH', name: '博世 Bosch' },
  { id: 'DEN', name: '電裝 DENSO' },
  { id: 'NSB', name: '日清紡 NISSHINBO' },
  { id: 'MAN', name: '曼牌 MANN' },
  { id: 'KYB', name: 'KYB' },
];

export const PARTS: PartMock[] = [
  { code: 'OF-1003', name: '機油濾芯 1.3L', brand: 'BSH', origin: '德國' },
  { code: 'OF-2207', name: '機油濾芯 2.0L', brand: 'BSH', origin: '中國' },
  { code: 'OF-2208', name: '機油濾芯 2.0L 改', brand: 'BSH', origin: '中國' },
  { code: 'OF-3110', name: '機油濾芯 通用', brand: 'MAN', origin: '德國' },
  { code: 'OF-4500', name: '機油濾芯 柴油', brand: 'MAN', origin: '德國' },
  { code: 'BP-0021', name: '前煞車來令片', brand: 'NSB', origin: '日本' },
  { code: 'BP-0022', name: '後煞車來令片', brand: 'NSB', origin: '日本' },
  { code: 'BP-0023', name: '前煞車來令片 C', brand: 'NSB', origin: '中國' },
  { code: 'BP-0210', name: '前煞車來令片', brand: 'DEN', origin: '日本' },
  { code: 'BP-0145', name: '前煞車來令片(陶瓷)', brand: 'NSB', origin: '台灣' },
  { code: 'BD-5001', name: '前煞車碟盤', brand: 'BSH', origin: '德國' },
  { code: 'BD-5002', name: '後煞車碟盤', brand: 'BSH', origin: '中國' },
  { code: 'BD-5003', name: '前煞車碟盤 D', brand: 'BSH', origin: '德國' },
  { code: 'SP-7001', name: '銥合金火星塞', brand: 'DEN', origin: '日本' },
  { code: 'SP-7002', name: '白金火星塞', brand: 'DEN', origin: '日本' },
  { code: 'SP-7100', name: '一般火星塞', brand: 'BSH', origin: '德國' },
  { code: 'AF-1100', name: '空氣濾芯 1.5L', brand: 'BSH', origin: '德國' },
  { code: 'AF-2250', name: '空氣濾芯 2.4L', brand: 'DEN', origin: '日本' },
  { code: 'SK-8001', name: '前避震器', brand: 'KYB', origin: '日本' },
  { code: 'SK-8002', name: '後避震器', brand: 'KYB', origin: '日本' },
];

export const SUPPLIERS: SupplierMock[] = [
  { id: 'S0001', name: '三和機械' },
  { id: 'S0002', name: '永豐汽材' },
  { id: 'S0003', name: '日清紡 NISSHINBO' },
  { id: 'S0004', name: '電裝 DENSO' },
];

export const SUPPLY_SEED: Record<string, SupplyRecord[]> = {
  S0001: [
    { partCode: 'BP-0021', vendorCode: 'SANWA-BP21', price: 760, lead: 7, moq: 10, primary: true },
    { partCode: 'BP-0022', vendorCode: 'SANWA-BP22', price: 620, lead: 7, moq: 10, primary: true },
    { partCode: 'SP-7001', vendorCode: 'SANWA-SP01', price: 220, lead: 14, moq: 50, primary: false },
  ],
  S0002: [
    { partCode: 'OF-1003', vendorCode: 'YF-O1003', price: 290, lead: 5, moq: 20, primary: false },
    { partCode: 'AF-1100', vendorCode: 'YF-A1100', price: 380, lead: 5, moq: 20, primary: true },
    { partCode: 'BD-5001', vendorCode: 'YF-BD51', price: 1380, lead: 14, moq: 4, primary: false },
  ],
  S0003: [
    { partCode: 'BP-0021', vendorCode: 'NSB-BP21', price: 980, lead: 21, moq: 100, primary: false },
    { partCode: 'BP-0022', vendorCode: 'NSB-BP22', price: 820, lead: 21, moq: 100, primary: false },
    { partCode: 'BP-0023', vendorCode: 'NSB-BP23', price: 760, lead: 21, moq: 100, primary: false },
    { partCode: 'BP-0145', vendorCode: 'NSB-BP145', price: 1180, lead: 21, moq: 100, primary: false },
  ],
  S0004: [
    { partCode: 'SP-7001', vendorCode: 'DEN-IR7001', price: 175, lead: 21, moq: 50, primary: true },
    { partCode: 'SP-7002', vendorCode: 'DEN-PT7002', price: 145, lead: 21, moq: 50, primary: true },
  ],
};

export function partOf(code: string): PartMock | undefined {
  return PARTS.find((p) => p.code === code);
}

export function brandOf(id: string): BrandMock | undefined {
  return BRANDS.find((b) => b.id === id);
}

export function partsInBrand(brandId: string): PartMock[] {
  return PARTS.filter((p) => p.brand === brandId);
}
