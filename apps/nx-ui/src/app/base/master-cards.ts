/**
 * File: apps/nx-ui/src/app/base/master-cards.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - /base 主檔 hub 卡片 metadata（摘要數字由 page 以 API total 覆寫）
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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** 主檔 hub 分區（同區卡片排在一起，避免找功能時跳來跳去） */
export type MasterHubSectionId = 'account' | 'product' | 'geo' | 'warehouse' | 'partner';

export type MasterHubCard = {
  id: string;
  /** 主檔總覽上的分組 */
  section: MasterHubSectionId;
  title: string;
  description: string;
  icon: LucideIcon;
  statLabel: string;
  statValue: string;
  /** 整卡點擊導向（與 links 擇一） */
  href?: string;
  /** 倉庫／庫位等複數入口 */
  links?: { label: string; href: string }[];
};

const MASTER_HUB_SECTION_ORDER: MasterHubSectionId[] = ['account', 'product', 'geo', 'warehouse', 'partner'];

const MASTER_HUB_SECTION_TITLES: Record<MasterHubSectionId, string> = {
  account: '帳號與權限',
  product: '產品與料號',
  geo: '國家與幣別',
  warehouse: '倉儲',
  partner: '往來對象',
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
    href: '/base/user',
  },
  {
    id: 'role',
    section: 'account',
    title: '職務主檔',
    description: '職務代碼、名稱與啟用狀態',
    icon: Briefcase,
    statLabel: '職務項目',
    statValue: '—',
    href: '/base/role',
  },
  {
    id: 'user-role',
    section: 'account',
    title: '使用者職務設定',
    description: '依職務匯入或移除隸屬使用者',
    icon: UserCog,
    statLabel: '關聯筆數',
    statValue: '—',
    href: '/base/user-role',
  },
  {
    id: 'user-warehouse',
    section: 'account',
    title: '使用者據點設定',
    description: '依倉庫據點匯入或移除隸屬使用者',
    icon: MapPin,
    statLabel: '關聯筆數',
    statValue: '—',
    href: '/base/user-warehouse',
  },
  {
    id: 'role-view',
    section: 'account',
    title: '職務權限設定',
    description: '角色與畫面權限矩陣（Role ⇄ View）',
    icon: Shield,
    statLabel: '已套用規則',
    statValue: '—',
    href: '/base/role-view',
  },
  {
    id: 'part',
    section: 'product',
    title: '零件主檔',
    description: '料號、規格與狀態',
    icon: Package,
    statLabel: '零件筆數',
    statValue: '—',
    href: '/base/part',
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
      { label: '汽車廠牌', href: '/base/car-brand' },
      { label: '零件廠牌', href: '/base/part-brand' },
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
    href: '/base/part-group',
  },
  {
    id: 'brand-code-rule',
    section: 'product',
    title: '品牌料號規則',
    description: '依零件品牌的 seg 長度與排列（nx00_brand_code_rule）',
    icon: SlidersHorizontal,
    statLabel: '規則',
    statValue: '—',
    href: '/base/brand-code-rule',
  },
  {
    id: 'part-relation',
    section: 'product',
    title: '零件關聯',
    description: '改號／同款／組合包等零件關係',
    icon: Link2,
    statLabel: '關聯',
    statValue: '—',
    href: '/base/part-relation',
  },
  {
    id: 'country',
    section: 'geo',
    title: '國家主檔',
    description: '國家代碼與名稱（產地／廠牌國家）',
    icon: Globe,
    statLabel: '國家',
    statValue: '—',
    href: '/base/country',
  },
  {
    id: 'currency',
    section: 'geo',
    title: '幣別主檔',
    description: '幣別代碼、符號與小數位數',
    icon: CircleDollarSign,
    statLabel: '幣別',
    statValue: '—',
    href: '/base/currency',
  },
  {
    id: 'warehouse-location',
    section: 'warehouse',
    title: '倉庫及庫位',
    description: '倉別設定與儲位結構',
    icon: Warehouse,
    statLabel: '倉／庫位',
    statValue: '—',
    links: [
      { label: '倉庫主檔', href: '/base/warehouse' },
      { label: '庫位主檔', href: '/base/location' },
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
    href: '/base/partner',
  },
];

/**
 * 依分區回傳卡片群組（順序固定：帳號→產品→國家幣別→倉儲→往來）
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
  positions: '職務',
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
  'part-families': '零件族群主檔',
  location: '庫位主檔',
  warehouse: '倉庫主檔',
  partner: '客戶主檔',
  partners: '客戶主檔',
};

export function isValidBaseSegment(segment: string): boolean {
  return Object.prototype.hasOwnProperty.call(BASE_SEGMENT_TITLES, segment);
}

export function getBaseSegmentTitle(segment: string): string | undefined {
  return BASE_SEGMENT_TITLES[segment];
}
