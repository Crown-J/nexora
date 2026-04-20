/**
 * 國內採購工作台 DEMO mock（TASK-0420-G / TASK-0420-H）
 */

export type DemandSource = 'system' | 'sales';

export type MockDemand = {
  no: string;
  date: string;
  partCode: string;
  partName: string;
  /** 零件廠牌（例：MANN、BOSCH） */
  partBrand: string;
  qty: number;
  unit?: string;
  source: DemandSource;
  isUrgent: boolean;
  currentStock: number;
  safetyStock: number;
  /** 庫存上限（補貨目標）；待詢價數量預設＝補滿至此量 */
  maxStock: number;
  /** Mock：預估庫存可銷月數；API 後改為 現存量÷平均日出貨÷30 */
  turnoverMonths: number;
  suggestedVendor: string | null;
  salesName: string | null;
  customerName: string | null;
  remark: string | null;
};

export type MockVendor = {
  id: string;
  name: string;
  grade: string;
  brands: string[];
};

export const MOCK_VENDORS: MockVendor[] = [
  { id: 'v1', name: '德國汽配 GmbH', grade: 'A', brands: ['VAG', 'BOSCH', 'HELLA'] },
  { id: 'v2', name: '台北馬勒', grade: 'A', brands: ['MANN', 'SHELL', 'CASTROL'] },
  { id: 'v3', name: '新竹電容', grade: 'B', brands: ['MANN', 'HENGST'] },
  { id: 'v4', name: '高雄汽配', grade: 'B', brands: ['BOSCH', 'CASTROL'] },
];

/** 周轉文案（Mock） */
export function turnoverMonthsLabel(months: number): string {
  if (months <= 0) return '庫存已耗盡';
  const m = Number.isInteger(months) ? String(months) : months.toFixed(1);
  return `預估 ${m} 個月後售完`;
}

/** >3 綠、1～3 橘、<1 或已耗盡 紅 */
export function turnoverMonthsTone(months: number): 'green' | 'orange' | 'red' {
  if (months <= 0) return 'red';
  if (months > 3) return 'green';
  if (months >= 1) return 'orange';
  return 'red';
}

/** 預設詢價／補貨量：優先補至最高庫存；已達上限則退回需求單數量 */
export function defaultRfqQty(d: MockDemand): number {
  const fill = d.maxStock - d.currentStock;
  if (fill > 0) return fill;
  return Math.max(1, d.qty);
}

export type FlowNodeKey = 'demand' | 'rfq' | 'po' | 'rr' | 'pr' | 'warranty';

export type NodeBadges = Record<FlowNodeKey, number>;

/** 初始節點 badge（需求筆數與列表同步時以外欄位為主） */
export const INITIAL_NODE_BADGES: NodeBadges = {
  demand: 12,
  rfq: 3,
  po: 2,
  rr: 1,
  pr: 0,
  warranty: 2,
};

const BASE_DEMANDS: MockDemand[] = [
  {
    no: 'DR-202604-001',
    date: '2026-04-20',
    partCode: 'VAG-1K0·129·620·A',
    partName: 'IC-7805 空氣濾芯',
    partBrand: 'MANN',
    qty: 50,
    unit: '個',
    source: 'system',
    isUrgent: false,
    currentStock: 8,
    safetyStock: 30,
    maxStock: 80,
    turnoverMonths: 2.3,
    suggestedVendor: '德國汽配 GmbH',
    salesName: null,
    customerName: null,
    remark: null,
  },
  {
    no: 'DR-202604-002',
    date: '2026-04-20',
    partCode: 'CAP-100UF-25V',
    partName: '電容 100uF',
    partBrand: '自營',
    qty: 200,
    unit: '個',
    source: 'sales',
    isUrgent: true,
    currentStock: 0,
    safetyStock: 100,
    maxStock: 280,
    turnoverMonths: 0,
    suggestedVendor: null,
    salesName: '王小明',
    customerName: '台北電子有限公司',
    remark: '客戶急需，本週五前要到貨',
  },
  {
    no: 'DR-202604-003',
    date: '2026-04-19',
    partCode: 'MANN-C27519',
    partName: '煞車皮 MANN',
    partBrand: 'MANN',
    qty: 30,
    unit: '組',
    source: 'system',
    isUrgent: false,
    currentStock: 2,
    safetyStock: 15,
    maxStock: 48,
    turnoverMonths: 0.8,
    suggestedVendor: '台北馬勒',
    salesName: null,
    customerName: null,
    remark: null,
  },
];

