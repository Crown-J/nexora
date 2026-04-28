// packages/db-core/prisma/seed/demo/lib/parts-catalog.ts
// @FUNCTION_CODE SYS-DEMO-LIB-004-F01
// 13 sub-brand 料號 catalog（Crown Q5 拍板：VAG 70% + Asian 20% + Euro/US 10%）
//
// 設計：每個 sub-brand 一個 brand_code_rule，
//      sub-brand 下生成的料號用「真實感模板」（如 VAG 8K0-XXX-XXX、Toyota 90919-XXXX）

export type BrandGroup = 'VAG' | 'Asian' | 'Euro/US';

export interface SubBrandConfig {
  /** 顯示名稱（對應 nx01_part_brand template seed 的 name） */
  name: string;
  /** 料號 prefix（生成 part code 用） */
  codePrefix: string;
  /** 對應 part_brand record 的 code（template seed 已建）*/
  brandCode: string;
  group: BrandGroup;
  /** 真實業界常見的零件類別 + 簡短名稱 */
  partTemplates: Array<{ suffix: string; name: string }>;
}

/** 13 個 sub-brand：VAG 4 + Asian 5 + Euro/US 4 */
export const SUB_BRANDS: SubBrandConfig[] = [
  // ===== VAG (70%) =====
  {
    name: 'Volkswagen',
    codePrefix: 'VW',
    brandCode: 'VW',
    group: 'VAG',
    partTemplates: [
      { suffix: '8K0-201-051', name: '燃油濾芯' },
      { suffix: '06J-115-561', name: '機油濾芯' },
      { suffix: '8K0-955-453', name: '雨刷膠條' },
      { suffix: '4F0-129-620', name: '空氣濾清器' },
      { suffix: '8K0-907-355', name: '煞車片（前）' },
      { suffix: '8K0-907-356', name: '煞車片（後）' },
      { suffix: '06H-103-269', name: '正時皮帶' },
      { suffix: '03H-115-105', name: '機油泵' },
      { suffix: '8K0-498-625', name: '輪轂軸承' },
      { suffix: '8K0-413-031', name: '前避震器' },
    ],
  },
  {
    name: 'Audi',
    codePrefix: 'AU',
    brandCode: 'AUDI',
    group: 'VAG',
    partTemplates: [
      { suffix: '8E0-260-805', name: '冷氣壓縮機' },
      { suffix: '8K0-959-455', name: '冷卻水泵' },
      { suffix: '06H-906-051', name: '燃油壓力傳感器' },
      { suffix: '8K0-905-851', name: '點火線圈' },
      { suffix: '4G0-906-262', name: 'O2 含氧傳感器' },
      { suffix: '03H-103-484', name: '汽門室蓋墊' },
      { suffix: '8R0-501-203', name: '後輪驅動軸' },
      { suffix: '4F0-407-505', name: '懸吊三角架' },
    ],
  },
  {
    name: 'SEAT',
    codePrefix: 'SE',
    brandCode: 'SEAT',
    group: 'VAG',
    partTemplates: [
      { suffix: '6L0-955-425', name: '雨刷臂' },
      { suffix: '6L0-919-501', name: '溫度傳感器' },
      { suffix: '6L0-906-265', name: 'ABS 控制單元' },
      { suffix: '6L0-407-191', name: '前控制臂' },
    ],
  },
  {
    name: 'Skoda',
    codePrefix: 'SK',
    brandCode: 'SKODA',
    group: 'VAG',
    partTemplates: [
      { suffix: '5J0-422-887', name: '動力轉向油泵' },
      { suffix: '5J0-955-985', name: '雨刷馬達' },
      { suffix: '5J0-721-388', name: '離合器主缸' },
    ],
  },

  // ===== Asian (20%) =====
  {
    name: 'Toyota',
    codePrefix: 'TY',
    brandCode: 'TOYOTA',
    group: 'Asian',
    partTemplates: [
      { suffix: '90919-02240', name: '點火線圈' },
      { suffix: '17801-0H050', name: '空氣濾芯' },
      { suffix: '04465-33240', name: '煞車片（前）' },
      { suffix: '88310-12200', name: '冷氣壓縮機' },
      { suffix: '23209-0P010', name: '燃油噴射器' },
    ],
  },
  {
    name: 'Honda',
    codePrefix: 'HD',
    brandCode: 'HONDA',
    group: 'Asian',
    partTemplates: [
      { suffix: '15400-PLM-A02', name: '機油濾芯' },
      { suffix: '17220-RAA-A00', name: '空氣濾芯' },
      { suffix: '45022-S5A-J01', name: '煞車片（前）' },
    ],
  },
  {
    name: 'Nissan',
    codePrefix: 'NS',
    brandCode: 'NISSAN',
    group: 'Asian',
    partTemplates: [
      { suffix: '15208-65F0E', name: '機油濾芯' },
      { suffix: 'AY060-NS049', name: '雨刷膠條' },
    ],
  },
  {
    name: 'Mazda',
    codePrefix: 'MZ',
    brandCode: 'MAZDA',
    group: 'Asian',
    partTemplates: [
      { suffix: 'L321-15-907', name: '冷卻水泵' },
      { suffix: 'PE01-13-Z40', name: '機油濾芯' },
    ],
  },
  {
    name: 'Hyundai',
    codePrefix: 'HY',
    brandCode: 'HYUNDAI',
    group: 'Asian',
    partTemplates: [
      { suffix: '26300-35504', name: '機油濾芯' },
      { suffix: '28113-2K000', name: '空氣濾芯' },
    ],
  },

  // ===== Euro/US (10%) =====
  {
    name: 'BMW',
    codePrefix: 'BW',
    brandCode: 'BMW',
    group: 'Euro/US',
    partTemplates: [
      { suffix: '11427566327', name: '機油濾芯' },
      { suffix: '13718616909', name: '空氣濾芯' },
      { suffix: '34116794300', name: '煞車片（前）' },
    ],
  },
  {
    name: 'Mercedes-Benz',
    codePrefix: 'MB',
    brandCode: 'BENZ',
    group: 'Euro/US',
    partTemplates: [
      { suffix: 'A0001802609', name: '機油濾芯' },
      { suffix: 'A0001401378', name: '空氣濾芯' },
    ],
  },
  {
    name: 'Ford',
    codePrefix: 'FD',
    brandCode: 'FORD',
    group: 'Euro/US',
    partTemplates: [
      { suffix: 'AE5Z-6731-A', name: '機油濾芯' },
      { suffix: 'CN1Z-9601-A', name: '空氣濾芯' },
    ],
  },
  {
    name: 'GM',
    codePrefix: 'GM',
    brandCode: 'GM',
    group: 'Euro/US',
    partTemplates: [
      { suffix: 'PF457G', name: '機油濾芯' },
    ],
  },
];

