/**
 * @FUNCTION_CODE NX02-VEND-UI-001-F01
 * 採購「供應商管理」DEMO mock
 */

export type VendorType = 'S' | 'T' | 'V';

export type VendorGrade = 'A' | 'B' | 'C' | 'D';

export type MockVendorOrder = {
  no: string;
  date: string;
  amount: number;
  status: string;
};

export type MockVendorEval = {
  quarter: string;
  onTime: number;
  defect: number;
  price: number;
  service: number;
  score: number;
  grade: string;
  by: string;
  /** 顯示用，例 B→A ↑ */
  gradeNote?: string;
};

export type MockVendorNegotiation = {
  date: string;
  contact: string;
  condition: string;
  result: string;
};

export type MockVendor = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  type: VendorType;
  country: string;
  grade: VendorGrade;
  paymentDomestic: string;
  paymentImport?: string;
  incoterm?: string;
  taxId: string;
  address: string;
  contact: string;
  phone: string;
  mobile: string;
  email: string;
  minMoq: number | null;
  productLine: string;
  note: string;
  isActive: boolean;
  recentOrders: MockVendorOrder[];
  evaluations: MockVendorEval[];
  negotiations: MockVendorNegotiation[];
};

export const PAYMENT_DOMESTIC_OPTIONS = [
  { value: 'PREPAY', label: 'PREPAY — 先付款' },
  { value: 'NET30', label: 'NET30 — 月結 30 天' },
  { value: 'NET60', label: 'NET60 — 月結 60 天' },
  { value: 'NET90', label: 'NET90 — 月結 90 天' },
] as const;

export const PAYMENT_IMPORT_OPTIONS = [
  { value: 'TT', label: 'TT — 電匯 T/T' },
  { value: 'LC', label: 'LC — 信用狀 L/C' },
  { value: 'DP', label: 'DP — 付款交單 D/P' },
  { value: 'DA', label: 'DA — 承兌交單 D/A' },
] as const;

export const INCOTERM_OPTIONS = [
  { value: 'FOB', label: 'FOB' },
  { value: 'CIF', label: 'CIF' },
  { value: 'EXW', label: 'EXW' },
  { value: 'DDP', label: 'DDP' },
] as const;

export const MOCK_VENDORS: MockVendor[] = [
  {
    id: 'v1',
    code: 'S001',
    name: '德國汽配 GmbH',
    nameEn: 'German Auto Parts GmbH',
    type: 'S',
    country: 'DEU',
    grade: 'A',
    paymentDomestic: 'NET30',
    paymentImport: 'TT',
    incoterm: 'FOB',
    taxId: '',
    address: 'München, DE',
    contact: 'Hans Schmidt',
    phone: '+49-XXX-XXXXXXX',
    mobile: '',
    email: 'hans@german-auto.com',
    minMoq: null,
    productLine: 'VAG 電子零件',
    note: '送貨週期穩定，建議長期合作',
    isActive: true,
    recentOrders: [
      { no: 'PO-202604-0031', date: '2026-04-10', amount: 85000, status: '已入帳' },
      { no: 'PO-202603-0018', date: '2026-03-22', amount: 120000, status: '已入帳' },
      { no: 'PO-202603-0005', date: '2026-03-05', amount: 65000, status: '已入帳' },
      { no: 'PO-202602-0022', date: '2026-02-18', amount: 95000, status: '已入帳' },
    ],
    evaluations: [
      { quarter: '2026 Q1', onTime: 98, defect: 0.3, price: 5, service: 5, score: 94, grade: 'A', by: '王採購組長' },
      { quarter: '2025 Q4', onTime: 96, defect: 0.5, price: 4, service: 5, score: 89, grade: 'A', by: '王採購組長' },
      {
        quarter: '2025 Q3',
        onTime: 92,
        defect: 1.2,
        price: 4,
        service: 4,
        score: 80,
        grade: 'B',
        gradeNote: 'B→A ↑',
        by: '王採購組長',
      },
      { quarter: '2025 Q2', onTime: 88, defect: 1.8, price: 3, service: 4, score: 74, grade: 'B', by: '王採購組長' },
    ],
    negotiations: [
      { date: '2026-04-15', contact: 'Hans Schmidt（業代）', condition: '付款 NET30→PREPAY', result: '拒絕' },
      { date: '2026-01-08', contact: 'Hans Schmidt（業代）', condition: 'MOQ 降至 50 個', result: '接受' },
      { date: '2025-10-12', contact: 'Thomas Müller（主管）', condition: '年度合約折扣 3%', result: '接受' },
    ],
  },
  {
    id: 'v2',
    code: 'S002',
    name: '台北馬勒',
    nameEn: '',
    type: 'S',
    country: 'TWN',
    grade: 'B',
    paymentDomestic: 'NET30',
    taxId: '12345678',
    address: '台北市',
    contact: '陳先生',
    phone: '02-2345-6789',
    mobile: '',
    email: 'chen@example.com',
    minMoq: 100,
    productLine: '濾芯',
    note: '',
    isActive: true,
    recentOrders: [{ no: 'PO-202604-0001', date: '2026-04-02', amount: 42000, status: '已入帳' }],
    evaluations: [],
    negotiations: [],
  },
  {
    id: 'v3',
    code: 'S003',
    name: '新竹電容',
    nameEn: '',
    type: 'S',
    country: 'TWN',
    grade: 'B',
    paymentDomestic: 'NET60',
    taxId: '',
    address: '新竹市',
    contact: '林小姐',
    phone: '03-1111-2222',
    mobile: '',
    email: '',
    minMoq: null,
    productLine: '電子料',
    note: '',
    isActive: true,
    recentOrders: [],
    evaluations: [],
    negotiations: [],
  },
  {
    id: 'v4',
    code: 'S004',
    name: '高雄五金',
    nameEn: '',
    type: 'S',
    country: 'TWN',
    grade: 'C',
    paymentDomestic: 'NET60',
    taxId: '',
    address: '高雄市',
    contact: '黃老闆',
    phone: '07-3333-4444',
    mobile: '',
    email: '',
    minMoq: 200,
    productLine: '五金耗材',
    note: '',
    isActive: true,
    recentOrders: [],
    evaluations: [],
    negotiations: [],
  },
  {
    id: 'v5',
    code: 'S005',
    name: '舊廠商有限公司',
    nameEn: '',
    type: 'V',
    country: 'TWN',
    grade: 'D',
    paymentDomestic: 'NET90',
    taxId: '',
    address: '',
    contact: '',
    phone: '',
    mobile: '',
    email: '',
    minMoq: null,
    productLine: '',
    note: '已停止合作',
    isActive: false,
    recentOrders: [],
    evaluations: [],
    negotiations: [],
  },
];

export function cloneVendors(): MockVendor[] {
  return MOCK_VENDORS.map((v) => ({
    ...v,
    recentOrders: v.recentOrders.map((o) => ({ ...o })),
    evaluations: v.evaluations.map((e) => ({ ...e })),
    negotiations: v.negotiations.map((n) => ({ ...n })),
  }));
}

export function vendorTypeLabel(t: VendorType): string {
  if (t === 'S') return '零件供應商(S)';
  if (t === 'T') return '外包物流(T)';
  return '一般廠商(V)';
}

export function paymentDomesticLabel(v: string): string {
  return PAYMENT_DOMESTIC_OPTIONS.find((o) => o.value === v)?.label ?? v;
}
