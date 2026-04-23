// apps/nx-ui/src/features/sale/ui/hub/mock-data/scenario.ts
/**
 * R7 銷售中心手機版 Hub 的春酒 demo mock 資料。
 * - MOCK_USER_ROLE：決定 PRO KPI 區顯示 personal / team / company 哪一版
 * - MOCK_KPI_DATA：3 種級別的業績 / 毛利率 / 退貨率
 * - MOCK_*_TODOS：狀態追蹤清單的 3 個群組（詢價待回覆 / 銷售待出貨 / 保固待結果）
 *
 * 跟 sop-workspace/mock-data/scenario.ts 是不同檔案，避免互相影響。
 */

export type UserRole = 'sales' | 'team_leader' | 'sales_manager';

/**
 * 春酒 demo 主秀業務個人 KPI，最有共鳴。
 * 之後想改 sales_manager 看公司全局也是換這裡一個值。
 */
export const MOCK_USER_ROLE: UserRole = 'sales';

export type KPILevel = 'personal' | 'team' | 'company';

export interface KPIData {
  salesActual: number;
  salesTarget: number;
  salesProgress: number;
  marginRate: number;
  returnRate: number;
}

export const MOCK_KPI_DATA: Record<KPILevel, KPIData> = {
  personal: {
    salesActual: 485230,
    salesTarget: 600000,
    salesProgress: 80.9,
    marginRate: 28.3,
    returnRate: 1.2,
  },
  team: {
    salesActual: 3520000,
    salesTarget: 4500000,
    salesProgress: 78.2,
    marginRate: 27.5,
    returnRate: 1.8,
  },
  company: {
    salesActual: 18560000,
    salesTarget: 22000000,
    salesProgress: 84.4,
    marginRate: 28.1,
    returnRate: 1.5,
  },
};

/** 依角色推導要看哪版 KPI */
export function getKPILevelByRole(role: UserRole): KPILevel {
  if (role === 'team_leader') return 'team';
  if (role === 'sales_manager') return 'company';
  return 'personal';
}

export interface TodoItem {
  id: string;
  /** 單號 */
  docNumber: string;
  /** 客戶代碼 */
  customerCode: string;
  /** 客戶名稱 */
  customerName: string;
  /** 金額（保固單填 0，會改顯示 partName） */
  amount: number;
  /** 狀態文字 */
  status: string;
  /** 等待天數 */
  waitDays: number;
  /** 保固單專用：零件名稱（取代金額顯示） */
  partName?: string;
}

// R7 Phase 7-3:MOCK_INQUIRY_TODOS 已移除；詢價待辦改由 inquiry/store 的 RFQ 動態衍生
// （參見 StatusSection.tsx 的 rfqToTodoItem）
// TASK-BUSINESS-RESTRUCTURE Phase 4:詢價待辦完全從狀態追蹤移除（改由 S03 查料時主動提醒）

/**
 * TASK-BUSINESS-RESTRUCTURE Phase 4:調貨進行中 mock。
 * 真實資料將於 Phase 6 建 IT store 後取代。目前維持春酒 demo 可視覺展示。
 */
export const MOCK_TRANSFER_TODOS: TodoItem[] = [
  {
    id: 'it-1',
    docNumber: 'IT-2604-00012',
    customerCode: 'SO-2604-00054',
    customerName: '新竹倉 → 本倉',
    amount: 0,
    status: '調撥中',
    waitDays: 0,
    partName: 'SKU-021 × 2',
  },
  {
    id: 'it-2',
    docNumber: 'TI-2604-00005',
    customerCode: 'SO-2604-00049',
    customerName: '同行:桃園汽材',
    amount: 0,
    status: '等待取貨',
    waitDays: 1,
    partName: 'SKU-031 × 3',
  },
];

export const MOCK_SALES_TODOS: TodoItem[] = [
  {
    id: 'so-1',
    docNumber: 'SO-2604-00054',
    customerCode: 'B0213',
    customerName: '台北保養廠',
    amount: 15200,
    status: '待撿貨',
    waitDays: 1,
  },
  {
    id: 'so-2',
    docNumber: 'SO-2604-00056',
    customerCode: 'A0087',
    customerName: '新竹汽材行',
    amount: 23800,
    status: '待出貨',
    waitDays: 1,
  },
  {
    id: 'so-3',
    docNumber: 'SO-2604-00049',
    customerCode: 'D0542',
    customerName: '桃園合興汽車',
    amount: 6700,
    status: '待調撥完成',
    waitDays: 3,
  },
  {
    id: 'so-4',
    docNumber: 'SO-2604-00038',
    customerCode: 'B0156',
    customerName: '台中順達汽車',
    amount: 18900,
    status: '客戶待簽收',
    waitDays: 1,
  },
];

export const MOCK_WARRANTY_TODOS: TodoItem[] = [
  {
    id: 'wr-1',
    docNumber: 'WR-2604-00012',
    customerCode: 'B0156',
    customerName: '台中順達汽車',
    amount: 0,
    status: '等待廠商回覆',
    waitDays: 5,
    partName: '前車燈總成',
  },
];
