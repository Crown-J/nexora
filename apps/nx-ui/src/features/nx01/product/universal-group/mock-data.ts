// apps/nx-ui/src/features/nx01/product/universal-group/mock-data.ts
// 通用件群組 mock 資料（Step 5、純前端 UI 跑通用）
// 後續軌（API 串接）會用 PartDto / UniversalGroupDto 替換
//
// 規模：20 個零件 / 3 個群組
// 業務語意（執行長拍板）：
//   - 群組標題 = 主件（用料號搜尋找群組）
//   - 主件 unique（不能兩群組同主件）
//   - 同顆零件可在多群組當成員
//   - 主件不可移除、要先換主件再移除
//   - 砍掉專屬售價（用零件主檔售價）、保留備註

export type PartMock = {
  code: string;
  name: string;
  brand: string;
  origin: string;
};

export type GroupMemberMock = {
  partCode: string;
  note?: string;
};

export type UniversalGroupMock = {
  id: string;
  mainPartCode: string;
  note?: string;
  members: GroupMemberMock[];
};

export const PARTS: PartMock[] = [
  { code: 'OF-1003', name: '機油濾芯 1.3L', brand: '博世', origin: '德國' },
  { code: 'OF-2207', name: '機油濾芯 2.0L', brand: '博世', origin: '中國' },
  { code: 'OF-2208', name: '機油濾芯 2.0L 改', brand: '博世', origin: '中國' },
  { code: 'OF-3110', name: '機油濾芯 通用', brand: '曼牌', origin: '德國' },
  { code: 'OF-4500', name: '機油濾芯 柴油', brand: '曼牌', origin: '德國' },
  { code: 'BP-0021', name: '前煞車來令片', brand: '日清紡', origin: '日本' },
  { code: 'BP-0022', name: '後煞車來令片', brand: '日清紡', origin: '日本' },
  { code: 'BP-0023', name: '前煞車來令片 C', brand: '日清紡', origin: '中國' },
  { code: 'BP-0210', name: '前煞車來令片', brand: '電裝', origin: '日本' },
  { code: 'BP-0145', name: '前煞車來令片(陶瓷)', brand: '日清紡', origin: '台灣' },
  { code: 'BD-5001', name: '前煞車碟盤', brand: '博世', origin: '德國' },
  { code: 'BD-5002', name: '後煞車碟盤', brand: '博世', origin: '中國' },
  { code: 'BD-5003', name: '前煞車碟盤 D', brand: '博世', origin: '德國' },
  { code: 'SP-7001', name: '銥合金火星塞', brand: '電裝', origin: '日本' },
  { code: 'SP-7002', name: '白金火星塞', brand: '電裝', origin: '日本' },
  { code: 'SP-7100', name: '一般火星塞', brand: '博世', origin: '德國' },
  { code: 'AF-1100', name: '空氣濾芯 1.5L', brand: '博世', origin: '德國' },
  { code: 'AF-2250', name: '空氣濾芯 2.4L', brand: '電裝', origin: '日本' },
  { code: 'SK-8001', name: '前避震器', brand: 'KYB', origin: '日本' },
  { code: 'SK-8002', name: '後避震器', brand: 'KYB', origin: '日本' },
];

export const GROUPS_SEED: UniversalGroupMock[] = [
  {
    id: 'UG001',
    mainPartCode: 'OF-1003',
    note: '1.3〜2.0L 機油濾芯共用',
    members: [
      { partCode: 'OF-1003' },
      { partCode: 'OF-3110', note: '德國 MANN 雙向替代' },
      { partCode: 'OF-2207' },
    ],
  },
  {
    id: 'UG002',
    mainPartCode: 'BP-0021',
    members: [
      { partCode: 'BP-0021' },
      { partCode: 'BP-0210', note: '電裝同規' },
      { partCode: 'BP-0023', note: '中國產便宜替代' },
    ],
  },
  {
    id: 'UG003',
    mainPartCode: 'SP-7001',
    note: '火星塞通用',
    members: [{ partCode: 'SP-7001' }],
  },
];

export function partOf(code: string): PartMock | undefined {
  return PARTS.find((p) => p.code === code);
}
