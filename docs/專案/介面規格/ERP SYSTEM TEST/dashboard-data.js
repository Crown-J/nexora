// NEXORA GRID — 首頁儀表板 mock data（台灣汽車零件經銷商）
// TODAY 固定為 2026-06-11（與事件資料對齊）
window.NX_TODAY = { y: 2026, m: 6, d: 11 };

window.NX_USER = { name: '陳柏宏', role: '銷售主管', initial: '陳', empId: 'E-10428', tenant: '亞羅汽材行' };

// 小星球 Dock — 全系統唯一導覽（主選單七項 → 子選單）
window.NX_NAV = [
  { key: 'home', label: '首頁', icon: 'home', sub: ['儀表板總覽'] },
  { key: 'personal', label: '個人', icon: 'user', sub: ['個人儀表板', '我的單據', '我的行事曆', '通知中心'] },
  { key: 'purchase', label: '採購', icon: 'cart', sub: ['採購需求', '詢價單', '採購單', '進貨驗收', '退供應商'] },
  { key: 'sales', label: '銷貨', icon: 'fileText', sub: ['報價單', '銷貨單', '出貨單', '收款單', '退貨'] },
  { key: 'inventory', label: '庫存', icon: 'package', sub: ['庫存查詢', '調撥單', '盤點作業', '安全庫存'] },
  { key: 'finance', label: '財務', icon: 'wallet', sub: ['應收帳款', '應付帳款', '傳票', '對帳作業'] },
  { key: 'reports', label: '報表', icon: 'barChart', sub: ['銷售報表', '庫存報表', '財務報表', '採購分析'] },
];

// 行事曆＝個人行程（會議 / 活動 / 假日 / 請假 / 教育訓練）— 不放單據
window.NX_EVTYPE = {
  meeting:  { label: '會議', color: 'var(--info)' },
  event:    { label: '活動', color: 'var(--gold-bright)' },
  training: { label: '教育訓練', color: 'var(--bio)' },
  leave:    { label: '請假', color: 'var(--violet)' },
  holiday:  { label: '假日', color: 'var(--danger)' },
};

// 行事曆事件（key：'YYYY-M-D'，月份/日期不補零）
window.NX_EVENTS = {
  '2026-6-2': [
    { time: '09:30', type: 'meeting', title: '部門週會', meta: '3F 會議室' },
  ],
  '2026-6-5': [
    { time: '14:00', type: 'event', title: '供應商拜訪 · NISSHINBO', meta: '台中' },
  ],
  '2026-6-9': [
    { time: '10:00', type: 'meeting', title: '庫存檢討會議', meta: '庫存課' },
  ],
  '2026-6-11': [
    { time: '09:00', type: 'meeting', title: '銷售部晨會', meta: '3F 會議室' },
    { time: '14:00', type: 'meeting', title: '報價策略會議', meta: '會議室 B' },
    { time: '18:30', type: 'event', title: '部門季末聚餐', meta: '台中 · 公司聚餐' },
  ],
  '2026-6-12': [
    { time: '全天', type: 'leave', title: '特休假', meta: '已核准' },
  ],
  '2026-6-15': [
    { time: '09:30', type: 'meeting', title: '月中對帳會議', meta: '財務部 · 3F' },
  ],
  '2026-6-18': [
    { time: '13:00', type: 'training', title: '新系統操作教育訓練', meta: '資訊部 · 訓練室' },
  ],
  '2026-6-19': [
    { time: '全天', type: 'holiday', title: '端午節', meta: '國定假日' },
  ],
  '2026-6-23': [
    { time: '11:00', type: 'meeting', title: '客戶簡報 · 大同車業', meta: '線上' },
  ],
  '2026-6-25': [
    { time: '15:00', type: 'event', title: '季度業績檢討', meta: '全體業務' },
  ],
  '2026-6-30': [
    { time: '09:00', type: 'meeting', title: '月底結帳會議', meta: '財務部' },
  ],
};

// 單據型別 → 語意色 / 標籤
window.NX_DOCTYPE = {
  quote:    { label: '報價', color: 'var(--info)' },
  sales:    { label: '銷貨', color: 'var(--gold-bright)' },
  ship:     { label: '出貨', color: 'var(--bio)' },
  collect:  { label: '收款', color: 'var(--green)' },
  purchase: { label: '採購', color: 'var(--violet)' },
};

