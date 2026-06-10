/**
 * File: apps/nx-ui/src/features/nx03/workflow/mock/operation.mock.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 實際銷貨操作：關鍵字搜尋零件族、族內多筆通用件各自之庫存／報價／進貨／成交（mock）
 *
 * Notes:
 * - `searchPartFamilies` 為前端比對，不呼叫 API
 */

/** 報價／成交列表列 */
export interface OperationQuoteRow {
  quoteNo: string;
  customerName: string;
  unitPrice: string;
  date: string;
}

export interface OperationDealRow {
  docNo: string;
  customerName: string;
  amount: string;
  date: string;
}

/** 成本與建議報價（mock 分析文字） */
export interface PricingAssistInsight {
  /** 建議對客參考單價 */
  suggestedQuote: string;
  /** 市場／歷史參考區間 */
  quoteRange: string;
  /** 毛利或加成說明 */
  marginHint: string;
  /** 進貨價與成本差異說明 */
  purchaseVsCostNote: string;
}

/** 單一料號（含原廠或某一副廠）之完整作業快照 */
export interface PartVariantSnapshot {
  id: string;
  partNo: string;
  partName: string;
  /** 例如：原廠件、副廠通用 */
  roleLabel: string;
  /** 此料適用／標示廠牌 */
  brands: string[];
  stockByWarehouse: Array<{ warehouse: string; qty: number; safety: number }>;
  lastPurchasePrice: string;
  costPrice: string;
  quotesThisCustomer: OperationQuoteRow[];
  quotesOtherCustomers: OperationQuoteRow[];
  dealsThisCustomer: OperationDealRow[];
  dealsOtherCustomers: OperationDealRow[];
  pricingAssist: PricingAssistInsight;
}

