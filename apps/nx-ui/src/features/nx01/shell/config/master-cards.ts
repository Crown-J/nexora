/**
 * File: apps/nx-ui/src/features/base/config/master-cards.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 主檔中心 hub 卡片 metadata（摘要數字由 page 以 API total 覆寫）
 */

import {
  Users,
  UsersRound,
  Briefcase,
  UserCog,
  MapPin,
  Shield,
  Package,
  Tags,
  Layers,
  Warehouse,
  Building2,
  Handshake,
  Globe,
  CircleDollarSign,
  SlidersHorizontal,
  Link2,
  Megaphone,
  Award,
  Car,
  Cog,
  Wrench,
  Settings2,
  LayoutGrid,
  BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * 主檔 hub 分區（同區卡片排在一起，避免找功能時跳來跳去）。
 * - 'vehicle' 為 NX01-16 業界改革 #22 新增的「車型字典」獨立分區
 *   （引擎／車型／變速箱／傳動／類別 5 卡聚焦汽車零件 ERP 領域知識）
 */
export type MasterHubSectionId =
  | 'account'
  | 'product'
  | 'vehicle'
  | 'organization'
  | 'partner'
  | 'system';

/**
 * 版本門檻（NEXORA 三版本可見性策略、業界改革 #22）。
 * - 未指定 / 'LITE'：所有版本均可見且可入
 * - 'PLUS'：LITE 版灰階展示、Upgrade prompt；PLUS／PRO 完整入
 * - 'PRO'：LITE／PLUS 版灰階展示、Upgrade prompt；PRO 完整入
 *
 * 注意：本欄純 UX 引導、非 backend security gate；後續軌
 * TASK-NX99-PLAN-MIDDLEWARE 才會加上路由守門。
 */
export type MasterHubMinPlan = 'LITE' | 'PLUS' | 'PRO';

/** 版本層級數字、由低至高（純前端 UX 排序、非業務權限判定） */
const PLAN_RANK: Record<MasterHubMinPlan, number> = {
  LITE: 0,
  PLUS: 1,
  PRO: 2,
};

/**
 * 將任意 planCode 字串收斂為 'LITE' | 'PLUS' | 'PRO'。
 * - 大小寫 / 前綴 'NEXORA-' / 空字串 / null 一律 normalize
 * - 無法識別 / 未登入 一律回 'LITE'（保守、避免誤開 PLUS 內容）
 */
export function normalizePlanCode(raw: string | null | undefined): MasterHubMinPlan {
  const p = (raw ?? '').trim().toUpperCase().replace(/^NEXORA-/, '');
  if (p === 'PRO' || p === 'ENTERPRISE') return 'PRO';
  if (p === 'PLUS') return 'PLUS';
  return 'LITE';
}

/**
 * 判定使用者目前版本是否可入該主檔卡。
 * - minPlan 未指定 = 'LITE'（一律可入）
 * - 否則 userPlan rank >= minPlan rank 才可入
 */
export function canAccessMasterCard(
  userPlan: MasterHubMinPlan,
  minPlan: MasterHubMinPlan | undefined,
): boolean {
  const required = minPlan ?? 'LITE';
  return PLAN_RANK[userPlan] >= PLAN_RANK[required];
}

export type MasterHubCard = {
  id: string;
  /** 主檔總覽上的分組 */
  section: MasterHubSectionId;
  /** 版本門檻、未指定 = 'LITE'（LITE 起開放） */
  minPlan?: MasterHubMinPlan;
  title: string;
  description: string;
  icon: LucideIcon;
  statLabel: string;
  statValue: string;
  /** 卡片點擊導向（一卡一概念、業界改革 #22 v1.1 拆 dual entries 後永遠必填） */
  href: string;
};

export const MASTER_HUB_SECTION_ORDER: MasterHubSectionId[] = [
  'account',
  'product',
  'vehicle',
  'organization',
  'partner',
  'system',
];

export const MASTER_HUB_SECTION_TITLES: Record<MasterHubSectionId, string> = {
  account: '帳號與權限',
  product: '產品與料號',
  vehicle: '車型字典',
  organization: '組織架構',
  partner: '交易對象',
  system: '系統設定',
};

export type MasterHubSectionGroup = {
  id: MasterHubSectionId;
  title: string;
  cards: MasterHubCard[];
};

export const MASTER_HUB_CARDS: MasterHubCard[] = [
  {
    id: 'user',
    section: 'account',
    title: '使用者基本資料',
    description: '帳號、聯絡方式與啟用狀態',
    icon: Users,
    statLabel: '啟用帳號',
    statValue: '42 筆',
    href: '/dashboard/master/users',
  },
  {
    id: 'role',
    section: 'account',
    title: '職務基本資料',
    description: '職務代碼、名稱與啟用狀態',
    icon: Briefcase,
    statLabel: '職務項目',
    statValue: '—',
    href: '/dashboard/master/roles',
  },
  // 05 批 T1 2026-06-07：部門主檔揭露（從 nx07 placeholder 升級到主檔中心）
  {
    id: 'department',
    section: 'account',
    title: '部門基本資料',
    description: '部門代碼、名稱與啟用狀態（員工 / 職務 / 組均隸屬部門）',
    icon: Building2,
    statLabel: '部門',
    statValue: '—',
    href: '/dashboard/master/department',
  },
  // 05 批 T2 2026-06-07：組主檔揭露（揭露既有 Nx01Team、隸屬部門 + 自我 ref 子組）
  {
    id: 'team',
    section: 'account',
    title: '組基本資料',
    description: '組代碼、名稱、隸屬部門與上層組（支援部門→組→員工三層結構）',
    icon: UsersRound,
    statLabel: '組',
    statValue: '—',
    href: '/dashboard/master/team',
  },
  // 軌 A commit A1（業界改革 #22 v1.2 累積調整）：
  // user-role / user-warehouse 兩主檔卡片降階為「批次工具」入口。
  // - LITE / PLUS 用戶於 USER 詳細頁直接管理擔任職務 / 隸屬倉庫（forward 視角）
  // - PRO 用戶保留 reverse 範式（依職務 / 倉庫批次匯入移除成員）
  // - sidebar menu 同步移除（menu.base.ts），仍可由本卡片或 URL 進入
  // 2026-06-20 使用者職務設定 / 使用者據點設定改主檔群組模板
  //   - 組織架構圖 OrgStructurePage（部門→組別／職務→使用者 雙分支樹）
  //   - 據點架構圖 LocationStructurePage（據點→倉庫→庫位 + 員工副區）
  {
    id: 'org-structure',
    section: 'account',
    title: '組織架構圖',
    description: '部門 → 組別／職務 → 使用者 雙分支樹；員工可多歸組、多職',
    icon: UserCog,
    statLabel: '節點數',
    statValue: '—',
    href: '/dashboard/master/org-structure',
  },
  {
    id: 'location-structure',
    section: 'account',
    title: '據點架構圖',
    description: '據點 → 倉庫 → 庫位 三層結構；下方員工歸屬副區',
    icon: MapPin,
    statLabel: '節點數',
    statValue: '—',
    href: '/dashboard/master/location-structure',
  },
  {
    id: 'role-view',
    section: 'account',
    title: '職務權限設定',
    description: '角色與畫面權限矩陣（Role ⇄ View）',
    icon: Shield,
    statLabel: '已套用規則',
    statValue: '—',
    href: '/dashboard/master/role-view',
  },
  {
    id: 'bulletin',
    section: 'system',
    title: '公告基本資料',
    description: '系統／公司公告與到期設定',
    icon: Megaphone,
    statLabel: '公告',
    statValue: '—',
    href: '/dashboard/master/bulletins',
  },
  {
    id: 'part',
    section: 'product',
    title: '零件基本資料',
    description: '料號、規格與狀態',
    icon: Package,
    statLabel: '零件筆數',
    statValue: '—',
    href: '/dashboard/master/parts',
  },
  // W6 [3-8] 2026-06-06 品牌合併：car-brand + part-brand → 單一 brand 卡
  // 舊 car-brand / part-brand 路由保留向後相容（後續軌可改 redirect）
  {
    id: 'brand',
    section: 'product',
    title: '品牌基本資料',
    description: '汽車品牌 + 零件廠牌雙開關（NX-MANUAL-02 v2.0 §3.8 合表）',
    icon: Tags,
    statLabel: '品牌',
    statValue: '—',
    href: '/dashboard/master/brand',
  },
  {
    id: 'part-group',
    section: 'product',
    title: '零件群組基本資料',
    description: '族群名稱與料號匹配（廠牌 + seg1～5）',
    icon: Layers,
    statLabel: '族群',
    statValue: '—',
    href: '/dashboard/master/part-group',
  },
  {
    id: 'brand-code-rule',
    section: 'product',
    minPlan: 'PLUS',
    title: '品牌料號規則基本資料',
    description: '依零件品牌設定料號的分段長度與排列規則',
    icon: SlidersHorizontal,
    statLabel: '規則',
    statValue: '—',
    href: '/dashboard/master/brand-code-rule',
  },
  {
    id: 'part-relation',
    section: 'product',
    minPlan: 'PLUS',
    title: '零件關聯基本資料',
    description: '改號／同款／組合包等零件關係',
    icon: Link2,
    statLabel: '關聯',
    statValue: '—',
    href: '/dashboard/master/part-relation',
  },
  // 2026-06-20 通用件群組改主檔群組模板（主件範式、群組標題 = 主件、用料號搜尋找群組）
  {
    id: 'universal-group',
    section: 'product',
    title: '通用件群組',
    description: '同群組成員互相通用、群組標題＝主件、用料號搜尋找群組',
    icon: Link2,
    statLabel: '群組',
    statValue: '—',
    href: '/dashboard/master/universal-group',
  },
  {
    id: 'part-model',
    section: 'product',
    minPlan: 'PLUS',
    title: '料件車型適配基本資料',
    description: '料件 ↔ 車型適配（原廠／副廠等效／通用替代）',
    icon: Link2,
    statLabel: '適配',
    statValue: '—',
    href: '/dashboard/master/part-model',
  },
  {
    id: 'country',
    section: 'system',
    title: '國家基本資料',
    description: '國家代碼與名稱（產地／廠牌國家）',
    icon: Globe,
    statLabel: '國家',
    statValue: '—',
    href: '/dashboard/master/country',
  },
  {
    id: 'currency',
    section: 'system',
    title: '幣別基本資料',
    description: '幣別代碼、符號與小數位數',
    icon: CircleDollarSign,
    statLabel: '幣別',
    statValue: '—',
    href: '/dashboard/master/currency',
  },
  {
    id: 'warehouse',
    section: 'organization',
    title: '倉庫基本資料',
    description: '倉別代碼、據點與啟用狀態',
    icon: Warehouse,
    statLabel: '倉庫',
    statValue: '—',
    href: '/dashboard/master/warehouses',
  },
  {
    id: 'site',
    section: 'organization',
    title: '據點基本資料',
    description: '公司物理分點（台北倉／台中倉…），倉庫之上一層；LITE 預設總公司一筆',
    icon: Building2,
    statLabel: '據點',
    statValue: '—',
    href: '/dashboard/master/site',
  },
  {
    id: 'location',
    section: 'organization',
    title: '庫位基本資料',
    description: '倉庫內的物理位置（區／架／層／格），歸屬某據點 + 某倉庫',
    icon: MapPin,
    statLabel: '庫位',
    statValue: '—',
    href: '/dashboard/master/location',
  },
  {
    id: 'partner',
    section: 'partner',
    title: '往來對象基本資料',
    description: '六分類：C 保養廠 / O 同行 / S 供應商 / T 外包物流 / B 銀行 / V 一般廠商',
    icon: Handshake,
    statLabel: '交易對象',
    statValue: '—',
    href: '/dashboard/master/partners',
  },
  // ─── 車型字典（NX01-16 業界改革 #22、PLUS 起開放）─────────────────
  {
    id: 'engine',
    section: 'vehicle',
    minPlan: 'PLUS',
    title: '引擎基本資料',
    description: '引擎代碼、排氣量與燃料型式',
    icon: Cog,
    statLabel: '引擎',
    statValue: '—',
    href: '/dashboard/master/engine',
  },
  {
    id: 'model',
    section: 'vehicle',
    minPlan: 'PLUS',
    title: '車型基本資料',
    description: '車廠 × 車系 × 年式組合與規格摘要',
    icon: Car,
    statLabel: '車型',
    statValue: '—',
    href: '/dashboard/master/model',
  },
  {
    id: 'transmission',
    section: 'vehicle',
    minPlan: 'PLUS',
    title: '變速箱基本資料',
    description: '自手排／CVT／DCT 等變速箱類型代碼（NX01-15）',
    icon: Settings2,
    statLabel: '變速箱',
    statValue: '—',
    href: '/dashboard/master/transmission',
  },
  {
    id: 'drivetrain',
    section: 'vehicle',
    minPlan: 'PLUS',
    title: '傳動方式基本資料',
    description: 'FF／FR／4WD／AWD 傳動配置代碼（NX01-15）',
    icon: Wrench,
    statLabel: '傳動',
    statValue: '—',
    href: '/dashboard/master/drivetrain',
  },
  {
    id: 'model-type',
    section: 'vehicle',
    minPlan: 'PLUS',
    title: '車體類型基本資料',
    description: '轎車／掀背／休旅／旅行／跑車等大類分群（NX01-15）',
    icon: LayoutGrid,
    statLabel: '類型',
    statValue: '—',
    href: '/dashboard/master/model-type',
  },
  // ─── 交易對象延伸（客戶等級）────────────────────────────────
  // [4-1] 2026-06-05：手冊 §11.4 揭露「LITE 全版本開放」、移除 minPlan: 'PLUS' 鎖
  {
    id: 'customer-grade',
    section: 'partner',
    title: '客戶分級基本資料',
    description: '依交易額／信用條件分級，影響定價與付款條件',
    icon: Award,
    statLabel: '等級',
    statValue: '—',
    href: '/dashboard/master/customer-grade',
  },
  // 05 批 T4 2026-06-07：供應商分級半開放（A/B/C/D 內建鎖 + 客戶可加自訂 VIP / 列管）
  {
    id: 'supplier-grade',
    section: 'partner',
    title: '供應商分級基本資料',
    description: '純評等標籤（A/B/C/D 內建依付款條件自動分級、客戶可加自訂等級如 VIP / 列管）',
    icon: Award,
    statLabel: '等級',
    statValue: '—',
    href: '/dashboard/master/supplier-grade',
  },
  // 02 對齊第二批 C 軌 CP1：地區小型主檔（不入 partner code 編號）
  {
    id: 'region',
    section: 'partner',
    title: '地區基本資料',
    description: '客戶分區下拉、純展示分類、不影響 partner 編號',
    icon: MapPin,
    statLabel: '地區',
    statValue: '—',
    href: '/dashboard/master/region',
  },
  // ─── 系統設定延伸（注音字典）────────────────────────────────────
  // 02 結案 2026-06-07：解除 PRO 限制（總經理拍板「功能不綁版本」、注音快搜屬核心、對齊手冊 LITE）。
  {
    id: 'phonetic-dictionary',
    section: 'system',
    title: '注音字典基本資料',
    description: '漢字注音對照、加速 F4 櫃台快搜（NX01-10）',
    icon: BookOpen,
    statLabel: '字典條目',
    statValue: '—',
    href: '/dashboard/master/phonetic-dictionary',
  },
];

/**
 * 依分區回傳卡片群組（順序固定：帳號 → 產品 → 車型字典 → 組織 → 交易對象 → 系統設定）。
 * 對齊 NX01-16 業界改革 #22「主檔分區範式」、車型字典獨立成第 3 區。
 */
export function getMasterHubSections(): MasterHubSectionGroup[] {
  const map = new Map<MasterHubSectionId, MasterHubCard[]>();
  for (const sid of MASTER_HUB_SECTION_ORDER) {
    map.set(sid, []);
  }
  for (const card of MASTER_HUB_CARDS) {
    map.get(card.section)!.push(card);
  }
  return MASTER_HUB_SECTION_ORDER.map((id) => ({
    id,
    title: MASTER_HUB_SECTION_TITLES[id],
    cards: map.get(id)!,
  }));
}

/** 動態路由 [segment] 允許清單與標題（占位頁用） */
export const BASE_SEGMENT_TITLES: Record<string, string> = {
  // 命名統一（2026-05-27）：全主檔顯示名 = 各頁 config.title 的「○○基本資料」。
  // 例外（非單純主檔，不加後綴）：使用者職務設定 / 使用者據點設定 / 職務權限設定。
  // W6 [3-8] 2026-06-06 品牌合併：brand 為主、car-brand / part-brand 後續軌 deprecate
  user: '使用者基本資料',
  users: '使用者基本資料',
  'user-role': '使用者職務設定',
  'user-warehouse': '使用者據點設定',
  role: '職務基本資料',
  roles: '職務基本資料',
  positions: '職務基本資料',
  // 05 批 T1 2026-06-07：部門主檔（從 nx07 升級到 base）
  department: '部門基本資料',
  departments: '部門基本資料',
  // 05 批 T2 2026-06-07：組主檔（揭露既有 Nx01Team）
  team: '組基本資料',
  teams: '組基本資料',
  // 05 批 T4 2026-06-07：供應商分級半開放
  'supplier-grade': '供應商分級基本資料',
  'supplier-grades': '供應商分級基本資料',
  'role-view': '職務權限設定',
  permissions: '職務權限設定',
  part: '零件基本資料',
  parts: '零件基本資料',
  // W6 [3-8] 2026-06-06 品牌合併：brand 對齊新 Nx01Brand 主檔（雙開關 isCar/isPart）
  brand: '品牌基本資料',
  brands: '品牌基本資料',
  country: '國家基本資料',
  currency: '幣別基本資料',
  'part-group': '零件群組基本資料',
  'brand-code-rule': '品牌料號規則基本資料',
  'part-relation': '零件關聯基本資料',
  'part-model': '料件車型適配基本資料',
  'part-families': '零件群組基本資料',
  site: '據點基本資料',
  location: '庫位基本資料',
  warehouse: '倉庫基本資料',
  warehouses: '倉庫基本資料',
  partner: '往來對象基本資料',
  partners: '往來對象基本資料',
  bulletins: '公告基本資料',
  // 車型字典（NX01-16 業界改革 #22、命名對齊 NX01-13/14/15 spec）
  engine: '引擎基本資料',
  model: '車型基本資料',
  transmission: '變速箱基本資料',
  drivetrain: '傳動方式基本資料',
  'model-type': '車體類型基本資料',
  // 交易對象延伸 & 系統設定延伸（命名對齊 NX01-03 / NX01-10 spec）
  'customer-grade': '客戶分級基本資料',
  'phonetic-dictionary': '注音字典基本資料',
  // 02 對齊第二批 C 軌 CP1：地區主檔
  region: '地區基本資料',
  regions: '地區基本資料',
  // 02 對齊第二批 C 軌 CP2-c：通用件群組
  'part-compat-group': '通用件群組基本資料',
  'part-compat-groups': '通用件群組基本資料',
};

export function isValidBaseSegment(segment: string): boolean {
  return Object.prototype.hasOwnProperty.call(BASE_SEGMENT_TITLES, segment);
}

export function getBaseSegmentTitle(segment: string): string | undefined {
  return BASE_SEGMENT_TITLES[segment];
}
