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
  time: string;
  location?: string;
  requireRsvp?: boolean;
};

export type TaskPriority = 'URGENT' | 'NORMAL';

export type MockTask = {
  id: number;
  title: string;
  desc: string;
  priority: TaskPriority;
  category: string;
  deadline: string;
  xp: number;
  done: boolean;
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
    location: '會議室A',
  },
  {
    date: '2026-04-13',
    type: 'EVENT',
    title: '團隊午餐',
    time: '12:00-13:30',
    requireRsvp: true,
  },
  { date: '2026-04-18', type: 'DEADLINE', title: 'Q1 報表截止', time: '18:00' },
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
    done: false,
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
    done: false,
    targetRoute: '/dashboard/nx04',
  },
  {
    id: 3,
    title: '更新庫存資料',
    desc: '',
    priority: 'NORMAL',
    category: '庫存',
    deadline: '14:00',
    xp: 15,
    done: true,
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
    done: false,
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

export const mockLeaderboard = {
  week: [
    { rank: 1, name: '陳小華', exp: 5200 },
    { rank: 2, name: '李志明', exp: 4980 },
    { rank: 3, name: '張美玲', exp: 4650 },
    { rank: 8, name: '林翰杰', exp: 3200, isMe: true },
  ],
  month: [
    { rank: 1, name: '王大偉', exp: 18200 },
    { rank: 2, name: '林翰杰', exp: 16800, isMe: true },
    { rank: 3, name: '趙敏', exp: 15900 },
  ],
  all: [
    { rank: 1, name: '系統管理員', exp: 999999 },
    { rank: 12, name: '林翰杰', exp: 45200, isMe: true },
  ],
} as const;

export type LeaderPeriod = keyof typeof mockLeaderboard;

export const mockCheckinRewards = [
  { days: 1, xp: 10 },
  { days: 2, xp: 15 },
  { days: 3, xp: 20 },
  { days: 5, xp: 35 },
  { days: 7, xp: 80 },
  { days: 14, xp: 200 },
  { days: 30, xp: 500 },
];
