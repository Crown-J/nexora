// apps/nx-ui/src/features/sale/ui/sop-workspace/mock-data/customers.ts
/**
 * 5 家客戶 Mock — 混合 A~D 級、保養廠/同行/偏遠，覆蓋 demo 各情境。
 * 主 demo 線：選「台北保養廠 B0213（B 級）」對應後續所有範例。
 *
 * 客戶代碼 (`code`) 規則：字母 = 首次登錄時等級，升降級不變。
 */

import type { Customer } from '../types';

export const MOCK_CUSTOMERS: readonly Customer[] = [
  {
    id: 'CUST-001',
    code: 'B0213',
    name: '台北保養廠',
    contact: '陳老闆',
    phone: '02-2345-6789',
    address: '台北市大安區復興南路',
    tier: 'B',
    customerType: '保養廠',
    salesStats: {
      today: 0,
      month: 45280,
      yearly: 520150,
      returnRate: 1.8,
    },
    remarks: [
      {
        author: '業務 王小明',
        timeAgo: '2 天前',
        content: '客戶很急躁，要求快速回應報價',
      },
      {
        author: '業務組長',
        timeAgo: '1 週前',
        content: '此客戶有升 A 級潛力，特別關照',
      },
    ],
  },
  {
    id: 'CUST-002',
    code: 'A0087',
    name: '新竹汽材行',
    contact: '林老闆',
    phone: '03-5123-4567',
    address: '新竹市東區中華路',
    tier: 'A',
    customerType: '同行',
    salesStats: {
      today: 12400,
      month: 128600,
      yearly: 1450800,
      returnRate: 0.8,
    },
    remarks: [
      {
        author: '業務 王小明',
        timeAgo: '3 天前',
        content: '同行，通常會自取；長期合作、談判空間不大',
      },
    ],
  },
  {
    id: 'CUST-003',
    code: 'C0421',
    name: '高雄修車場',
    contact: '黃老闆',
    phone: '07-2345-6789',
    address: '高雄市前鎮區',
    tier: 'C',
    customerType: '保養廠',
    isRemote: true,
    salesStats: {
      today: 0,
      month: 18500,
      yearly: 230400,
      returnRate: 3.2,
    },
    remarks: [
      {
        author: '業務 陳大華',
        timeAgo: '1 週前',
        content: '位於南部，通常走物流補庫存；不急',
      },
    ],
  },
  {
    id: 'CUST-004',
    code: 'B0156',
    name: '台中順達汽車',
    contact: '王老闆',
    phone: '04-2234-5678',
    address: '台中市北屯區',
    tier: 'B',
    customerType: '保養廠',
    salesStats: {
      today: 5200,
      month: 52800,
      yearly: 485200,
      returnRate: 2.1,
    },
    remarks: [
      {
        author: '業務 王小明',
        timeAgo: '4 天前',
        content: '車型以 VAG 為主，對原廠件要求較高',
      },
    ],
  },
  {
    id: 'CUST-005',
    code: 'D0542',
    name: '桃園合興汽車',
    contact: '吳老闆',
    phone: '03-3345-6789',
    address: '桃園市中壢區',
    tier: 'D',
    customerType: '保養廠',
    salesStats: {
      today: 0,
      month: 12600,
      yearly: 98500,
      returnRate: 4.5,
    },
    remarks: [
      {
        author: '業務組長',
        timeAgo: '2 週前',
        content: '價格敏感，建議主推副廠料以保毛利',
      },
    ],
  },
];

export const PRIMARY_DEMO_CUSTOMER_ID = 'CUST-001';
