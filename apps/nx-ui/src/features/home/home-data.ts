// apps/nx-ui/src/features/home/home-data.ts
// NX00 首頁儀表板 mock 資料（對齊 Hana 成品 dashboard-data.js）
// 後端整合後改接 /home/events /home/attendance /home/tasks 等 endpoint、本檔退役

export type EventType = 'meeting' | 'activity' | 'leave' | 'holiday';
export type AttendStatus = 'work' | 'remote' | 'trip' | 'leave' | 'sick';
export type DocType = 'quote' | 'sales' | 'ship' | 'collect' | 'purchase';

export type CalendarEvent = {
  time: string;
  title: string;
  type: EventType;
  meta?: string;
};

export type Attendee = {
  name: string;
  role: string;
  status: AttendStatus;
};

export type Task = {
  id: string;
  code: string;
  type: DocType;
  status: string;
  partner: string;
  amount: string;
  due: string; // YYYY-M-D
  done: boolean;
};

export type Bulletin = {
  type: string;
  title: string;
  date: string;
  color: string;
  unread: boolean;
};

export type Notification = {
  text: string;
  code: string;
  when: string;
  urgent: boolean;
};

export const EVENT_TYPES: Record<EventType, { label: string; color: string }> = {
  meeting: { label: '會議', color: '#378add' },
  activity: { label: '活動', color: '#1d9e75' },
  leave: { label: '請假', color: '#e8a020' },
  holiday: { label: '假日', color: '#e24b4a' },
};

export const ATTEND_STATUS: Record<AttendStatus, { label: string; color: string }> = {
  work: { label: '上班', color: '#1d9e75' },
  remote: { label: '外出', color: '#378add' },
  trip: { label: '出差', color: '#9a6cff' },
  leave: { label: '休假', color: '#e8a020' },
  sick: { label: '病假', color: '#e24b4a' },
};

export const DOC_TYPES: Record<DocType, { label: string; color: string }> = {
  quote: { label: '報價', color: '#378add' },
  sales: { label: '銷貨', color: '#1d9e75' },
  ship: { label: '出貨', color: '#9a6cff' },
  collect: { label: '收款', color: '#e8a020' },
  purchase: { label: '採購', color: '#e24b4a' },
};

