// apps/nx-ui/src/features/base/api/partStockSetting.ts
/**
 * W5 [2-2] 2026-06-06：零件庫存設定 API client（NX-MANUAL-02 v2.0 §5.1 庫存分頁衛星）
 *
 * 每倉一筆 = 安全量 minQty / 最高量 maxQty / 預設庫位 defaultLocationId（+ reorderQty 補貨點）
 * - LITE 多倉時每倉自己設、單倉 = 1 筆
 * - safety 串到庫存報表「低庫存警報」（後續軌）
 * - max 供囤貨過量提醒（後續軌）
 *
 * 後端 endpoint：/nx03/part-stock-setting （controller 已備）
 */

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

export type PartStockSettingDto = {
  id: string;
  tenantId: string;
  partId: string;
  warehouseId: string;
  minQty: string;
  maxQty: string;
  reorderQty: string;
  defaultLocationId: string | null;
  isActive: boolean;
  remark: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  part?: { code: string; name: string } | null;
  warehouse?: { code: string; name: string } | null;
};

export type PartStockSettingListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: PartStockSettingDto[];
};

const BASE = '/nx03/part-stock-setting';

/** 列出零件在各倉的庫存設定（每倉一筆） */
export async function listPartStockSettingByPart(partId: string): Promise<PartStockSettingDto[]> {
  const qs = buildQueryString({ partId, pageSize: '100' });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_part_stock_setting_list');
  const j = (await res.json()) as PartStockSettingListResponse;
  return Array.isArray(j.items) ? j.items : [];
}

export type CreatePartStockSettingBody = {
  partId: string;
  warehouseId: string;
  minQty?: number;
  maxQty?: number;
  reorderQty?: number;
  defaultLocationId?: string;
  isActive?: boolean;
  remark?: string;
};

export type UpdatePartStockSettingBody = {
  minQty?: number;
  maxQty?: number;
  reorderQty?: number;
  defaultLocationId?: string;
  isActive?: boolean;
  remark?: string;
};

export async function createPartStockSetting(
  body: CreatePartStockSettingBody,
): Promise<PartStockSettingDto> {
  const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_part_stock_setting_create');
  return res.json() as Promise<PartStockSettingDto>;
}

export async function updatePartStockSetting(
  id: string,
  body: UpdatePartStockSettingBody,
): Promise<PartStockSettingDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_part_stock_setting_update');
  return res.json() as Promise<PartStockSettingDto>;
}
