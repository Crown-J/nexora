// apps/nx-ui/src/features/nx01/shell/master-nav/master-pages.ts
// 2026-06-27：改為從單一來源 master-registry 衍生（dock 快速選單）。
// 既有 export（MASTER_PAGES / MASTER_CATEGORIES / masterPageIdFromPath / categoryOfPageId）形狀不變、消費端不動。
import type { LucideIcon } from 'lucide-react';

import {
  MASTER_CATEGORY_DEFS,
  masterEntriesForSurface,
  type MasterCategoryKey,
} from './master-registry';

export type MasterPageCategory = MasterCategoryKey;

export type MasterPageMeta = {
  id: string;
  label: string;
  href: string;
  category: MasterPageCategory;
  icon: LucideIcon;
  disabled?: boolean;
};

export const MASTER_CATEGORIES: { key: MasterPageCategory; label: string }[] = MASTER_CATEGORY_DEFS;

export const MASTER_PAGES: MasterPageMeta[] = masterEntriesForSurface('dock').map((e) => ({
  id: e.id,
  label: e.label,
  href: e.href,
  category: e.category,
  icon: e.icon,
}));

/** 依 currentPath 推算 currentPageId（給 MasterQuickNav highlight 用） */
export function masterPageIdFromPath(pathname: string): string | null {
  const hit = MASTER_PAGES.find((p) => !p.disabled && pathname.startsWith(p.href));
  return hit?.id ?? null;
}

/** 取得指定 pageId 所屬分區 key */
export function categoryOfPageId(pageId: string | null | undefined): MasterPageCategory | null {
  if (!pageId) return null;
  return MASTER_PAGES.find((p) => p.id === pageId)?.category ?? null;
}
