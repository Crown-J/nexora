// apps/nx-ui/src/features/nx01/shell/master-nav/master-registry.ts
// 2026-06-27：主檔導覽「單一來源（SSOT）」。
// 全站 4 個主檔導覽介面（dock 快速選單 / 主檔中心卡片 / 側選單 / 首頁 DOCK_NAV）
// 一律從這份登錄表衍生：新增/刪除/改分類只改這裡，4 個畫面自動一致。
//
// 分類：六大類（對齊 模組架構總覽 v3.0、dock + 首頁原本就用這套）
//   org 組織架構 / perm 權限管理 / site 據點倉庫 / partner 往來對象 / product 產品與廠牌 / dict 字典主檔
//
// surfaces：此主檔要出現在哪些介面（各介面精選程度不同）
//   dock = dock 快速選單(MasterQuickNav) / hub = 主檔中心卡片 / side = 側選單 / home = 首頁 DOCK_NAV
import {
  Award,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  Car,
  CircleDollarSign,
  Combine,
  GitBranch,
  GitMerge,
  Globe,
  Handshake,
  Layers,
  Link2,
  MapPin,
  Megaphone,
  Network,
  Package,
  Shield,
  Tags,
  UserCog,
  Users,
  UsersRound,
  Warehouse as WarehouseIcon,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export type MasterCategoryKey = 'org' | 'perm' | 'site' | 'partner' | 'product' | 'dict';
export type MasterSurface = 'dock' | 'hub' | 'side' | 'home';
export type MasterPlanTier = 'LITE' | 'PLUS' | 'PRO';

export const MASTER_CATEGORY_DEFS: { key: MasterCategoryKey; label: string }[] = [
  { key: 'org', label: '組織架構' },
  { key: 'perm', label: '權限管理' },
  { key: 'site', label: '據點倉庫' },
  { key: 'partner', label: '往來對象' },
  { key: 'product', label: '產品與廠牌' },
  { key: 'dict', label: '字典主檔' },
];

export type MasterRegistryEntry = {
  /** 穩定鍵（各介面 highlight / 對照用） */
  id: string;
  label: string;
  href: string;
  category: MasterCategoryKey;
  /** lucide 元件（dock / hub / side 用） */
  icon: LucideIcon;
  /** 字串 icon 名（首頁 DOCK_NAV 用、對齊既有 icon-name 對照） */
  iconKey: string;
  /** 出現在哪些介面 */
  surfaces: MasterSurface[];
  /** 版本門檻（未填＝全版本） */
  minPlan?: MasterPlanTier;
  /** 主檔中心卡片用：統計標籤 / 描述 */
  statLabel?: string;
  description?: string;
};

// 註：car-brand / part-brand 已於 W6 品牌合併、不列入（舊側選單殘留連結一併由本表清除）。
export const MASTER_REGISTRY: MasterRegistryEntry[] = [
  // ───── org 組織架構 ─────
  { id: 'users', label: '使用者基本資料', href: '/dashboard/master/users', category: 'org', icon: Users, iconKey: 'user-square', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '啟用帳號', description: '帳號、聯絡方式與啟用狀態' },
  { id: 'roles', label: '職務基本資料', href: '/dashboard/master/roles', category: 'org', icon: Briefcase, iconKey: 'briefcase', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '職務項目', description: '職務代碼、名稱與啟用狀態' },
  { id: 'department', label: '部門基本資料', href: '/dashboard/master/department', category: 'org', icon: Building2, iconKey: 'building', surfaces: ['dock', 'hub', 'home'], statLabel: '部門', description: '部門代碼、名稱與啟用狀態' },
  { id: 'team', label: '組基本資料', href: '/dashboard/master/team', category: 'org', icon: UsersRound, iconKey: 'users', surfaces: ['dock', 'hub', 'home'], statLabel: '組', description: '組代碼、名稱、隸屬部門與上層組' },

  // ───── perm 權限管理 ─────
  { id: 'org-structure', label: '組織架構圖', href: '/dashboard/master/org-structure', category: 'perm', icon: Network, iconKey: 'network', surfaces: ['dock', 'hub', 'home'], statLabel: '節點數', description: '部門 → 組別／職務 → 使用者 雙分支樹' },
  { id: 'role-view', label: '職務權限設定', href: '/dashboard/master/role-view', category: 'perm', icon: Shield, iconKey: 'shield-check', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '已套用規則', description: '角色與畫面權限矩陣（Role ⇄ View）' },

  // ───── site 據點倉庫 ─────
  { id: 'location-structure', label: '據點架構圖', href: '/dashboard/master/location-structure', category: 'site', icon: GitBranch, iconKey: 'network', surfaces: ['dock', 'hub', 'home'], statLabel: '節點數', description: '據點 → 倉庫 → 庫位 三層結構' },
  { id: 'site', label: '據點基本資料', href: '/dashboard/master/site', category: 'site', icon: MapPin, iconKey: 'map-pin', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '據點', description: '公司物理分點（倉庫之上一層）' },
  { id: 'warehouses', label: '倉庫基本資料', href: '/dashboard/master/warehouses', category: 'site', icon: WarehouseIcon, iconKey: 'warehouse', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '倉庫', description: '倉別代碼、據點與啟用狀態' },
  { id: 'location', label: '庫位基本資料', href: '/dashboard/master/location', category: 'site', icon: Boxes, iconKey: 'package-open', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '庫位', description: '倉庫內的物理位置（區／架／層／格）' },

  // ───── partner 往來對象 ─────
  { id: 'partners', label: '往來對象基本資料', href: '/dashboard/master/partners', category: 'partner', icon: Handshake, iconKey: 'handshake', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '交易對象', description: '六分類：C 保養廠 / O 同行 / S 供應商 / T 外包物流 / B 銀行 / V 一般廠商' },
  { id: 'customer-grade', label: '客戶分級基本資料', href: '/dashboard/master/customer-grade', category: 'partner', icon: Award, iconKey: 'crown', surfaces: ['dock', 'hub', 'home'], statLabel: '等級', description: '依交易額／信用條件分級，影響定價與付款條件' },
  { id: 'supplier-grade', label: '供應商分級基本資料', href: '/dashboard/master/supplier-grade', category: 'partner', icon: Award, iconKey: 'award', surfaces: ['dock', 'hub', 'home'], statLabel: '等級', description: '純評等標籤（A/B/C/D 內建 + 客戶可加自訂）' },
  { id: 'supplier-supply', label: '供應商供貨對應', href: '/dashboard/master/supplier-supply', category: 'partner', icon: GitMerge, iconKey: 'link', surfaces: ['dock', 'side', 'home'], description: '供應商 ↔ 供貨品牌對應' },

  // ───── product 產品與廠牌 ─────
  { id: 'parts', label: '零件基本資料', href: '/dashboard/master/parts', category: 'product', icon: Package, iconKey: 'box', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '零件筆數', description: '料號、規格與狀態' },
  { id: 'brand', label: '品牌基本資料', href: '/dashboard/master/brand', category: 'product', icon: Tags, iconKey: 'tag', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '品牌', description: '汽車品牌 + 零件廠牌雙開關（isCar/isPart 合表）' },
  { id: 'part-group', label: '零件群組基本資料', href: '/dashboard/master/part-group', category: 'product', icon: Layers, iconKey: 'layers', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '族群', description: '客戶自定義零件族群（分類三）' },
  { id: 'universal-group', label: '通用件群組', href: '/dashboard/master/universal-group', category: 'product', icon: Combine, iconKey: 'combine', surfaces: ['dock', 'hub', 'home'], statLabel: '群組', description: '全互換群（群組成員互相通用、用料號搜尋找群組）' },
  { id: 'part-relation', label: '零件關聯基本資料', href: '/dashboard/master/part-relation', category: 'product', icon: Link2, iconKey: 'link', surfaces: ['dock', 'hub', 'side'], minPlan: 'PLUS', statLabel: '關聯', description: '單向替代（副廠一件替代多個不互通正廠）' },
  { id: 'part-kit', label: '組合／拆解組件關係', href: '/dashboard/master/part-kit', category: 'product', icon: Boxes, iconKey: 'boxes', surfaces: ['dock', 'hub', 'side'], minPlan: 'PLUS', statLabel: '組件', description: '整體件 ＝ 一組組件（含數量）：正廠總成↔副廠多件' },
  { id: 'part-model', label: '料件車型適配基本資料', href: '/dashboard/master/part-model', category: 'product', icon: Workflow, iconKey: 'workflow', surfaces: ['dock', 'hub', 'side'], minPlan: 'PLUS', statLabel: '適配', description: '料件 ↔ 車型適配（原廠／副廠等效／通用替代）' },
  { id: 'model', label: '車型基本資料', href: '/dashboard/master/model', category: 'product', icon: Car, iconKey: 'car', surfaces: ['dock', 'hub'], minPlan: 'PLUS', statLabel: '車型', description: '車廠 × 車系 × 年式、引擎代碼與排氣量自由輸入' },
  { id: 'discount-code', label: '折扣代碼', href: '/dashboard/master/discount-code', category: 'product', icon: CircleDollarSign, iconKey: 'percent', surfaces: ['side'], description: '銷貨優惠折扣代碼（業務員自助管理）' },

  // ───── dict 字典主檔 ─────
  { id: 'region', label: '地區基本資料', href: '/dashboard/master/region', category: 'dict', icon: MapPin, iconKey: 'map', surfaces: ['dock', 'hub', 'home'], statLabel: '地區', description: '客戶分區下拉、純展示分類、不影響 partner 編號' },
  { id: 'country', label: '國家基本資料', href: '/dashboard/master/country', category: 'dict', icon: Globe, iconKey: 'flag', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '國家', description: '國家代碼與名稱（產地／廠牌國家）' },
  { id: 'currency', label: '幣別基本資料', href: '/dashboard/master/currency', category: 'dict', icon: CircleDollarSign, iconKey: 'coins', surfaces: ['dock', 'hub', 'side', 'home'], statLabel: '幣別', description: '幣別代碼、符號與小數位數' },
  { id: 'phonetic-dictionary', label: '注音字典基本資料', href: '/dashboard/master/phonetic-dictionary', category: 'dict', icon: BookOpen, iconKey: 'book-open', surfaces: ['dock', 'hub', 'home'], statLabel: '字典條目', description: '漢字注音對照、加速櫃台快搜' },
  // ⚠️ 公告非典型主檔、暫歸字典主檔（僅 hub/side 顯示）；執行長可日後再 re-home
  { id: 'bulletin', label: '公告基本資料', href: '/dashboard/master/bulletins', category: 'dict', icon: Megaphone, iconKey: 'megaphone', surfaces: ['hub', 'side'], statLabel: '公告', description: '系統／公司公告與到期設定' },
];

/** 取某介面要顯示的主檔（保留登錄表順序） */
export function masterEntriesForSurface(surface: MasterSurface): MasterRegistryEntry[] {
  return MASTER_REGISTRY.filter((e) => e.surfaces.includes(surface));
}

/** 取某介面的主檔、依六大分類分組（保留分類順序與登錄表內順序） */
export function masterEntriesByCategory(
  surface: MasterSurface,
): { key: MasterCategoryKey; label: string; entries: MasterRegistryEntry[] }[] {
  const entries = masterEntriesForSurface(surface);
  return MASTER_CATEGORY_DEFS.map((c) => ({
    key: c.key,
    label: c.label,
    entries: entries.filter((e) => e.category === c.key),
  })).filter((g) => g.entries.length > 0);
}
