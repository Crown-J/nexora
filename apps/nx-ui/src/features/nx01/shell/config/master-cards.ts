/**
 * File: apps/nx-ui/src/features/base/config/master-cards.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 主檔中心 hub 卡片 metadata（摘要數字由 page 以 API total 覆寫）
 * - 2026-06-27：卡片資料改從單一來源 master-registry 衍生；本檔只留型別 + 版本判定 helper + 動態路由標題。
 */

import type { LucideIcon } from 'lucide-react';

import {
  MASTER_CATEGORY_DEFS,
  masterEntriesForSurface,
  type MasterCategoryKey,
} from '@/features/nx01/shell/master-nav/master-registry';

// 2026-06-27：分區統一為登錄表的六大類（org/perm/site/partner/product/dict）
export type MasterHubSectionId = MasterCategoryKey;

/**
 * 版本門檻（NEXORA 三版本可見性策略、業界改革 #22）。
 * - 未指定 / 'LITE'：所有版本均可見且可入
 * - 'PLUS'：LITE 版灰階展示、Upgrade prompt；PLUS／PRO 完整入
 * - 'PRO'：LITE／PLUS 版灰階展示、Upgrade prompt；PRO 完整入
 *
 * 注意：本欄純 UX 引導、非 backend security gate。
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
  /** 卡片點擊導向（一卡一概念） */
  href: string;
};

export const MASTER_HUB_SECTION_ORDER: MasterHubSectionId[] = MASTER_CATEGORY_DEFS.map((c) => c.key);

export const MASTER_HUB_SECTION_TITLES: Record<MasterHubSectionId, string> =
  MASTER_CATEGORY_DEFS.reduce(
    (acc, c) => {
      acc[c.key] = c.label;
      return acc;
    },
    {} as Record<MasterHubSectionId, string>,
  );

export type MasterHubSectionGroup = {
  id: MasterHubSectionId;
  title: string;
  cards: MasterHubCard[];
};

// 2026-06-27：卡片從登錄表 surfaces 含 'hub' 的主檔衍生（statValue 由各頁以 API total 覆寫）
export const MASTER_HUB_CARDS: MasterHubCard[] = masterEntriesForSurface('hub').map((e) => ({
  id: e.id,
  section: e.category,
  minPlan: e.minPlan,
  title: e.label,
  description: e.description ?? '',
  icon: e.icon,
  statLabel: e.statLabel ?? '',
  statValue: '—',
  href: e.href,
}));

/** 依分區回傳卡片群組（順序＝六大類定義順序） */
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
  })).filter((g) => g.cards.length > 0);
}

/** 動態路由 [segment] 允許清單與標題（占位頁用） */
export const BASE_SEGMENT_TITLES: Record<string, string> = {
  // 命名統一（2026-05-27）：全主檔顯示名 = 各頁 config.title 的「○○基本資料」。
  user: '使用者基本資料',
  users: '使用者基本資料',
  'user-role': '使用者職務設定',
  'user-warehouse': '使用者據點設定',
  role: '職務基本資料',
  roles: '職務基本資料',
  positions: '職務基本資料',
  department: '部門基本資料',
  departments: '部門基本資料',
  team: '組基本資料',
  teams: '組基本資料',
  'supplier-grade': '供應商分級基本資料',
  'supplier-grades': '供應商分級基本資料',
  'role-view': '職務權限設定',
  permissions: '職務權限設定',
  part: '零件基本資料',
  parts: '零件基本資料',
  brand: '品牌基本資料',
  brands: '品牌基本資料',
  country: '國家基本資料',
  currency: '幣別基本資料',
  'part-group': '零件群組基本資料',
  'part-relation': '零件關聯基本資料',
  'part-kit': '組合／拆解組件關係',
  'part-model': '料件車型適配基本資料',
  'part-families': '零件群組基本資料',
  site: '據點基本資料',
  location: '庫位基本資料',
  warehouse: '倉庫基本資料',
  warehouses: '倉庫基本資料',
  partner: '往來對象基本資料',
  partners: '往來對象基本資料',
  bulletins: '公告基本資料',
  model: '車型基本資料',
  'customer-grade': '客戶分級基本資料',
  'phonetic-dictionary': '注音字典基本資料',
  region: '地區基本資料',
  regions: '地區基本資料',
  'part-compat-group': '通用件群組基本資料',
  'part-compat-groups': '通用件群組基本資料',
};

export function isValidBaseSegment(segment: string): boolean {
  return Object.prototype.hasOwnProperty.call(BASE_SEGMENT_TITLES, segment);
}

export function getBaseSegmentTitle(segment: string): string | undefined {
  return BASE_SEGMENT_TITLES[segment];
}
