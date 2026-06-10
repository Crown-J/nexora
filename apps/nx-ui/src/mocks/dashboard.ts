/**
 * @FUNCTION_CODE NX99-SYS-DASH-MOCK-001-F01
 * Phase 1 Mock Data for SYS_DASHBOARD（集中於此，日後串接 API 時替換）
 */

export type PlanCode = 'LITE' | 'PLUS' | 'PRO';

export type BulletinType = 'URGENT' | 'COMPANY' | 'SYSTEM';

export type MockBulletin = {
  id: number;
  type: BulletinType;
  title: string;
  date: string;
  isRead: boolean;
};

export type CalendarEventType = 'MEETING' | 'EVENT' | 'LEAVE' | 'DEADLINE';

export type MockCalendarEvent = {
  date: string;
  type: CalendarEventType;
  title: string;
  /** 後端未拆欄位時：`HH:MM-HH:MM` 或「全天」等 */
  time: string;
  /** 全日事件；與 `startTime`/`endTime` 二擇或併用 */
  isAllDay?: boolean;
  /** 明確起訖（HH:MM）；皆 null 且無可用 `time` 時 UI 顯示「全天」 */
  startTime?: string | null;
  endTime?: string | null;
  /** 建立／負責人（列表第二行右側） */
  creatorName?: string;
  location?: string;
  requireRsvp?: boolean;
};

export type TaskPriority = 'URGENT' | 'NORMAL';

export type MockTaskStatus = 'pending' | 'in_progress' | 'done';

export type MockTask = {
  id: number;
  title: string;
  desc: string;
  priority: TaskPriority;
  category: string;
  deadline: string;
  xp: number;
  /** 系統偵測之待辦狀態（首頁唯讀顯示） */
  status: MockTaskStatus;
  targetRoute: string;
};

export type MockAttendanceUser = {
  id: string;
  initials: string;
  status: 'in' | 'leave' | 'absent';
  name: string;
};

export const mockCurrentUser = {
  id: 'USR-001',
  name: '林翰杰',
  role: '系統管理員',
  planCode: 'PRO' as PlanCode,
  tenantName: '恆迎企業',
  avatarInitial: '林',
  unreadBulletins: 2,
  unreadNotifications: 5,
};

export const mockBulletins: MockBulletin[] = [
  { id: 1, type: 'URGENT', title: '系統維護通知', date: '2026-04-13', isRead: false },
  { id: 2, type: 'COMPANY', title: '4月份業績公告', date: '2026-04-12', isRead: false },
  { id: 3, type: 'SYSTEM', title: '新功能上線：行事曆', date: '2026-04-10', isRead: true },
];

export const mockExpData = {
  currentLevel: 12,
  currentExp: 3200,
  nextLevelExp: 4500,
  medalName: '黃金大師',
  medalCode: 'GOLD',
  medalRank: 'II',
  userName: '林翰杰',
};

export const mockCalendarEvents: MockCalendarEvent[] = [
  {
    date: '2026-04-13',
    type: 'MEETING',
    title: '產品規劃會議',
    time: '10:00-11:30',
    creatorName: '王小明',
    location: '會議室A',
  },
  {
    date: '2026-04-13',
    type: 'EVENT',
    title: '團隊午餐',
    time: '12:00-13:30',
    creatorName: '林美玲',
    requireRsvp: true,
  },
  {
    date: '2026-04-18',
    type: 'DEADLINE',
    title: 'Q1 報表截止',
    time: '18:00',
    creatorName: '陳主管',
  },
];

export const mockTasks: MockTask[] = [
  {
    id: 1,
    title: '審核本月銷售報表',
    desc: '檢查並批准 Q1 銷售數據',
    priority: 'URGENT',
    category: '報表',
    deadline: '10:00',
    xp: 30,
    status: 'pending',
    targetRoute: '/dashboard/nx03/workbench',
  },
  {
    id: 2,
    title: '回覆客戶抱怨郵件',
    desc: '',
    priority: 'URGENT',
    category: '客服',
    deadline: '11:30',
    xp: 20,
    status: 'in_progress',
    targetRoute: '/dashboard/sale',
  },
  {
    id: 3,
    title: '更新庫存資料',
    desc: '',
    priority: 'NORMAL',
    category: '庫存',
    deadline: '14:00',
    xp: 15,
    status: 'done',
    targetRoute: '/dashboard/nx02/balance',
  },
  {
    id: 4,
    title: '參加團隊週會',
    desc: '',
    priority: 'NORMAL',
    category: '會議',
    deadline: '15:00',
    xp: 10,
    status: 'pending',
    targetRoute: '/dashboard',
  },
];

