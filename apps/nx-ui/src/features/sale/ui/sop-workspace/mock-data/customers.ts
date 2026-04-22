// apps/nx-ui/src/features/sale/ui/sop-workspace/mock-data/customers.ts
/**
 * 5 家客戶 Mock — 混合 A~D 級、保養廠/同行/偏遠，覆蓋 demo 各情境。
 * 主 demo 線：選「台北保養廠（B 級）」，對應 STEP 2~9 所有後續範例。
 */

import type { Customer } from '../types';

export const MOCK_CUSTOMERS: readonly Customer[] = [
  {
    id: 'CUST-001',
    name: '台北保養廠',
    contact: '陳老闆',
    phone: '02-2345-6789',
    address: '台北市大安區',
    tier: 'B',
    monthlyGrossMargin: 28,
    mainVehicle: 'VAG',
    preferredBrand: 'VAG 原廠',
    lastVisit: '3 天前',
    customerType: '保養廠',
  },
  {
    id: 'CUST-002',
    name: '新竹汽材行',
    contact: '林老闆',
    phone: '03-567-8910',
    address: '新竹市東區',
    tier: 'A',
    monthlyGrossMargin: 35,
    mainVehicle: '多品牌',
    preferredBrand: '原廠為主',
    lastVisit: '昨天',
    customerType: '同行',
  },
  {
    id: 'CUST-003',
    name: '高雄修車場',
    contact: '黃老闆',
    phone: '07-888-1234',
    address: '高雄市三民區',
    tier: 'C',
    monthlyGrossMargin: 22,
    mainVehicle: 'Toyota',
    preferredBrand: '副廠可接受',
    lastVisit: '1 週前',
    customerType: '保養廠',
    isRemote: true,
  },
  {
    id: 'CUST-004',
    name: '台中順達汽車',
    contact: '王老闆',
    phone: '04-2456-7788',
    address: '台中市西屯區',
    tier: 'B',
    monthlyGrossMargin: 26,
    mainVehicle: 'VAG',
    preferredBrand: '原廠優先',
    lastVisit: '5 天前',
    customerType: '保養廠',
  },
  {
    id: 'CUST-005',
    name: '桃園合興汽車',
    contact: '吳老闆',
    phone: '03-333-4567',
    address: '桃園市中壢區',
    tier: 'D',
    monthlyGrossMargin: 18,
    mainVehicle: '多品牌',
    preferredBrand: '副廠為主',
    lastVisit: '2 週前',
    customerType: '保養廠',
  },
];

/** 主要 demo 的目標客戶 ID（STEP 1 預選建議） */
export const PRIMARY_DEMO_CUSTOMER_ID = 'CUST-001';