/** 給定總料號數 → 各 sub-brand 應產生幾筆（VAG 70% / Asian 20% / Euro/US 10%）*/
export function distributePartCounts(totalParts: number): Record<string, number> {
  const vagSubs = SUB_BRANDS.filter((b) => b.group === 'VAG');
  const asianSubs = SUB_BRANDS.filter((b) => b.group === 'Asian');
  const euroUsSubs = SUB_BRANDS.filter((b) => b.group === 'Euro/US');

  const vagTotal = Math.round(totalParts * 0.7);
  const asianTotal = Math.round(totalParts * 0.2);
  const euroUsTotal = totalParts - vagTotal - asianTotal;

  const result: Record<string, number> = {};
  const distribute = (subs: SubBrandConfig[], total: number) => {
    if (subs.length === 0 || total === 0) return;
    const base = Math.floor(total / subs.length);
    const remainder = total - base * subs.length;
    subs.forEach((sub, idx) => {
      result[sub.name] = base + (idx < remainder ? 1 : 0);
    });
  };
  distribute(vagSubs, vagTotal);
  distribute(asianSubs, asianTotal);
  distribute(euroUsSubs, euroUsTotal);
  return result;
}

/**
 * 給定 sub-brand + 該 sub-brand 內第 N 個料號 → 生成 (code, name)
 *
 * 範例：
 *   buildPartCode('Volkswagen', 0, 5)   → { code: 'VW-8K0-201-051', name: 'VW 燃油濾芯' }
 *   buildPartCode('Toyota', 2, 3)       → { code: 'TY-04465-33240', name: 'Toyota 煞車片（前）' }
 *
 * 當 idx > template 數量時，循環使用模板 + 加 -V2/-V3 後綴避免 code 撞號
 */
export function buildPartCode(
  subBrandName: string,
  idx: number,
): { code: string; name: string; categoryRatio: number } {
  const sub = SUB_BRANDS.find((b) => b.name === subBrandName);
  if (!sub) throw new Error(`Unknown sub-brand: ${subBrandName}`);

  const tplIdx = idx % sub.partTemplates.length;
  const cycleNo = Math.floor(idx / sub.partTemplates.length);
  const tpl = sub.partTemplates[tplIdx];
  const variantSuffix = cycleNo === 0 ? '' : `-V${cycleNo + 1}`;
  const code = `${sub.codePrefix}-${tpl.suffix}${variantSuffix}`;
  const name = `${sub.name} ${tpl.name}${variantSuffix}`;
  // 模板前段（機油/空氣/雨刷）= consumable，中段（煞車/點火）= service，後段（避震/三角架）= structural
  const categoryRatio = tplIdx / sub.partTemplates.length;
  return { code, name, categoryRatio };
}
