/**
 * 倉庫／庫位 mock（主檔頁以倉庫為左欄，右下掛庫位）
 */

export type BaseWarehouseRow = {
  id: string;
  code: string;
  name: string;
  address: string;
  isActive: boolean;
};

export type BaseStorageBinRow = {
  id: string;
  warehouseId: string;
  code: string;
  zone: string;
  note: string;
  isActive: boolean;
};

export const MOCK_BASE_WAREHOUSES: BaseWarehouseRow[] = [
  { id: 'w1', code: 'WH-NTP', name: '南港倉', address: '台北市南港區…', isActive: true },
  { id: 'w2', code: 'WH-TYC', name: '桃園倉', address: '桃園市…', isActive: true },
  { id: 'w3', code: 'WH-KHH', name: '高雄倉', address: '高雄市…', isActive: false },
];

/** 可快速挑選加入的庫位範本（未掛載倉庫前亦可當建議代碼） */
export const MOCK_BIN_SUGGESTIONS: { code: string; zone: string }[] = [
  { code: 'A-01-01', zone: 'A 區' },
  { code: 'A-01-02', zone: 'A 區' },
  { code: 'B-02-01', zone: 'B 區' },
  { code: 'RCV-01', zone: '收貨' },
];

export const MOCK_BINS_BY_WAREHOUSE: Record<string, BaseStorageBinRow[]> = {
  w1: [
    { id: 'bin1', warehouseId: 'w1', code: 'A-01-01', zone: 'A 區', note: '良品', isActive: true },
    { id: 'bin2', warehouseId: 'w1', code: 'A-01-02', zone: 'A 區', note: '', isActive: true },
  ],
  w2: [{ id: 'bin3', warehouseId: 'w2', code: 'RCV-01', zone: '收貨', note: '暫存', isActive: true }],
  w3: [],
};
