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
  Shield,
  Package,
  Tags,
  Layers,
  Warehouse,
  Handshake,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type MasterHubCard = {
  id: string;
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

export const MASTER_HUB_CARDS: MasterHubCard[] = [
  {
    id: 'user',
    title: '使用者',
    description: '帳號、聯絡方式與啟用狀態',
    icon: Users,
    statLabel: '啟用帳號',
    statValue: '42 筆',
    href: '/base/user',
  },
  {
    id: 'role',
    title: '職務',
    description: '職稱與職務主檔維護',
    icon: Briefcase,
    statLabel: '職務項目',
    statValue: '—',
    href: '/base/role',
  },
  {
    id: 'role-view',
    title: '權限設定',
    description: '角色與畫面權限矩陣（Role ⇄ View）',
    icon: Shield,
    statLabel: '已套用規則',
    statValue: '—',
    href: '/base/role-view',
  },
  {
    id: 'part',
    title: '零件主檔',
    description: '料號、規格與狀態',
    icon: Package,
    statLabel: '零件筆數',
    statValue: '—',
    href: '/base/part',
  },
  {
    id: 'brand',
    title: '汽車／零件廠牌',
    description: 'OEM／副廠與品牌對照',
    icon: Tags,
    statLabel: '廠牌',
    statValue: '—',
    href: '/base/brand',
  },
  {
    id: 'part-group',
    title: '零件族群主檔',
    description: '族群名稱與料號匹配（廠牌 + seg1～5）',
    icon: Layers,
    statLabel: '族群',
    statValue: '—',
    href: '/base/part-group',
  },
  {
    id: 'warehouse-location',
    title: '倉庫及庫位',
    description: '倉別設定與儲位結構',
    icon: Warehouse,
    statLabel: '倉／庫位',
    statValue: '—',
    href: '/base/location',
  },
  {
    id: 'partner',
    title: '廠商與客戶',
    description: '供應商、客戶與往來標籤',
    icon: Handshake,
    statLabel: '往來對象',
    statValue: '—',
    href: '/base/partner',
  },
];

/** 動態路由 [segment] 允許清單與標題（占位頁用） */
export const BASE_SEGMENT_TITLES: Record<string, string> = {
  user: '使用者',
  users: '使用者',
  'user-role': '使用者職位設定',
  role: '職務',
  positions: '職務',
  'role-view': '權限設定',
  permissions: '權限設定',
  part: '零件主檔',
  parts: '零件主檔',
  brand: '廠牌主檔',
  brands: '汽車／零件廠牌',
  'part-group': '零件族群主檔',
  'part-families': '零件族群主檔',
  location: '倉庫主檔',
  warehouse: '倉庫',
  partner: '廠商與客戶',
  partners: '廠商與客戶',
};

export function isValidBaseSegment(segment: string): boolean {
  return Object.prototype.hasOwnProperty.call(BASE_SEGMENT_TITLES, segment);
}

export function getBaseSegmentTitle(segment: string): string | undefined {
  return BASE_SEGMENT_TITLES[segment];
}
