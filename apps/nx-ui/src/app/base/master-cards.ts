/**
 * File: apps/nx-ui/src/app/base/master-cards.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - /base 主檔 hub 卡片測試資料與 segment 對照（不接 API）
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
    id: 'users',
    title: '使用者',
    description: '帳號、聯絡方式與啟用狀態',
    icon: Users,
    statLabel: '啟用帳號',
    statValue: '42 筆',
    href: '/base/users',
  },
  {
    id: 'positions',
    title: '職務',
    description: '職稱與職務主檔維護',
    icon: Briefcase,
    statLabel: '職務項目',
    statValue: '12 筆',
    href: '/base/positions',
  },
  {
    id: 'permissions',
    title: '權限設定',
    description: '功能與資料範圍授權',
    icon: Shield,
    statLabel: '已套用規則',
    statValue: '8 組',
    href: '/base/permissions',
  },
  {
    id: 'parts',
    title: '零件主檔',
    description: '料號、規格與狀態',
    icon: Package,
    statLabel: '零件筆數',
    statValue: '1,284 筆',
    href: '/base/parts',
  },
  {
    id: 'brands',
    title: '汽車／零件廠牌',
    description: 'OEM／副廠與品牌對照',
    icon: Tags,
    statLabel: '廠牌',
    statValue: '56 筆',
    href: '/base/brands',
  },
  {
    id: 'part-families',
    title: '零件族群主檔',
    description: '分類樹與套用規則',
    icon: Layers,
    statLabel: '族群',
    statValue: '24 筆',
    href: '/base/part-families',
  },
  {
    id: 'warehouse-location',
    title: '倉庫及庫位',
    description: '倉別設定與儲位結構',
    icon: Warehouse,
    statLabel: '倉別',
    statValue: '3 倉',
    links: [
      { label: '倉庫', href: '/base/warehouse' },
      { label: '庫位', href: '/base/location' },
    ],
  },
  {
    id: 'partners',
    title: '廠商與客戶',
    description: '供應商、客戶與往來標籤',
    icon: Handshake,
    statLabel: '往來對象',
    statValue: '318 筆',
    href: '/base/partners',
  },
];

/** 動態路由 [segment] 允許清單與標題（占位頁用） */
export const BASE_SEGMENT_TITLES: Record<string, string> = {
  users: '使用者',
  positions: '職務',
  permissions: '權限設定',
  parts: '零件主檔',
  brands: '汽車／零件廠牌',
  'part-families': '零件族群主檔',
  warehouse: '倉庫',
  location: '庫位',
  partners: '廠商與客戶',
};

export function isValidBaseSegment(segment: string): boolean {
  return Object.prototype.hasOwnProperty.call(BASE_SEGMENT_TITLES, segment);
}

export function getBaseSegmentTitle(segment: string): string | undefined {
  return BASE_SEGMENT_TITLES[segment];
}
