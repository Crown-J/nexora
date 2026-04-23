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

export const MOCK_INQUIRY_TODOS: TodoItem[] = [
  {
    id: 'inq-1',
    docNumber: 'RF-2604-00087',
    customerCode: 'A0087',
    customerName: '新竹汽材行',
    amount: 8500,
    status: '等待同行回覆',
    waitDays: 2,
  },
  {
    id: 'inq-2',
    docNumber: 'RF-2604-00091',
    customerCode: 'B0156',
    customerName: '台中順達汽車',
    amount: 12300,
    status: '等待同行回覆',
    waitDays: 5,
  },
  {
    id: 'inq-3',
    docNumber: 'RF-2604-00094',
    customerCode: 'C0421',
    customerName: '高雄修車場',
    amount: 4200,
    status: '等待同行回覆',
    waitDays: 9,
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