export const mockAttendanceToday: MockAttendanceUser[] = [
  { id: '1', initials: 'WM', status: 'in', name: '王銘' },
  { id: '2', initials: 'ML', status: 'in', name: '美玲' },
  { id: '3', initials: 'DW', status: 'in', name: '大維' },
  { id: '4', initials: 'JH', status: 'leave', name: '家豪' },
  { id: '5', initials: 'ZH', status: 'in', name: '志華' },
];

export const mockDailyGoals = [
  { id: 'g1', label: '完成5項工作任務', xp: 50, done: true },
  { id: 'g2', label: '準時上班簽到', xp: 20, done: true },
  { id: 'g3', label: '參與一場會議', xp: 30, done: false, time: '10:00' },
  { id: 'g4', label: '填寫工作日誌', xp: 25, done: false },
];

/** PRO 首頁 NX10：經驗條／簽到／日誌 Mock */
export type MockNx10Dashboard = {
  userName: string;
  avatarInitial: string;
  medalCode: string;
  medalRank: string;
  medalName: string;
  currentLevel: number;
  currentExp: number;
  nextLevelExp: number;
  checkedIn: boolean;
  checkinTime: string | null;
  dailyReportDone: boolean;
};

export const mockNx10: MockNx10Dashboard = {
  userName: '林翰杰',
  avatarInitial: '林',
  medalCode: 'GOLD',
  medalRank: 'II',
  medalName: '黃金大師',
  currentLevel: 12,
  currentExp: 3200,
  nextLevelExp: 4500,
  checkedIn: false,
  checkinTime: null,
  dailyReportDone: false,
};

/** PRO 首頁「本月目標」KPI（與 `mockMonthlyKpi` 公司/團隊營收結構分離） */
export type MockProMonthlyKpiItem = {
  type: string;
  label: string;
  formula: string;
  current: number;
  target: number;
  /** 反向：顯示% = 100 −（目標−實際）／目標×100 */
  reverse?: boolean;
};

export type MockProMonthlyKpi = {
  yearMonth: string;
  items: MockProMonthlyKpiItem[];
};

export const mockProMonthlyKpi: MockProMonthlyKpi = {
  yearMonth: '2026年4月',
  items: [
    {
      type: '品質',
      label: '客戶品質分數',
      formula: '客戶評分加權平均',
      current: 85,
      target: 100,
      reverse: false,
    },
    {
      type: '貢獻',
      label: '銷售毛利分數',
      formula: '毛利額 / 目標毛利額',
      current: 72,
      target: 100,
      reverse: false,
    },
    {
      type: '失誤',
      label: '被客訴分數',
      formula: '反向指標：客訴次數扣分',
      current: 90,
      target: 100,
      reverse: true,
    },
    {
      type: '妥善',
      label: '設備妥善分數',
      formula: '設備正常使用率',
      current: 95,
      target: 100,
      reverse: false,
    },
    {
      type: '出勤',
      label: '上班時間分數',
      formula: '準時出勤率加權',
      current: 88,
      target: 100,
      reverse: false,
    },
  ],
};

export type MockProAttendanceStatus = 'present' | 'leave' | 'absent';

export type MockProAttendancePerson = {
  name: string;
  initial: string;
  status: MockProAttendanceStatus;
};

export const mockProAttendance: MockProAttendancePerson[] = [
  { name: '王小明', initial: '王', status: 'present' },
  { name: '林翰杰', initial: '林', status: 'present' },
  { name: '陳大偉', initial: '陳', status: 'leave' },
  { name: '張美玲', initial: '張', status: 'present' },
  { name: '李志明', initial: '李', status: 'absent' },
];

export type KpiScope = 'company' | 'team' | 'personal';

export const mockMonthlyKpi: Record<
  KpiScope,
  { revenue: { cur: number; max: number }; satisfaction: { cur: number; max: number }; newCustomers: { cur: number; max: number } }
> = {
  company: {
    revenue: { cur: 850, max: 1000 },
    satisfaction: { cur: 92, max: 95 },
    newCustomers: { cur: 45, max: 60 },
  },
  team: {
    revenue: { cur: 320, max: 400 },
    satisfaction: { cur: 88, max: 90 },
    newCustomers: { cur: 18, max: 25 },
  },
  personal: {
    revenue: { cur: 45, max: 80 },
    satisfaction: { cur: 90, max: 95 },
    newCustomers: { cur: 3, max: 5 },
  },
};

export const mockMedalTiers = [
  { code: 'BRONZE', label: '銅牌', unlocked: true, progress: 1 },
  { code: 'SILVER', label: '銀牌', unlocked: true, progress: 1 },
  { code: 'GOLD', label: '金牌', unlocked: true, progress: 0.75 },
  { code: 'PLATINUM', label: '白金', unlocked: false, progress: 0.2 },
] as const;

