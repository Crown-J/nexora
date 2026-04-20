/**
 * TASK-0421 DEMO 單據 Mock（各 3～5 筆、多狀態）
 */

export const REF_TODAY = '2026-04-21';

export type RfqListRow = {
  id: string;
  doc_no: string;
  rfq_date: string;
  vendor_name: string;
  item_count: number;
  currency: string;
  valid_until: string;
  status: string;
  created_by: string;
  created_at: string;
};

export const MOCK_RFQ_LIST: RfqListRow[] = [
  {
    id: '1',
    doc_no: 'RF-202604-Z01-00003',
    rfq_date: REF_TODAY,
    vendor_name: '德國汽配 GmbH',
    item_count: 3,
    currency: 'TWD',
    valid_until: '2026-04-26',
    status: 'D',
    created_by: '王採購',
    created_at: `${REF_TODAY} 14:32`,
  },
  {
    id: '2',
    doc_no: 'RF-202604-Z01-00002',
    rfq_date: '2026-04-18',
    vendor_name: '台北馬勒',
    item_count: 2,
    currency: 'TWD',
    valid_until: '2026-04-23',
    status: 'R',
    created_by: '王採購',
    created_at: '2026-04-18 10:15',
  },
  {
    id: '3',
    doc_no: 'RF-202604-Z01-00001',
    rfq_date: '2026-04-15',
    vendor_name: '新竹電容',
    item_count: 1,
    currency: 'TWD',
    valid_until: '2026-04-18',
    status: 'S',
    created_by: '陳採購',
    created_at: '2026-04-15 09:00',
  },
  {
    id: '4',
    doc_no: 'RF-202604-Z01-00000',
    rfq_date: '2026-04-10',
    vendor_name: '高雄汽配',
    item_count: 4,
    currency: 'TWD',
    valid_until: '2026-04-12',
    status: 'C',
    created_by: '王採購',
    created_at: '2026-04-10 16:00',
  },
  {
    id: '5',
    doc_no: 'RF-202603-Z01-00099',
    rfq_date: '2026-03-28',
    vendor_name: '台北馬勒',
    item_count: 2,
    currency: 'USD',
    valid_until: '2026-03-30',
    status: 'V',
    created_by: '王採購',
    created_at: '2026-03-28 11:00',
  },
];

export type PoListRow = {
  id: string;
  doc_no: string;
  po_date: string;
  vendor_name: string;
  rfq_doc_no: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  expected_date: string;
  status: string;
  created_by: string;
  created_at: string;
};

export const MOCK_PO_LIST: PoListRow[] = [
  {
    id: '1',
    doc_no: 'PO-202604-Z01-00002',
    po_date: REF_TODAY,
    vendor_name: '德國汽配 GmbH',
    rfq_doc_no: 'RF-202604-Z01-00002',
    currency: 'TWD',
    subtotal: 120000,
    tax_amount: 6000,
    total_amount: 126000,
    expected_date: '2026-04-28',
    status: 'D',
    created_by: '王採購',
    created_at: `${REF_TODAY} 09:10`,
  },
  {
    id: '2',
    doc_no: 'PO-202604-Z01-00001',
    po_date: '2026-04-19',
    vendor_name: '台北馬勒',
    rfq_doc_no: '',
    currency: 'TWD',
    subtotal: 45000,
    tax_amount: 2250,
    total_amount: 47250,
    expected_date: '2026-04-25',
    status: 'S',
    created_by: '王採購',
    created_at: '2026-04-19 16:22',
  },
  {
    id: '3',
    doc_no: 'PO-202603-Z01-00088',
    po_date: '2026-03-30',
    vendor_name: '新竹電容',
    rfq_doc_no: 'RF-202603-Z01-00099',
    currency: 'TWD',
    subtotal: 8800,
    tax_amount: 440,
    total_amount: 9240,
    expected_date: '2026-04-05',
    status: 'C',
    created_by: '陳採購',
    created_at: '2026-03-30 10:00',
  },
  {
    id: '4',
    doc_no: 'PO-202603-Z01-00070',
    po_date: '2026-03-12',
    vendor_name: '高雄汽配',
    rfq_doc_no: '',
    currency: 'TWD',
    subtotal: 3200,
    tax_amount: 160,
    total_amount: 3360,
    expected_date: '2026-03-18',
    status: 'V',
    created_by: '王採購',
    created_at: '2026-03-12 13:40',
  },
];

export type RrListRow = {
  id: string;
  doc_no: string;
  rr_date: string;
  vendor_name: string;
  po_doc_no: string;
  warehouse: string;
  total_amount: number;
  status: string;
  created_by: string;
  created_at: string;
};