/** 同一產品線下多個可互換料號 */
export interface PartFamilyGroup {
  id: string;
  /** 搜尋結果標題 */
  title: string;
  /** 比對用：料號片段、品名、關鍵字、廠牌代碼等 */
  keywords: string[];
  /** 族內可切換之料號（每筆各自庫存／報價／成交） */
  variants: PartVariantSnapshot[];
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * @FUNCTION_CODE NX03-WKFL-MOCK-002-F01
 * 示範兩組零件族（水泵、煞車來令），各族 2～3 個可互換料號。
 */
export const MOCK_PART_FAMILIES: PartFamilyGroup[] = [
  {
    id: 'fam-pump-vag',
    title: '水泵總成（VAG 1.8T 系）',
    keywords: [
      '06h',
      '121',
      '026',
      'dd',
      '水泵',
      'water',
      'pump',
      'vag',
      '1.8t',
      'gmb',
      'gmwz',
      '48a',
      'ina',
      '538',
      '0363',
    ],
    variants: [
      {
        id: 'var-oem-06h',
        partNo: '06H 121 026 DD',
        partName: '水泵總成',
        roleLabel: '原廠件',
        brands: ['VAG 原廠'],
        stockByWarehouse: [
          { warehouse: 'A 倉（總倉）', qty: 6, safety: 2 },
          { warehouse: 'B 倉（北區）', qty: 0, safety: 1 },
        ],
        lastPurchasePrice: 'NT$ 2,180.00',
        costPrice: 'NT$ 1,650.00',
        quotesThisCustomer: [
          { quoteNo: 'QT-S-201', customerName: '祥和汽車修配廠', unitPrice: 'NT$ 2,890', date: '2024-01-18' },
          { quoteNo: 'QT-S-188', customerName: '祥和汽車修配廠', unitPrice: 'NT$ 2,750', date: '2023-12-05' },
        ],
        quotesOtherCustomers: [
          { quoteNo: 'QT-S-210', customerName: '大順汽車百貨', unitPrice: 'NT$ 2,920', date: '2024-01-20' },
          { quoteNo: 'QT-S-175', customerName: '桃園保修站', unitPrice: 'NT$ 2,680', date: '2024-01-02' },
        ],
        dealsThisCustomer: [
          { docNo: 'SO-2312-088', customerName: '祥和汽車修配廠', amount: 'NT$ 8,340', date: '2023-12-18' },
        ],
        dealsOtherCustomers: [
          { docNo: 'SO-2401-015', customerName: '大順汽車百貨', amount: 'NT$ 2,920', date: '2024-01-12' },
          { docNo: 'SO-2311-044', customerName: '新竹車業有限公司', amount: 'NT$ 5,400', date: '2023-11-28' },
        ],
        pricingAssist: {
          suggestedQuote: 'NT$ 2,750',
          quoteRange: 'NT$ 2,680 ～ 2,920（參考本客戶與同業近次報價）',
          marginHint: '以成本 NT$ 1,650 估算，約 40～43% 毛利區間（未計營業費用）',
          purchaseVsCostNote:
            '上次進貨 NT$ 2,180 高於帳上成本，可能含運費、關務或批次折讓；定價建議以成本為底再加重置價與保固政策。',
        },
      },
      {
        id: 'var-gmb-48a',
        partNo: 'GMB GWMZ-48A',
        partName: '水泵總成（副廠）',
        roleLabel: '副廠通用',
        brands: ['GMB'],
        stockByWarehouse: [
          { warehouse: 'A 倉（總倉）', qty: 14, safety: 3 },
          { warehouse: 'B 倉（北區）', qty: 4, safety: 2 },
        ],
        lastPurchasePrice: 'NT$ 1,420.00',
        costPrice: 'NT$ 1,080.00',
        quotesThisCustomer: [
          { quoteNo: 'QT-S-215', customerName: '祥和汽車修配廠', unitPrice: 'NT$ 1,990', date: '2024-01-15' },
        ],
        quotesOtherCustomers: [
          { quoteNo: 'QT-S-220', customerName: '大順汽車百貨', unitPrice: 'NT$ 2,050', date: '2024-01-10' },
          { quoteNo: 'QT-S-198', customerName: '桃園保修站', unitPrice: 'NT$ 1,880', date: '2023-12-28' },
        ],
        dealsThisCustomer: [
          { docNo: 'SO-2401-040', customerName: '祥和汽車修配廠', amount: 'NT$ 3,980', date: '2024-01-05' },
        ],
        dealsOtherCustomers: [
          { docNo: 'SO-2312-120', customerName: '新竹車業有限公司', amount: 'NT$ 4,100', date: '2023-12-20' },
        ],
        pricingAssist: {
          suggestedQuote: 'NT$ 1,950',
          quoteRange: 'NT$ 1,880 ～ 2,050',
          marginHint: '庫存充足，可採中位報價；毛利約 44～48%',
          purchaseVsCostNote: '進貨與成本接近，價差小；適合走量或搭配套餐。',
        },
      },
      {
        id: 'var-ina-538',
        partNo: 'INA 538 0363 10',
        partName: '水泵軸承套件（可併換）',
        roleLabel: '維修包／併換',
        brands: ['INA', 'Schaeffler'],
        stockByWarehouse: [
          { warehouse: 'A 倉（總倉）', qty: 22, safety: 5 },
          { warehouse: 'C 倉（料架）', qty: 8, safety: 2 },
        ],
        lastPurchasePrice: 'NT$ 890.00',
        costPrice: 'NT$ 620.00',
        quotesThisCustomer: [
          { quoteNo: 'QT-S-230', customerName: '祥和汽車修配廠', unitPrice: 'NT$ 1,250', date: '2024-01-12' },
        ],
        quotesOtherCustomers: [
          { quoteNo: 'QT-S-231', customerName: '大順汽車百貨', unitPrice: 'NT$ 1,320', date: '2024-01-08' },
        ],
        dealsThisCustomer: [],
        dealsOtherCustomers: [
          { docNo: 'SO-2311-099', customerName: '桃園保修站', amount: 'NT$ 2,640', date: '2023-11-15' },
        ],
        pricingAssist: {
          suggestedQuote: 'NT$ 1,180',
          quoteRange: 'NT$ 1,120 ～ 1,320',
          marginHint: '維修包毛利可略低於總成；約 48～52%',
          purchaseVsCostNote: '單價低、周转快；注意包裝與退貨成本。',
        },
      },
    ],
  },
  {
    id: 'fam-brake-bosch',
    title: '前煞車來令（Bosch 對應）',
    keywords: ['煞車', '來令', 'bosch', '0986', 'ab12', '前煞', '刹车'],
    variants: [
      {
        id: 'var-bosch-0986',
        partNo: '0 986 AB12 34',
        partName: '前煞車來令片組',
        roleLabel: 'Bosch 型號',
        brands: ['Bosch'],
        stockByWarehouse: [
          { warehouse: 'A 倉（總倉）', qty: 30, safety: 8 },
          { warehouse: 'B 倉（北區）', qty: 12, safety: 4 },
        ],
        lastPurchasePrice: 'NT$ 980.00',
        costPrice: 'NT$ 720.00',
        quotesThisCustomer: [
          { quoteNo: 'QT-S-300', customerName: '祥和汽車修配廠', unitPrice: 'NT$ 1,280', date: '2024-01-21' },
        ],
        quotesOtherCustomers: [
          { quoteNo: 'QT-S-301', customerName: '大順汽車百貨', unitPrice: 'NT$ 1,350', date: '2024-01-19' },
        ],
        dealsThisCustomer: [
          { docNo: 'SO-2401-200', customerName: '祥和汽車修配廠', amount: 'NT$ 2,560', date: '2024-01-14' },
        ],
        dealsOtherCustomers: [
          { docNo: 'SO-2401-198', customerName: '桃園保修站', amount: 'NT$ 1,350', date: '2024-01-11' },
        ],
        pricingAssist: {
          suggestedQuote: 'NT$ 1,220',
          quoteRange: 'NT$ 1,200 ～ 1,350',
          marginHint: '庫存健康；毛利約 41～46%',
          purchaseVsCostNote: 'Bosch 品牌可略高於副廠對應件；留意同業促銷檔期。',
        },
      },
      {
        id: 'var-trw-alt',
        partNo: 'TRW GDB1234',
        partName: '前煞車來令（副廠）',
        roleLabel: '副廠對應',
        brands: ['TRW'],
        stockByWarehouse: [
          { warehouse: 'A 倉（總倉）', qty: 5, safety: 2 },
          { warehouse: 'B 倉（北區）', qty: 0, safety: 1 },
        ],
        lastPurchasePrice: 'NT$ 760.00',
        costPrice: 'NT$ 550.00',
        quotesThisCustomer: [
          { quoteNo: 'QT-S-305', customerName: '祥和汽車修配廠', unitPrice: 'NT$ 1,050', date: '2024-01-20' },
        ],
        quotesOtherCustomers: [
          { quoteNo: 'QT-S-306', customerName: '新竹車業有限公司', unitPrice: 'NT$ 1,120', date: '2024-01-17' },
        ],
        dealsThisCustomer: [],
        dealsOtherCustomers: [
          { docNo: 'SO-2312-210', customerName: '大順汽車百貨', amount: 'NT$ 2,240', date: '2023-12-30' },
        ],
        pricingAssist: {
          suggestedQuote: 'NT$ 980',
          quoteRange: 'NT$ 950 ～ 1,120',
          marginHint: '北倉缺貨時可報交期或改調 A 倉；毛利約 45～50%',
          purchaseVsCostNote: '副廠件以成本加固定加成即可；若與 Bosch 同時報價，需標示品牌差異。',
        },
      },
    ],
  },
];

function familyHaystack(fam: PartFamilyGroup): string {
  return [
    fam.title,
    ...fam.keywords,
    ...fam.variants.flatMap((v) => [v.partNo, v.partName, v.roleLabel, ...v.brands]),
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * @FUNCTION_CODE NX03-WKFL-MOCK-002-F02
 * 關鍵字搜尋：料號、品名、廠牌代碼等；**任一分詞**命中該族即列入（符合實務關鍵字習慣）。
 */
export function searchPartFamilies(query: string): PartFamilyGroup[] {
  const nq = norm(query);
  if (!nq) return [];

  const tokens = nq.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  return MOCK_PART_FAMILIES.filter((fam) => {
    const hay = familyHaystack(fam);
    return tokens.some((t) => hay.includes(t));
  });
}