// 未完成單據（任務清單）— 我發起的＋指派給我的
window.NX_TASKS = [
  { id: 't1', type: 'collect',  code: 'RC-2026-0033', partner: '三和機械', amount: 'NT$ 372,000', status: '待收款', due: '2026-6-11', done: false },
  { id: 't2', type: 'sales',    code: 'SO-2026-0118', partner: '三和機械', amount: 'NT$ 372,000', status: '待出貨', due: '2026-6-12', done: false },
  { id: 't3', type: 'ship',     code: 'SH-2026-0091', partner: '永豐汽材', amount: 'NT$ 1,251,000', status: '待確認', due: '2026-6-12', done: false },
  { id: 't4', type: 'quote',    code: 'QT-2026-0042', partner: '亞東貿易', amount: 'NT$ 84,600',  status: '待回覆', due: '2026-6-10', done: false },
  { id: 't5', type: 'purchase', code: 'PO-2026-0077', partner: 'NISSHINBO', amount: 'NT$ 248,000', status: '待核准', due: '2026-6-13', done: false },
  { id: 't6', type: 'purchase', code: 'PO-2026-0076', partner: 'DENSO', amount: 'NT$ 132,000', status: '待核准', due: '2026-6-9', done: false },
  { id: 't7', type: 'sales',    code: 'SO-2026-0115', partner: '大同車業', amount: 'NT$ 46,200',  status: '草稿', due: '2026-6-15', done: false },
  { id: 't8', type: 'quote',    code: 'QT-2026-0041', partner: '大同車業', amount: 'NT$ 46,200',  status: '草稿', due: '2026-6-23', done: false },
];

// 通知（待辦驅動：只推「該我處理的事」）
window.NX_NOTIFICATIONS = [
  { code: 'RC-2026-0033', text: '三和機械應收款今日到期，待您確認收款', when: '今天 09:10', urgent: true },
  { code: 'QT-2026-0042', text: '亞東貿易報價單已逾期，待您回覆', when: '昨天 17:40', urgent: true },
  { code: 'SO-2026-0118', text: 'SO-2026-0118 已核准，待您安排出貨', when: '昨天 14:02', urgent: false },
  { code: 'PO-2026-0076', text: 'DENSO 採購單待您核准', when: '06/09 11:20', urgent: false },
];

// 公告
window.NX_BULLETINS = [
  { type: '緊急', title: '系統維護：本週六 02:00–04:00 暫停服務', date: '06/07', unread: true, color: 'var(--danger)' },
  { type: '公司', title: 'Q2 業績獎金辦法公告', date: '06/05', unread: true, color: 'var(--info)' },
  { type: '系統', title: '新增「自動補貨」模組設定', date: '06/03', unread: false, color: 'var(--muted)' },
];

// 全體員工出勤狀況
window.NX_ATTEND_STATUS = {
  work:     { label: '上班', color: 'var(--green)' },
  remote:   { label: '外出', color: 'var(--info)' },
  trip:     { label: '出差', color: 'var(--gold-bright)' },
  leave:    { label: '休假', color: 'var(--violet)' },
  personal: { label: '事假', color: 'var(--warning)' },
  sick:     { label: '病假', color: 'var(--danger)' },
};
window.NX_ATTENDANCE = [
  { name: '陳柏宏', role: '銷售主管', status: 'work' },
  { name: '林佳螢', role: '業務專員', status: 'remote' },
  { name: '王志明', role: '業務專員', status: 'trip' },
  { name: '李美玲', role: '會計', status: 'work' },
  { name: '張俊傑', role: '倉管', status: 'work' },
  { name: '黃淑芬', role: '採購專員', status: 'leave' },
  { name: '吳建宏', role: '業務專員', status: 'sick' },
  { name: '周雅婷', role: '客服', status: 'work' },
  { name: '蔡文傑', role: '倉管', status: 'personal' },
  { name: '鄭家豪', role: '業務專員', status: 'work' },
  { name: '許雅文', role: '會計', status: 'work' },
  { name: '劉冠廷', role: '採購專員', status: 'remote' },
];

// lucide-style 圖示路徑（內層 markup，含 circle）
window.NX_ICONS = {
  home: '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2 3h2.2l2.1 12.4a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 7H6"/>',
  package: '<path d="M21 8 12 3 3 8v8l9 5 9-5ZM3 8l9 5 9-5M12 13v8"/>',
  fileText: '<path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM8 13h8M8 17h6"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h12v3M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a1 1 0 0 0-1-1H4M17 13h.01"/>',
  barChart: '<path d="M3 21h18M7 21V11M12 21V5M17 21v-7"/>',
};