export type MockLeaderRow = {
  rank: number;
  name: string;
  exp: number;
  dept?: string;
  initials?: string;
  level?: number;
  trend?: number;
  isMe?: boolean;
};

export const mockLeaderboard: Record<'week' | 'month' | 'all', MockLeaderRow[]> = {
  week: [
    {
      rank: 1,
      name: '陳小華',
      dept: '業務部',
      exp: 5200,
      initials: 'CH',
      level: 24,
      trend: 1,
    },
    {
      rank: 2,
      name: '李志明',
      dept: '採購部',
      exp: 4980,
      initials: 'LZ',
      level: 23,
      trend: -1,
    },
    {
      rank: 3,
      name: '張美玲',
      dept: '客服部',
      exp: 4650,
      initials: 'ZM',
      level: 22,
      trend: 0,
    },
    { rank: 4, name: '吳大維', dept: '倉儲部', exp: 4100, initials: 'WD', level: 20 },
    { rank: 5, name: '趙敏', dept: '財務部', exp: 3920, initials: '趙', level: 19 },
    {
      rank: 8,
      name: '林翰杰',
      dept: '資訊部',
      exp: 3200,
      initials: '林',
      level: 12,
      trend: 2,
      isMe: true,
    },
  ],
  month: [
    {
      rank: 1,
      name: '王大偉',
      dept: '業務部',
      exp: 18200,
      initials: 'WD',
      level: 28,
      trend: 0,
    },
    {
      rank: 2,
      name: '林小美',
      dept: '倉儲部',
      exp: 16800,
      initials: 'LM',
      level: 27,
      trend: 2,
    },
    {
      rank: 3,
      name: '趙敏',
      dept: '財務部',
      exp: 15900,
      initials: 'ZM',
      level: 26,
      trend: -1,
    },
    { rank: 4, name: '陳小華', dept: '業務部', exp: 14200, initials: 'CH', level: 25 },
    { rank: 5, name: '李志明', dept: '採購部', exp: 13800, initials: 'LZ', level: 24 },
    {
      rank: 12,
      name: '林翰杰',
      dept: '資訊部',
      exp: 12580,
      initials: '林',
      level: 12,
      trend: -1,
      isMe: true,
    },
  ],
  all: [
    { rank: 1, name: '系統管理員', dept: '—', exp: 999999, initials: 'SY', level: 99 },
    {
      rank: 12,
      name: '林翰杰',
      dept: '資訊部',
      exp: 45200,
      initials: '林',
      level: 12,
      trend: 0,
      isMe: true,
    },
  ],
};

export type LeaderPeriod = keyof typeof mockLeaderboard;

/** 舊版列表（保留） */
export const mockCheckinRewards = [
  { days: 1, xp: 10 },
  { days: 2, xp: 15 },
  { days: 3, xp: 20 },
  { days: 5, xp: 35 },
  { days: 7, xp: 80 },
  { days: 14, xp: 200 },
  { days: 30, xp: 500 },
];

/** 本週 7 日簽到格（遊戲化 Mock） */
export const mockCheckinWeekRewards = [
  { day: 1, xp: 10 },
  { day: 2, xp: 15 },
  { day: 3, xp: 20 },
  { day: 4, xp: 25 },
  { day: 5, xp: 30 },
  { day: 6, xp: 40 },
  { day: 7, xp: 80 },
] as const;

/** 額外里程碑（簽到獎勵 Modal 下方四格） */
export const mockCheckinMilestones = [
  { days: 7, xp: 80, label: '新手達人' },
  { days: 14, xp: 200, label: '效率專家' },
  { days: 21, xp: 350, label: '全勤之星' },
  { days: 30, xp: 500, label: '傳奇出勤' },
] as const;

/** 牌位階梯（與 mockExpData.currentLevel 對應） */
export const mockRankLadder = [
  { code: 'BRONZE', label: '青銅戰士', minLevel: 1, blurb: 'Lv.1+' },
  { code: 'SILVER', label: '白銀精英', minLevel: 6, blurb: 'Lv.6+' },
  { code: 'GOLD', label: '黃金大師', minLevel: 12, blurb: 'Lv.12+' },
  { code: 'PLATINUM', label: '白金戰神', minLevel: 20, blurb: 'Lv.20+' },
  { code: 'DIAMOND', label: '鑽石傳說', minLevel: 30, blurb: 'Lv.30+' },
  { code: 'LEGEND', label: '永恆至尊', minLevel: 45, blurb: 'Lv.45+' },
] as const;