function padDemandsTo12(): MockDemand[] {
  const out = [...BASE_DEMANDS];
  const templates: MockDemand[] = [
    {
      no: '',
      date: '2026-04-18',
      partCode: 'OIL-5W30-4L',
      partName: '全合成機油 5W-30',
      partBrand: 'Castrol',
      qty: 24,
      unit: '瓶',
      source: 'system',
      isUrgent: false,
      currentStock: 4,
      safetyStock: 20,
      maxStock: 60,
      turnoverMonths: 1.5,
      suggestedVendor: '台北馬勒',
      salesName: null,
      customerName: null,
      remark: null,
    },
    {
      no: '',
      date: '2026-04-18',
      partCode: 'FIL-HENGST-E19',
      partName: '機油濾芯',
      partBrand: 'HENGST',
      qty: 80,
      unit: '個',
      source: 'sales',
      isUrgent: false,
      currentStock: 12,
      safetyStock: 10,
      maxStock: 56,
      turnoverMonths: 4.1,
      suggestedVendor: '德國汽配 GmbH',
      salesName: '林業務',
      customerName: '高雄保修廠',
      remark: null,
    },
    {
      no: '',
      date: '2026-04-17',
      partCode: 'BAT-VAG-0001',
      partName: '12V 電瓶 70Ah',
      partBrand: 'VARTA',
      qty: 6,
      unit: '顆',
      source: 'system',
      isUrgent: false,
      currentStock: 1,
      safetyStock: 4,
      maxStock: 18,
      turnoverMonths: 2.2,
      suggestedVendor: null,
      salesName: null,
      customerName: null,
      remark: null,
    },
    {
      no: '',
      date: '2026-04-17',
      partCode: 'WIP-BOSCH-A',
      partName: '雨刷 24吋',
      partBrand: 'BOSCH',
      qty: 40,
      unit: '組',
      source: 'system',
      isUrgent: false,
      currentStock: 6,
      safetyStock: 25,
      maxStock: 72,
      turnoverMonths: 3,
      suggestedVendor: '台北馬勒',
      salesName: null,
      customerName: null,
      remark: null,
    },
    {
      no: '',
      date: '2026-04-16',
      partCode: 'LMP-H7-55W',
      partName: 'H7 鹵素燈泡',
      partBrand: 'OSRAM',
      qty: 120,
      unit: '個',
      source: 'sales',
      isUrgent: true,
      currentStock: 30,
      safetyStock: 20,
      maxStock: 100,
      turnoverMonths: 0.2,
      suggestedVendor: '德國汽配 GmbH',
      salesName: '王小明',
      customerName: '台北電子有限公司',
      remark: '門市展示急用',
    },
    {
      no: '',
      date: '2026-04-16',
      partCode: 'BEL-CONTINENTAL',
      partName: '正時皮帶套件',
      partBrand: 'Continental',
      qty: 15,
      unit: '組',
      source: 'system',
      isUrgent: false,
      currentStock: 0,
      safetyStock: 8,
      maxStock: 36,
      turnoverMonths: 0,
      suggestedVendor: '德國汽配 GmbH',
      salesName: null,
      customerName: null,
      remark: null,
    },
    {
      no: '',
      date: '2026-04-15',
      partCode: 'COOL-G12-1L',
      partName: '冷卻液 G12 1L',
      partBrand: 'VAG OEM',
      qty: 60,
      unit: '瓶',
      source: 'system',
      isUrgent: false,
      currentStock: 10,
      safetyStock: 36,
      maxStock: 96,
      turnoverMonths: 2.8,
      suggestedVendor: '台北馬勒',
      salesName: null,
      customerName: null,
      remark: null,
    },
    {
      no: '',
      date: '2026-04-15',
      partCode: 'PLG-NGK-BKR6E',
      partName: '火星塞 NGK',
      partBrand: 'NGK',
      qty: 48,
      unit: '支',
      source: 'sales',
      isUrgent: false,
      currentStock: 20,
      safetyStock: 24,
      maxStock: 72,
      turnoverMonths: 5,
      suggestedVendor: null,
      salesName: '陳業務',
      customerName: '新竹保修',
      remark: '指定品牌',
    },
    {
      no: '',
      date: '2026-04-14',
      partCode: 'DISC-ATE-288',
      partName: '煞車碟盤 前',
      partBrand: 'ATE',
      qty: 8,
      unit: '組',
      source: 'system',
      isUrgent: false,
      currentStock: 1,
      safetyStock: 6,
      maxStock: 24,
      turnoverMonths: 1.2,
      suggestedVendor: '德國汽配 GmbH',
      salesName: null,
      customerName: null,
      remark: null,
    },
  ];
  let n = 4;
  for (const t of templates) {
    out.push({
      ...t,
      no: `DR-202604-${String(n).padStart(3, '0')}`,
    });
    n += 1;
  }
  return out;
}

export function cloneInitialDemands(): MockDemand[] {
  return padDemandsTo12().map((d) => ({ ...d }));
}

export type RfqSplitLine = {
  rfqNo: string;
  vendorLabel: string;
  partCount: number;
  unspecified: boolean;
};

/** 待詢價清單 DEMO：單一批次詢價單預覽（不依廠商拆單） */
export function buildRfqSplitPreview(orderedDemands: MockDemand[], seqStart = 1): RfqSplitLine[] {
  if (orderedDemands.length === 0) return [];
  return [
    {
      rfqNo: `RF-202604-${String(seqStart).padStart(3, '0')}`,
      vendorLabel: '批次詢價',
      partCount: orderedDemands.length,
      unspecified: false,
    },
  ];
}
