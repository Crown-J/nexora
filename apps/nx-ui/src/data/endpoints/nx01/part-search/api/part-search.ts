// apps/nx-ui/src/data/endpoints/nx01/part-search/api/part-search.ts
// F2 料號即時搜尋 API client（對應 apps/nx-api/src/nx01/part-search/part-search.controller.ts）
import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';
import { buildQueryString } from '@data/api/query';

import type {
  PartCompatGroupResult,
  PartDetailDto,
  PartModelRow,
  PartPurchaseHistoryRow,
  PartRelatedRow,
  PartSalesHistoryDto,
  PartSearchQuery,
  PartSearchResult,
  PartStockHistoryRow,
  PartStockSettingRow,
  PartStockSummaryDto,
} from '@data/types/nx01/part-search';

const BASE = '/nx01/part-search';

export type PartSearchMasterOption = { id: string; code: string; name: string };
export type PartSearchMasterOptions = {
  brands: PartSearchMasterOption[];
  partGroups: PartSearchMasterOption[];
};

/** 廠牌+族群主檔（F2 Combobox 聯想下拉用、全公司可用）*/
export async function getPartSearchMasterOptions(): Promise<PartSearchMasterOptions> {
  const res = await apiFetch(`${BASE}/master-options`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_master_options');
  return (await res.json()) as PartSearchMasterOptions;
}

export async function quickSearchParts(q: PartSearchQuery): Promise<PartSearchResult> {
  const qs = buildQueryString({
    brandId: q.brandId?.trim() || undefined,
    brandQuery: q.brandQuery?.trim() || undefined,
    partGroupId: q.partGroupId?.trim() || undefined,
    partGroupQuery: q.partGroupQuery?.trim() || undefined,
    modelQuery: q.modelQuery?.trim() || undefined,
    techCategory: q.techCategory !== undefined ? String(q.techCategory) : undefined,
    purchaseCategory: q.purchaseCategory !== undefined ? String(q.purchaseCategory) : undefined,
    keyword: q.keyword?.trim() || undefined,
    partNo: q.partNo?.trim() || undefined,
    includeInactive: q.includeInactive ? 'true' : undefined,
    groupByCompat: q.groupByCompat ? 'true' : undefined,
    page: q.page !== undefined ? String(q.page) : undefined,
    pageSize: q.pageSize !== undefined ? String(q.pageSize) : undefined,
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search');
  return (await res.json()) as PartSearchResult;
}

export async function getPartDetail(id: string): Promise<PartDetailDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/detail`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_detail');
  return (await res.json()) as PartDetailDto;
}

export async function getPartStockSummary(id: string): Promise<PartStockSummaryDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/stock-summary`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_stock_summary');
  return (await res.json()) as PartStockSummaryDto;
}

export async function getPartPurchaseHistory(
  id: string,
): Promise<{ rows: PartPurchaseHistoryRow[] }> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/purchase-history`, {
    method: 'GET',
  });
  await assertOk(res, 'nxui_part_quick_search_purchase_history');
  return (await res.json()) as { rows: PartPurchaseHistoryRow[] };
}

export async function getPartSalesHistory(id: string): Promise<PartSalesHistoryDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/sales-history`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_sales_history');
  return (await res.json()) as PartSalesHistoryDto;
}

export async function getPartStockHistory(id: string): Promise<{ rows: PartStockHistoryRow[] }> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/stock-history`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_stock_history');
  return (await res.json()) as { rows: PartStockHistoryRow[] };
}

export async function getPartStockSettings(
  id: string,
): Promise<{ rows: PartStockSettingRow[] }> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/stock-settings`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_stock_settings');
  return (await res.json()) as { rows: PartStockSettingRow[] };
}

export async function getPartRelated(id: string): Promise<{ rows: PartRelatedRow[] }> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/related`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_related');
  return (await res.json()) as { rows: PartRelatedRow[] };
}

/** F2 下鑽 F10 頁籤：適用車型（唯讀）*/
export async function getPartModels(id: string): Promise<{ rows: PartModelRow[] }> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/models`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_models');
  return (await res.json()) as { rows: PartModelRow[] };
}

/** F2 視窗 2 右欄通用件群組（含主件 + 替代品 + 各 member 庫存）*/
export async function getPartCompatGroup(id: string): Promise<PartCompatGroupResult> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/compat-group`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_compat_group');
  return (await res.json()) as PartCompatGroupResult;
}

export type PartPhotoMeta = {
  id: string;
  mimeType: string;
  sortNo: number;
  origFilename: string | null;
  fileSize: number;
};

export async function listPartSearchPhotos(id: string): Promise<{ rows: PartPhotoMeta[] }> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/photos`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_photos');
  return (await res.json()) as { rows: PartPhotoMeta[] };
}

/** 圖片 binary URL（給 <img src> 用）*/
export function buildPartSearchPhotoUrl(partId: string, photoId: string): string {
  return `${BASE}/${encodeURIComponent(partId)}/photos/${encodeURIComponent(photoId)}/raw`;
}
