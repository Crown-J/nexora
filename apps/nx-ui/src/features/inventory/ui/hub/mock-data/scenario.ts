// apps/nx-ui/src/features/inventory/ui/hub/mock-data/scenario.ts
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 8~10:庫存中心手機版 hub 的 mock 資料。
 *
 * 仿 sale/hub/mock-data/scenario.ts 樣式,但角色換成倉管三級:
 *   warehouse_staff    倉管員(personal KPI)
 *   warehouse_leader   倉管組長(team KPI)
 *   warehouse_manager  倉管主管(company KPI)
 *
 * Phase 8 先定義 type + 基本結構;Phase 10 填入完整 KPI 資料與 InventoryProKPICard。
 */

export type InventoryUserRole = 'warehouse_staff' | 'warehouse_leader' | 'warehouse_manager';

/** 春酒 demo 預設倉管員視角,若要改看組長/主管版本改這裡即可 */
export const MOCK_INVENTORY_USER_ROLE: InventoryUserRole = 'warehouse_staff';

export type InventoryKPILevel = 'personal' | 'team' | 'company';

/**
 * 倉管 KPI 資料結構(Phase 10 正式填入)。
 * 每個 level 的三格 KPI 不同,分別對應倉管員 / 組長 / 主管的關注指標。
 */
export interface InventoryKPIBlock {
  label: string;
  /** 顯示值,已格式化(例:'18 分' / '99.2%') */
  value: string;
  /** 副標,通常是目標(例:'目標 15 分' / '目標 >= 99%') */
  sub: string;
  /** 底部狀態文字(例:'⚠ 略慢' / '✓ 達標') */
  subText: string;
  /** 進度條 0~100,沒有則 null */
  progress: number | null;
  /** 狀態色 */
  status: 'good' | 'warning' | 'danger';
}

export interface InventoryKPIData {
  blocks: [InventoryKPIBlock, InventoryKPIBlock, InventoryKPIBlock];
}

/**
 * Phase 10 會填入 3 個 level 的完整 KPI 資料。
 * Phase 8 暫時放一組預設值,避免 ProKPICard 直接 null reference。
 */
export const MOCK_INVENTORY_KPI: Record<InventoryKPILevel, InventoryKPIData> = {
  personal: {
    blocks: [
      {
        label: '撿貨速度',
        value: '18 分',
        sub: '目標 15 分',
        subText: '⚠ 略慢',
        progress: null,
        status: 'warning',
      },
      {
        label: '包貨速度',
        value: '8 分',
        sub: '目標 10 分',
        subText: '✓ 達標',
        progress: null,
        status: 'good',
      },
      {
        label: '誤差率',
        value: '0.8%',
        sub: '目標 < 1%',
        subText: '✓ 良好',
        progress: null,
        status: 'good',
      },
    ],
  },
  team: {
    blocks: [
      {
        label: '團隊效率',
        value: '105',
        sub: '目標 100',
        subText: '✓ 達標',
        progress: 105,
        status: 'good',
      },
      {
        label: '調度完成率',
        value: '98%',
        sub: '目標 95%',
        subText: '✓ 達標',
        progress: 98,
        status: 'good',
      },
      {
        label: '調撥準確率',
        value: '99.5%',
        sub: '目標 99%',
        subText: '✓ 達標',
        progress: 99.5,
        status: 'good',
      },
    ],
  },
  company: {
    blocks: [
      {
        label: '整體準時率',
        value: '96.5%',
        sub: '目標 95%',
        subText: '✓ 達標',
        progress: 96.5,
        status: 'good',
      },
      {
        label: '庫存週轉率',
        value: '6.5',
        sub: '目標 6',
        subText: '✓ 達標',
        progress: null,
        status: 'good',
      },
      {
        label: '盤點差異率',
        value: '99.8%',
        sub: '目標 99%',
        subText: '✓ 達標',
        progress: 99.8,
        status: 'good',
      },
    ],
  },
};

export function getInventoryKPILevelByRole(role: InventoryUserRole): InventoryKPILevel {
  if (role === 'warehouse_leader') return 'team';
  if (role === 'warehouse_manager') return 'company';
  return 'personal';
}

const LEVEL_TITLES: Record<InventoryKPILevel, string> = {
  personal: '個人 KPI',
  team: '團隊 KPI',
  company: '公司 KPI',
};

export function getInventoryKPILevelTitle(level: InventoryKPILevel): string {
  return LEVEL_TITLES[level];
}
