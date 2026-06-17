// apps/nx-ui/src/data/endpoints/nx01/part-search/api/part-search.ts
// F2 料號即時搜尋 API client（對應 apps/nx-api/src/nx01/part-search/part-search.controller.ts）
import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';
import { buildQueryString } from '@data/api/query';

import type {
  PartDetailDto,
  PartPurchaseHistoryRow,
  PartRelatedRow,
  PartSalesHistoryDto,
  PartSearchQuery,
  PartSearchResult,
  PartStockHistoryRow,
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
    keyword: q.keyword?.trim() || undefined,
    partNo: q.partNo?.trim() || undefined,
    includeInactive: q.includeInactive ? 'true' : undefined,
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

export async function getPartRelated(id: string): Promise<{ rows: PartRelatedRow[] }> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/related`, { method: 'GET' });
  await assertOk(res, 'nxui_part_quick_search_related');
  return (await res.json()) as { rows: PartRelatedRow[] };
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
