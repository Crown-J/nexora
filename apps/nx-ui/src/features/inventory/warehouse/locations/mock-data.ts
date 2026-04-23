// apps/nx-ui/src/features/inventory/warehouse/locations/mock-data.ts
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 10:庫位管理 mock 資料。
 *
 * 每筆庫位:位置代碼、存放料號、當前庫存、上限、倉管建議安全/最高量、
 *          採購實際設定安全/最高量。consistency 狀態依是否一致決定。
 */

export type ConsistencyStatus = 'consistent' | 'safety_mismatch' | 'max_mismatch';

export interface WarehouseLocation {
  code: string;
  partSku: string;
  partName: string;
  currentStock: number;
  maxCapacity: number;
  /** 倉管依坪效建議 */
  safetyStockSuggested: number;
  maxStockSuggested: number;
  /** 採購實際設定(從 nx02_stock_setting 讀,demo 用 mock) */
  safetyStockProcurement: number;
  maxStockProcurement: number;
}

export const MOCK_WAREHOUSE_LOCATIONS: readonly WarehouseLocation[] = [
  {
    code: 'A-01-03',
    partSku: 'SKU-001',
    partName: '剎車片 VW Golf MK7',
    currentStock: 5,
    maxCapacity: 30,
    safetyStockSuggested: 8,
    maxStockSuggested: 30,
    safetyStockProcurement: 10,
    maxStockProcurement: 30,
  },
  {
    code: 'A-01-04',
    partSku: 'SKU-004',
    partName: '剎車片 Audi A4',
    currentStock: 0,
    maxCapacity: 20,
    safetyStockSuggested: 5,
    maxStockSuggested: 20,
    safetyStockProcurement: 5,
    maxStockProcurement: 20,
  },
  {
    code: 'B-02-01',
    partSku: 'SKU-021',
    partName: '機油濾心 Audi A4',
    currentStock: 12,
    maxCapacity: 50,
    safetyStockSuggested: 15,
    maxStockSuggested: 50,
    safetyStockProcurement: 10,
    maxStockProcurement: 50,
  },
  {
    code: 'B-02-02',
    partSku: 'SKU-020',
    partName: '機油濾心 VW Golf',
    currentStock: 12,
    maxCapacity: 40,
    safetyStockSuggested: 10,
    maxStockSuggested: 40,
    safetyStockProcurement: 10,
    maxStockProcurement: 40,
  },
  {
    code: 'C-01-05',
    partSku: 'SKU-031',
    partName: '空氣濾心 Skoda Superb',
    currentStock: 0,
    maxCapacity: 25,
    safetyStockSuggested: 8,
    maxStockSuggested: 25,
    safetyStockProcurement: 5,
    maxStockProcurement: 30,
  },
  {
    code: 'D-01-01',
    partSku: 'SKU-040',
    partName: '火星塞組 VW Golf',
    currentStock: 15,
    maxCapacity: 30,
    safetyStockSuggested: 12,
    maxStockSuggested: 30,
    safetyStockProcurement: 12,
    maxStockProcurement: 30,
  },
  {
    code: 'D-02-01',
    partSku: 'SKU-060',
    partName: 'LED 大燈組 Audi A4',
    currentStock: 2,
    maxCapacity: 6,
    safetyStockSuggested: 3,
    maxStockSuggested: 6,
    safetyStockProcurement: 3,
    maxStockProcurement: 6,
  },
  {
    code: 'E-01-01',
    partSku: 'SKU-070',
    partName: '輪胎 Porsche Cayenne 21"',
    currentStock: 0,
    maxCapacity: 8,
    safetyStockSuggested: 2,
    maxStockSuggested: 8,
    safetyStockProcurement: 4,
    maxStockProcurement: 8,
  },
];

export function diagnoseConsistency(loc: WarehouseLocation): ConsistencyStatus {
  if (
    loc.safetyStockSuggested === loc.safetyStockProcurement &&
    loc.maxStockSuggested === loc.maxStockProcurement
  ) {
    return 'consistent';
  }
  if (loc.safetyStockSuggested !== loc.safetyStockProcurement) {
    return 'safety_mismatch';
  }
  return 'max_mismatch';
}
