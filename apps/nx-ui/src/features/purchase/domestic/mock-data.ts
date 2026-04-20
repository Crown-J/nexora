/**
 * 國內採購工作台 DEMO mock（TASK-0420-G）
 */

export type DemandSource = 'system' | 'sales';

export type MockDemand = {
  no: string;
  date: string;
  partCode: string;
  partName: string;
  qty: number;
  unit?: string;
  source: DemandSource;
  isUrgent: boolean;
  currentStock: number;
  safetyStock: number;
  suggestedVendor: string | null;
  salesName: string | null;
  customerName: string | null;
  remark: string | null;
};

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
    qty: 50,
    unit: '個',
    source: 'system',
    isUrgent: false,
    currentStock: 8,
    safetyStock: 30,
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
    qty: 200,
    unit: '個',
    source: 'sales',
    isUrgent: true,
    currentStock: 0,
    safetyStock: 100,
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
    qty: 30,
    unit: '組',
    source: 'system',
    isUrgent: false,
    currentStock: 2,
    safetyStock: 15,
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
      qty: 24,
      unit: '瓶',
      source: 'system',
      isUrgent: false,
      currentStock: 4,
      safetyStock: 20,
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
      qty: 80,
      unit: '個',
      source: 'sales',
      isUrgent: false,
      currentStock: 12,
      safetyStock: 10,
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
      qty: 6,
      unit: '顆',
      source: 'system',
      isUrgent: false,
      currentStock: 1,
      safetyStock: 4,
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
      qty: 40,
      unit: '組',
      source: 'system',
      isUrgent: false,
      currentStock: 6,
      safetyStock: 25,
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
      qty: 120,
      unit: '個',
      source: 'sales',
      isUrgent: true,
      currentStock: 30,
      safetyStock: 20,
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
      qty: 15,
      unit: '組',
      source: 'system',
      isUrgent: false,
      currentStock: 0,
      safetyStock: 8,
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
      qty: 60,
      unit: '瓶',
      source: 'system',
      isUrgent: false,
      currentStock: 10,
      safetyStock: 36,
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
      qty: 48,
      unit: '支',
      source: 'sales',
      isUrgent: false,
      currentStock: 20,
      safetyStock: 24,
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
      qty: 8,
      unit: '組',
      source: 'system',
      isUrgent: false,
      currentStock: 1,
      safetyStock: 6,
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

/** 依待詢價清單順序，依建議廠商分組產生 RF 拆單預覽 */
export function buildRfqSplitPreview(orderedDemands: MockDemand[], seqStart = 1): RfqSplitLine[] {
  const seen = new Map<string, MockDemand[]>();
  const orderKeys: string[] = [];
  for (const d of orderedDemands) {
    const key = d.suggestedVendor ?? '__NONE__';
    if (!seen.has(key)) {
      seen.set(key, []);
      orderKeys.push(key);
    }
    seen.get(key)!.push(d);
  }
  return orderKeys.map((key, i) => {
    const list = seen.get(key)!;
    const unspecified = key === '__NONE__';
    const vendorLabel = unspecified ? '（未指定廠商）' : key;
    return {
      rfqNo: `RF-202604-${String(seqStart + i).padStart(3, '0')}`,
      vendorLabel,
      partCount: list.length,
      unspecified,
    };
  });
}
