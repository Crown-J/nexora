// apps/nx-ui/src/features/nx01/shell/master-nav/master-pages.ts
// 2026-06-18 主檔快速入口 metadata（對齊 Hana demo nx-master-spec.js 六大分區 25 個主檔）
//
// 結構：6 大分區 × 各 N 頁
//   - org      組織架構 (4): 員工 / 職務 / 部門 / 組別
//   - perm     權限管理 (2): 組織架構圖 / 職務權限設定
//   - site     據點倉庫 (4): 據點架構圖 / 據點 / 倉庫 / 庫位
//   - partner  往來對象 (4): 對象 / 客戶分級 / 供應商分級 / 供應商供貨對應
//   - product  產品與廠牌 (4): 零件 / 廠牌 / 群組 / 通用件群組
//   - dict     字典主檔 (4): 地區 / 國家 / 幣別 / 注音
//
// disabled=true 代表尚未實作（demo 列出但 UI 還沒做）→ chip 灰色不可點

export type MasterPageCategory = 'org' | 'perm' | 'site' | 'partner' | 'product' | 'dict';

export type MasterPageMeta = {
  id: string;          // demo page id（emp / role / part 等）
  label: string;
  href: string;        // 路由（disabled 時用 '#'）
  category: MasterPageCategory;
  disabled?: boolean;
};

export const MASTER_CATEGORIES: { key: MasterPageCategory; label: string }[] = [
  { key: 'org', label: '組織架構' },
  { key: 'perm', label: '權限管理' },
  { key: 'site', label: '據點倉庫' },
  { key: 'partner', label: '往來對象' },
  { key: 'product', label: '產品與廠牌' },
  { key: 'dict', label: '字典主檔' },
];

export const MASTER_PAGES: MasterPageMeta[] = [
  // org 組織架構
  { id: 'emp', label: '員工', href: '/dashboard/master/users', category: 'org' },
  { id: 'role', label: '職務', href: '/dashboard/master/roles', category: 'org' },
  { id: 'dept', label: '部門', href: '/dashboard/master/department', category: 'org' },
  { id: 'group', label: '組別', href: '/dashboard/master/team', category: 'org' },
  // perm 權限管理
  { id: 'orgchart', label: '組織架構圖', href: '#', category: 'perm', disabled: true },
  { id: 'permmatrix', label: '職務權限', href: '/dashboard/master/role-view', category: 'perm' },
  // site 據點倉庫
  { id: 'sitechart', label: '據點架構圖', href: '#', category: 'site', disabled: true },
  { id: 'sitebase', label: '據點', href: '/dashboard/master/site', category: 'site' },
  { id: 'warehouse', label: '倉庫', href: '/dashboard/master/warehouses', category: 'site' },
  { id: 'bin', label: '庫位', href: '/dashboard/master/location', category: 'site' },
  // partner 往來對象
  { id: 'partner', label: '往來對象', href: '/dashboard/master/partners', category: 'partner' },
  { id: 'custgrade', label: '客戶分級', href: '/dashboard/master/customer-grade', category: 'partner' },
  { id: 'suppgrade', label: '供應商分級', href: '/dashboard/master/supplier-grade', category: 'partner' },
  { id: 'supplymap', label: '供應商供貨對應', href: '/dashboard/master/partner-part', category: 'partner' },
  // product 產品與廠牌
  { id: 'part', label: '零件', href: '/dashboard/master/parts', category: 'product' },
  { id: 'brand', label: '廠牌', href: '/dashboard/master/part-brand', category: 'product' },
  { id: 'partgroup', label: '零件群組', href: '/dashboard/master/part-group', category: 'product' },
  { id: 'univgroup', label: '通用件群組', href: '/dashboard/master/part-compat-group', category: 'product' },
  // dict 字典主檔
  { id: 'region', label: '地區', href: '/dashboard/master/region', category: 'dict' },
  { id: 'country', label: '國家', href: '/dashboard/master/country', category: 'dict' },
  { id: 'currency', label: '幣別', href: '/dashboard/master/currency', category: 'dict' },
  { id: 'zhuyin', label: '注音字典', href: '/dashboard/master/phonetic-dictionary', category: 'dict' },
];

/** 依 currentPath 推算 currentPageId（給 MasterQuickNav highlight 用） */
export function masterPageIdFromPath(pathname: string): string | null {
  const hit = MASTER_PAGES.find((p) => !p.disabled && pathname.startsWith(p.href));
  return hit?.id ?? null;
}