// today 的 YYYY-M-D（mock data 用、避免日期偏移）
const T = new Date();
const TY = T.getFullYear();
const TM = T.getMonth() + 1;
const TD = T.getDate();
const dkey = (y: number, m: number, d: number) => `${y}-${m}-${d}`;
const today = dkey(TY, TM, TD);
const offset = (n: number) => {
  const dt = new Date(TY, TM - 1, TD + n);
  return dkey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

export const TODAY = { y: TY, m: TM, d: TD, key: today };

export const CALENDAR_EVENTS: Record<string, CalendarEvent[]> = {
  [offset(-2)]: [
    { time: '09:30', title: '與保時捷 OEM 廠商視訊', type: 'meeting', meta: 'Zoom 線上會議' },
    { time: '14:00', title: '銷貨團隊週會', type: 'meeting', meta: '3F 會議室' },
  ],
  [offset(-1)]: [
    { time: '10:00', title: '盤點作業 — 北倉', type: 'activity', meta: '北部物流中心' },
  ],
  [today]: [
    { time: '09:00', title: '晨會', type: 'meeting', meta: '主廳' },
    { time: '11:00', title: 'BMW 經銷商來訪', type: 'meeting', meta: '接待室 A' },
    { time: '14:30', title: '保固教育訓練', type: 'activity', meta: '會議室 B' },
    { time: '17:00', title: '客戶結帳對帳', type: 'activity', meta: '財務部' },
  ],
  [offset(1)]: [
    { time: '10:00', title: '採購會議', type: 'meeting', meta: '2F 小會議室' },
    { time: '15:00', title: '員工生日下午茶', type: 'activity' },
  ],
  [offset(3)]: [{ time: '00:00', title: '王小明請假', type: 'leave' }],
  [offset(5)]: [{ time: '00:00', title: '端午連假 (店休)', type: 'holiday' }],
};

export const ATTENDANCE: Attendee[] = [
  { name: '陳柏宏', role: '銷貨主管', status: 'work' },
  { name: '王小明', role: '前台業務', status: 'work' },
  { name: '陳美玲', role: '採購', status: 'work' },
  { name: '林大偉', role: '倉管', status: 'remote' },
  { name: '黃志豪', role: '送貨員', status: 'trip' },
  { name: '李淑芬', role: '會計', status: 'work' },
  { name: '周建華', role: '保養師', status: 'leave' },
  { name: '劉雅婷', role: '前台業務', status: 'sick' },
  { name: '張家豪', role: '銷貨', status: 'work' },
];

export const TASKS: Task[] = [
  {
    id: 't1',
    code: 'QT-2026-0042',
    type: 'quote',
    status: '草稿',
    partner: '亞捷汽車',
    amount: 'NT$ 86,500',
    due: today,
    done: false,
  },
  {
    id: 't2',
    code: 'SO-2026-0118',
    type: 'sales',
    status: '待出貨',
    partner: '正昌汽材',
    amount: 'NT$ 372,000',
    due: offset(-1),
    done: false,
  },
  {
    id: 't3',
    code: 'DO-2026-0203',
    type: 'ship',
    status: '備貨中',
    partner: '台中經銷',
    amount: 'NT$ 128,400',
    due: offset(1),
    done: false,
  },
  {
    id: 't4',
    code: 'RC-2026-0094',
    type: 'collect',
    status: '待收款',
    partner: '正昌汽材',
    amount: 'NT$ 195,800',
    due: offset(2),
    done: false,
  },
  {
    id: 't5',
    code: 'PO-2026-0151',
    type: 'purchase',
    status: '待核准',
    partner: 'Bosch 台灣',
    amount: 'NT$ 540,000',
    due: offset(3),
    done: false,
  },
  {
    id: 't6',
    code: 'QT-2026-0040',
    type: 'quote',
    status: '已送出',
    partner: '南部汽配',
    amount: 'NT$ 47,200',
    due: offset(-2),
    done: true,
  },
];

export const BULLETINS: Bulletin[] = [
  {
    type: '系統',
    title: '6 月 18 日 (週四) 12:00-14:00 系統維護、請提前儲存作業',
    date: '2 小時前',
    color: '#378add',
    unread: true,
  },
  {
    type: '政策',
    title: '保固申請流程更新、請參閱新版操作手冊',
    date: '昨天',
    color: '#e8a020',
    unread: true,
  },
  {
    type: '行銷',
    title: '夏季促銷活動 7/1 開跑、業務部準備好了嗎',
    date: '3 天前',
    color: '#1d9e75',
    unread: false,
  },
];

export const NOTIFICATIONS: Notification[] = [
  { text: 'QT-2026-0042 報價單等您核准', code: 'QT-2026-0042', when: '10 分鐘前', urgent: true },
  { text: 'SO-2026-0118 已逾備貨期限', code: 'SO-2026-0118', when: '1 小時前', urgent: true },
  { text: 'RC-2026-0094 客戶要求對帳', code: 'RC-2026-0094', when: '3 小時前', urgent: false },
  { text: 'PO-2026-0151 採購單需附加報價單', code: 'PO-2026-0151', when: '半天前', urgent: false },
];

// 全域導覽（小星球 Dock）8 主選單 + 主檔三層
export type DockItem = {
  key: string;
  label: string;
  icon?: string;
  href?: string;
  sub?: DockItem[];
};

export const DOCK_NAV: DockItem[] = [
  { key: 'home', label: '首頁', icon: 'home', href: '/dashboard' },
  { key: 'me', label: '個人', icon: 'user', href: '/dashboard/me' },
  {
    key: 'master',
    label: '主檔',
    icon: 'database',
    sub: [
      {
        key: 'org',
        label: '組織架構',
        sub: [
          { key: 'users', label: '員工', href: '/dashboard/base/users' },
          { key: 'departments', label: '部門', href: '/dashboard/base/departments' },
          { key: 'roles', label: '職務', href: '/dashboard/base/roles' },
          { key: 'teams', label: '組別', href: '/dashboard/base/teams' },
        ],
      },
      {
        key: 'rbac',
        label: '權限管理',
        sub: [
          { key: 'role-view', label: '角色與權限', href: '/dashboard/base/role-view' },
          { key: 'user-role', label: '員工角色', href: '/dashboard/base/user-role' },
        ],
      },
      {
        key: 'site',
        label: '據點倉庫',
        sub: [
          { key: 'sites', label: '據點', href: '/dashboard/base/site' },
          { key: 'warehouses', label: '倉庫', href: '/dashboard/base/warehouses' },
          { key: 'locations', label: '庫位', href: '/dashboard/base/location' },
          { key: 'user-warehouse', label: '員工倉庫', href: '/dashboard/base/user-warehouse' },
        ],
      },
      {
        key: 'partner',
        label: '往來對象',
        sub: [
          { key: 'partners', label: '客戶/供應商', href: '/dashboard/base/partners' },
          { key: 'cust-grade', label: '客戶分級', href: '/dashboard/base/customer-grade' },
          { key: 'supp-grade', label: '供應商分級', href: '/dashboard/base/supplier-grade' },
        ],
      },
      {
        key: 'part',
        label: '產品與廠牌',
        sub: [
          { key: 'parts', label: '零件', href: '/dashboard/base/parts' },
          { key: 'brand', label: '廠牌', href: '/dashboard/base/car-brand' },
          { key: 'part-group', label: '零件群組', href: '/dashboard/base/part-group' },
          { key: 'partner-part', label: '供應商供貨對應', href: '/dashboard/base/partner-part' },
        ],
      },
      {
        key: 'dict',
        label: '字典主檔',
        sub: [
          { key: 'currency', label: '幣別', href: '/dashboard/base/currency' },
          { key: 'country', label: '國家', href: '/dashboard/base/country' },
          { key: 'phonetic', label: '注音字典', href: '/dashboard/base/phonetic-dictionary' },
        ],
      },
    ],
  },
  { key: 'purchase', label: '採購', icon: 'shopping-cart', href: '/dashboard/purchase' },
  { key: 'sales', label: '銷貨', icon: 'trending-up', href: '/dashboard/sale' },
  { key: 'inventory', label: '庫存', icon: 'package', href: '/dashboard/inventory' },
  { key: 'finance', label: '財務', icon: 'dollar', href: '/dashboard/finance' },
  { key: 'reports', label: '報表', icon: 'bar-chart', href: '/dashboard/reports' },
];

export const TENANT_NAME = '亞羅汽材行';
