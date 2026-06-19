// apps/nx-ui/src/features/nx01/location/structure/mock-data.ts
// 據點架構圖 mock 資料（Step 4 Commit B、純前端 UI 跑通用）
// 後續軌（API 串接）會用 SiteDto / WarehouseDto / LocationDto / UserDto 替換
//
// 規模：3 據點 / 6 倉庫 / 12 庫位 / 16 員工
// 業務語意：
//   - 員工可多歸據點（siteIds[]、執行長拍板）

export type SiteMock = { id: string; name: string; isMain: boolean };
export type WarehouseMock = { id: string; name: string; siteId: string };
export type BinMock = { id: string; code: string; warehouseId: string };
export type SiteEmployeeMock = {
  id: string;
  name: string;
  dept: string;
  siteIds: string[];
};

export const SITES: SiteMock[] = [
  { id: 'S001', name: '台中總部', isMain: true },
  { id: 'S002', name: '台北營業所', isMain: false },
  { id: 'S003', name: '高雄營業所', isMain: false },
];

export const WAREHOUSES: WarehouseMock[] = [
  { id: 'W001', name: '中央倉', siteId: 'S001' },
  { id: 'W002', name: '待出倉', siteId: 'S001' },
  { id: 'W003', name: '台北倉', siteId: 'S002' },
  { id: 'W004', name: '台北待出倉', siteId: 'S002' },
  { id: 'W005', name: '高雄倉', siteId: 'S003' },
  { id: 'W006', name: '高雄待出倉', siteId: 'S003' },
];

export const BINS: BinMock[] = [
  { id: 'B001', code: 'A-01-01', warehouseId: 'W001' },
  { id: 'B002', code: 'A-01-02', warehouseId: 'W001' },
  { id: 'B003', code: 'B-01-01', warehouseId: 'W002' },
  { id: 'B004', code: 'B-01-02', warehouseId: 'W002' },
  { id: 'B005', code: 'TP-A-01', warehouseId: 'W003' },
  { id: 'B006', code: 'TP-A-02', warehouseId: 'W003' },
  { id: 'B007', code: 'TP-B-01', warehouseId: 'W004' },
  { id: 'B008', code: 'TP-B-02', warehouseId: 'W004' },
  { id: 'B009', code: 'KH-A-01', warehouseId: 'W005' },
  { id: 'B010', code: 'KH-A-02', warehouseId: 'W005' },
  { id: 'B011', code: 'KH-B-01', warehouseId: 'W006' },
  { id: 'B012', code: 'KH-B-02', warehouseId: 'W006' },
];

export const EMPLOYEES_SEED: SiteEmployeeMock[] = [
  { id: 'Y0001', name: '陳柏宏', dept: '銷售部', siteIds: ['S001'] },
  { id: 'Y0002', name: '林佳螢', dept: '銷售部', siteIds: ['S002'] },
  { id: 'Y0003', name: '王志明', dept: '銷售部', siteIds: ['S002'] },
  { id: 'Y0004', name: '周雅婷', dept: '銷售部', siteIds: ['S001', 'S002'] },
  { id: 'Y0005', name: '吳建宏', dept: '銷售部', siteIds: ['S003'] },
  { id: 'Y0006', name: '鄭家豪', dept: '銷售部', siteIds: ['S003'] },
  { id: 'Y0007', name: '謝宜蓁', dept: '銷售部', siteIds: ['S001'] },
  { id: 'Y0008', name: '黃淑芬', dept: '採購部', siteIds: ['S001'] },
  { id: 'Y0009', name: '劉冠廷', dept: '採購部', siteIds: ['S001'] },
  { id: 'Y0010', name: '洪偉誠', dept: '採購部', siteIds: ['S001'] },
  { id: 'Y0011', name: '曾子涵', dept: '採購部', siteIds: ['S002'] },
  { id: 'Y0012', name: '李美玲', dept: '財務部', siteIds: ['S001'] },
  { id: 'Y0013', name: '許雅文', dept: '財務部', siteIds: ['S001', 'S003'] },
  { id: 'Y0014', name: '楊承恩', dept: '財務部', siteIds: ['S001'] },
  { id: 'Y0015', name: '蔡文傑', dept: '倉儲部', siteIds: [] },
  { id: 'Y0016', name: '張俊傑', dept: '倉儲部', siteIds: [] },
];

export function siteName(id: string): string {
  return SITES.find((s) => s.id === id)?.name ?? id;
}