export const MOCK_RR_LIST: RrListRow[] = [
  {
    id: '1',
    doc_no: 'RR-202604-Z01-00005',
    rr_date: REF_TODAY,
    vendor_name: '德國汽配 GmbH',
    po_doc_no: 'PO-202604-Z01-00001',
    warehouse: 'MW1',
    total_amount: 47250,
    status: 'D',
    created_by: '倉管甲',
    created_at: `${REF_TODAY} 08:05`,
  },
  {
    id: '2',
    doc_no: 'RR-202604-Z01-00004',
    rr_date: '2026-04-19',
    vendor_name: '台北馬勒',
    po_doc_no: 'PO-202604-Z01-00001',
    warehouse: 'MW1',
    total_amount: 12600,
    status: 'P',
    created_by: '倉管甲',
    created_at: '2026-04-19 17:30',
  },
  {
    id: '3',
    doc_no: 'RR-202603-Z01-00012',
    rr_date: '2026-03-22',
    vendor_name: '新竹電容',
    po_doc_no: 'PO-202603-Z01-00088',
    warehouse: 'HW1',
    total_amount: 9240,
    status: 'C',
    created_by: '倉管乙',
    created_at: '2026-03-22 11:11',
  },
];

export type QtListRow = {
  id: string;
  doc_no: string;
  quote_date: string;
  customer_name: string;
  grade: string;
  valid_until: string;
  total_amount: number;
  status: string;
  created_by: string;
  created_at: string;
};

export const MOCK_QT_LIST: QtListRow[] = [
  {
    id: '1',
    doc_no: 'QT-202604-Z01-00004',
    quote_date: REF_TODAY,
    customer_name: '台北保修 A',
    grade: 'A',
    valid_until: '2026-04-28',
    total_amount: 18600,
    status: 'D',
    created_by: '林業務',
    created_at: `${REF_TODAY} 10:20`,
  },
  {
    id: '2',
    doc_no: 'QT-202604-Z01-00003',
    quote_date: '2026-04-18',
    customer_name: '高雄電子 B',
    grade: 'B',
    valid_until: '2026-04-20',
    total_amount: 9200,
    status: 'S',
    created_by: '林業務',
    created_at: '2026-04-18 15:00',
  },
  {
    id: '3',
    doc_no: 'QT-202603-Z01-00090',
    quote_date: '2026-03-25',
    customer_name: '新竹保修 C',
    grade: 'C',
    valid_until: '2026-03-28',
    total_amount: 5400,
    status: 'C',
    created_by: '陳業務',
    created_at: '2026-03-25 09:30',
  },
  {
    id: '4',
    doc_no: 'QT-202603-Z01-00070',
    quote_date: '2026-03-10',
    customer_name: '台中車業 D',
    grade: 'D',
    valid_until: '2026-03-12',
    total_amount: 1200,
    status: 'X',
    created_by: '林業務',
    created_at: '2026-03-10 14:00',
  },
];

export type SoListRow = {
  id: string;
  doc_no: string;
  so_date: string;
  customer_name: string;
  delivery_type: string;
  warehouse: string;
  quote_doc_no: string;
  total_amount: number;
  status: string;
  created_by: string;
  created_at: string;
};

export const MOCK_SO_LIST: SoListRow[] = [
  {
    id: '1',
    doc_no: 'SO-202604-Z01-00006',
    so_date: REF_TODAY,
    customer_name: '台北保修 A',
    delivery_type: 'D',
    warehouse: 'MW1',
    quote_doc_no: 'QT-202604-Z01-00003',
    total_amount: 9200,
    status: 'D',
    created_by: '林業務',
    created_at: `${REF_TODAY} 11:00`,
  },
  {
    id: '2',
    doc_no: 'SO-202604-Z01-00005',
    so_date: '2026-04-19',
    customer_name: '高雄電子 B',
    delivery_type: 'P',
    warehouse: 'MW1',
    quote_doc_no: '',
    total_amount: 3300,
    status: 'S',
    created_by: '林業務',
    created_at: '2026-04-19 09:45',
  },
  {
    id: '3',
    doc_no: 'SO-202603-Z01-00040',
    so_date: '2026-03-29',
    customer_name: '新竹保修 C',
    delivery_type: 'C',
    warehouse: 'MW1',
    quote_doc_no: 'QT-202603-Z01-00090',
    total_amount: 5400,
    status: 'C',
    created_by: '陳業務',
    created_at: '2026-03-29 16:10',
  },
];

export function fmtMoney(n: number): string {
  return `NT$ ${n.toLocaleString('zh-TW')}`;
}

export function deliveryTypeLabel(t: string): string {
  if (t === 'D') return '配送';
  if (t === 'P') return '自取';
  if (t === 'C') return '寄貨';
  return t;
}

export type MockCustomer = {
  id: string;
  name: string;
  grade: string;
  payment_term: string;
};

export const MOCK_CUSTOMERS: MockCustomer[] = [
  { id: 'c1', name: '台北保修 A', grade: 'A', payment_term: '月結 30 天' },
  { id: 'c2', name: '高雄電子 B', grade: 'B', payment_term: '現金' },
  { id: 'c3', name: '新竹保修 C', grade: 'C', payment_term: '月結 45 天' },
  { id: 'c4', name: '台中車業 D', grade: 'D', payment_term: '預付全額' },
];

/** 庫位（RR／SO DEMO） */
export const MOCK_LOCATIONS = [
  { id: 'L1', label: 'A-01-01' },
  { id: 'L2', label: 'B-02-03' },
  { id: 'L3', label: 'C-暫存' },
] as const;
