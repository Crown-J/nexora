/**
 * File: apps/nx-ui/src/features/base/config/master-cards.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 主檔中心 hub 卡片 metadata（摘要數字由 page 以 API total 覆寫）
 */

import {
  Users,
  Briefcase,
  UserCog,
  MapPin,
  Shield,
  Package,
  Tags,
  Layers,
  Warehouse,
  Handshake,
  Globe,
  CircleDollarSign,
  SlidersHorizontal,
  Link2,
  CarFront,
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

/** 主檔中心雙入口卡：頂部以圖示進子頁，仍保留 label 供 aria／快捷列 */
export type MasterHubCardLink = {
  label: string;
  href: string;
  entryIcon: LucideIcon;
};

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
  /** 整卡點擊導向（與 links 擇一） */
  href?: string;
  /** 倉庫／庫位等複數入口 */
  links?: MasterHubCardLink[];
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
    title: '使用者',
    description: '帳號、聯絡方式與啟用狀態',
    icon: Users,
    statLabel: '啟用帳號',
    statValue: '42 筆',
    href: '/dashboard/base/users',
  },
  {
    id: 'role',
    section: 'account',
    title: '職務主檔',
    description: '職務代碼、名稱與啟用狀態',
    icon: Briefcase,
    statLabel: '職務項目',
    statValue: '—',
    href: '/dashboard/base/roles',
  },
  {
    id: 'user-role',
    section: 'account',
    title: '使用者職務設定',
    description: '依職務匯入或移除隸屬使用者',
    icon: UserCog,
    statLabel: '關聯筆數',
    statValue: '—',
    href: '/dashboard/base/user-role',
  },
  {
    id: 'user-warehouse',
    section: 'account',
    title: '使用者據點設定',
    description: '依倉庫據點匯入或移除隸屬使用者',
    icon: MapPin,
    statLabel: '關聯筆數',
    statValue: '—',
    href: '/dashboard/base/user-warehouse',
  },
  {
    id: 'role-view',
    section: 'account',
    title: '職務權限設定',
    description: '角色與畫面權限矩陣（Role ⇄ View）',
    icon: Shield,
    statLabel: '已套用規則',
    statValue: '—',
    href: '/dashboard/base/role-view',
  },
  {
    id: 'bulletin',
    section: 'system',
    title: '公告主檔',
    description: '系統／公司公告與到期設定',
    icon: Megaphone,
    statLabel: '公告',
    statValue: '—',
    href: '/dashboard/base/bulletins',
  },
  {
    id: 'part',
    section: 'product',
    title: '零件主檔',
    description: '料號、規格與狀態',
    icon: Package,
    statLabel: '零件筆數',
    statValue: '—',
    href: '/dashboard/base/parts',
  },
  {
    id: 'brand-masters',
    section: 'product',
    title: '汽車／零件廠牌',
    description: '廠牌代碼、名稱、國家、備註與啟用狀態',
    icon: Tags,
    statLabel: '廠牌筆數',
    statValue: '—',
    links: [
      { label: '汽車廠牌', href: '/dashboard/base/car-brand', entryIcon: CarFront },
      { label: '零件廠牌', href: '/dashboard/base/part-brand', entryIcon: Tags },
    ],
  },
  {
    id: 'part-group',
    section: 'product',
    title: '零件族群主檔',
    description: '族群名稱與料號匹配（廠牌 + seg1～5）',
    icon: Layers,
    statLabel: '族群',
    statValue: '—',
    href: '/dashboard/base/part-group',
  },
  {
    id: 'brand-code-rule',
    section: 'product',
    minPlan: 'PLUS',
    title: '品牌料號規則',
    description: '依零件品牌的 seg 長度與排列（nx00_brand_code_rule）',
    icon: SlidersHorizontal,
    statLabel: '規則',
    statValue: '—',
    href: '/dashboard/base/brand-code-rule',
  },
  {
    id: 'part-relation',
    section: 'product',
    minPlan: 'PLUS',
    title: '零件關聯',
    description: '改號／同款／組合包等零件關係',
    icon: Link2,
    statLabel: '關聯',
    statValue: '—',
    href: '/dashboard/base/part-relation',
  },
  {
    id: 'part-model',
    section: 'product',
    minPlan: 'PLUS',
    title: '料件車型適配',
    description: '料件 ↔ 車型適配（原廠／副廠等效／通用替代）',
    icon: Link2,
    statLabel: '適配',
    statValue: '—',
    href: '/dashboard/base/part-model',
  },
  {
    id: 'country',
    section: 'system',
    title: '國家主檔',
    description: '國家代碼與名稱（產地／廠牌國家）',
    icon: Globe,
    statLabel: '國家',
    statValue: '—',
    href: '/dashboard/base/country',
  },
  {
    id: 'currency',
    section: 'system',
    title: '幣別主檔',
    description: '幣別代碼、符號與小數位數',
    icon: CircleDollarSign,
    statLabel: '幣別',
    statValue: '—',
    href: '/dashboard/base/currency',
  },
  {
    id: 'warehouse-location',
    section: 'organization',
    title: '倉庫及庫位',
    description: '倉別設定與儲位結構',
    icon: Warehouse,
    statLabel: '倉／庫位',
    statValue: '—',
    links: [
      { label: '倉庫主檔', href: '/dashboard/base/warehouses', entryIcon: Warehouse },
      { label: '庫位主檔', href: '/dashboard/base/location', entryIcon: MapPin },
    ],
  },
  {
    id: 'partner',
    section: 'partner',
    title: '客戶主檔',
    description: '客戶類型、聯絡方式與啟用狀態',
    icon: Handshake,
    statLabel: '客戶',
    statValue: '—',
    href: '/dashboard/base/partners',
  },
  // ─── 車型字典（NX01-16 業界改革 #22、PLUS 起開放）─────────────────
  {
    id: 'engine',
    section: 'vehicle',
    minPlan: 'PLUS',
    title: '引擎主檔',
    description: '引擎代碼、排氣量與燃料型式',
    icon: Cog,
    statLabel: '引擎',
    statValue: '—',
    href: '/dashboard/base/engine',
  },
  {
    id: 'model',
    section: 'vehicle',
    minPlan: 'PLUS',
    title: '車型主檔',
    description: '車廠 × 車系 × 年式組合與規格摘要',
    icon: Car,
    statLabel: '車型',
    statValue: '—',
    href: '/dashboard/base/model',
  },
  {
    id: 'transmission',
    section: 'vehicle',
    minPlan: 'PLUS',
    title: '變速箱型錄',
    description: '自手排／CVT／DCT 等變速箱類型代碼（NX01-15）',
    icon: Settings2,
    statLabel: '變速箱',
    statValue: '—',
    href: '/dashboard/base/transmission',
  },
  {
    id: 'drivetrain',
    section: 'vehicle',
    minPlan: 'PLUS',
    title: '傳動方式型錄',
    description: 'FF／FR／4WD／AWD 傳動配置代碼（NX01-15）',
    icon: Wrench,
    statLabel: '傳動',
    statValue: '—',
    href: '/dashboard/base/drivetrain',
  },
  {
    id: 'model-type',
    section: 'vehicle',
    minPlan: 'PLUS',
    title: '車體類型型錄',
    description: '轎車／掀背／休旅／旅行／跑車等大類分群（NX01-15）',
    icon: LayoutGrid,
    statLabel: '類型',
    statValue: '—',
    href: '/dashboard/base/model-type',
  },
  // ─── 交易對象延伸（客戶等級、PLUS）────────────────────────────────
  {
    id: 'customer-grade',
    section: 'partner',
    minPlan: 'PLUS',
    title: '客戶等級主檔',
    description: '依交易額／信用條件分級，影響定價與付款條件',
    icon: Award,
    statLabel: '等級',
    statValue: '—',
    href: '/dashboard/base/customer-grade',
  },
  // ─── 系統設定延伸（注音字典、PRO）─────────────────────────────────
  {
    id: 'phonetic-dictionary',
    section: 'system',
    minPlan: 'PRO',
    title: '注音字典',
    description: '漢字注音對照、加速 F4 櫃台快搜（NX01-10、PRO 限定）',
    icon: BookOpen,
    statLabel: '字典條目',
    statValue: '—',
    href: '/dashboard/base/phonetic-dictionary',
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
  user: '使用者',
  users: '使用者',
  'user-role': '使用者職務設定',
  'user-warehouse': '使用者據點設定',
  role: '職務',
  roles: '職務主檔',
  positions: '職務主檔',
  'role-view': '職務權限設定',
  permissions: '職務權限設定',
  part: '零件主檔',
  parts: '零件主檔',
  brand: '廠牌主檔',
  brands: '汽車／零件廠牌',
  country: '國家主檔',
  currency: '幣別主檔',
  'part-group': '零件族群主檔',
  'brand-code-rule': '品牌料號規則',
  'part-relation': '零件關聯',
  'part-model': '料件車型適配',
  'part-families': '零件族群主檔',
  location: '庫位主檔',
  warehouse: '倉庫主檔',
  warehouses: '倉庫主檔',
  partner: '客戶主檔',
  partners: '客戶主檔',
  bulletins: '公告主檔',
  // 車型字典（NX01-16 業界改革 #22、命名對齊 NX01-13/14/15 spec）
  engine: '引擎主檔',
  model: '車型主檔',
  transmission: '變速箱型錄',
  drivetrain: '傳動方式型錄',
  'model-type': '車體類型型錄',
  // 交易對象延伸 & 系統設定延伸（命名對齊 NX01-03 / NX01-10 spec）
  'customer-grade': '客戶等級主檔',
  'phonetic-dictionary': '注音字典',
};

export function isValidBaseSegment(segment: string): boolean {
  return Object.prototype.hasOwnProperty.call(BASE_SEGMENT_TITLES, segment);
}

export function getBaseSegmentTitle(segment: string): string | undefined {
  return BASE_SEGMENT_TITLES[segment];
}
