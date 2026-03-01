/**
 * File: apps/nx-ui/src/features/nx00/warehouse/api/warehouse.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-WAREHOUSE-API-001：Warehouse API（LITE：單筆設定）
 *
 * Notes:
 * - LITE：單倉設定（透過標準 CRUD 模擬 single）
 * - Endpoints：
 *   - GET  /warehouse?page=1&pageSize=1
 *   - POST /warehouse
 *   - PUT  /warehouse/:id
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type {
    CreateWarehouseBody,
    UpdateWarehouseBody,
    WarehouseDto,
} from '@/features/nx00/warehouse/types';
import type { PagedResult } from '@/shared/types/pagination';

const BASE = '/warehouse';

/**
 * @FUNCTION_CODE NX00-UI-NX00-WAREHOUSE-API-001-F01
 * 說明：
 * - getWarehouseSingle：取得單筆倉庫設定（取第一筆）
 */
export async function getWarehouseSingle(): Promise<WarehouseDto | null> {
    const query = buildQueryString({
        page: '1',
        pageSize: '1',
    });

    const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_warehouse_single_get_001');

    const data = (await res.json()) as PagedResult<WarehouseDto>;

    if (!data.items || data.items.length === 0) return null;

    return data.items[0];
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-WAREHOUSE-API-001-F02
 * 說明：
 * - createWarehouseSingle：初始化單筆倉庫
 * - 實際走 POST /warehouse
 */
export async function createWarehouseSingle(
    body: CreateWarehouseBody
): Promise<WarehouseDto> {
    const res = await apiFetch(BASE, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_warehouse_single_create_001');
    return (await res.json()) as WarehouseDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-WAREHOUSE-API-001-F03
 * 說明：
 * - updateWarehouseSingle：更新單筆倉庫
 * - 必須帶入 id（因為後端是 PUT /warehouse/:id）
 */
export async function updateWarehouseSingle(
    id: string,
    body: UpdateWarehouseBody
): Promise<WarehouseDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_warehouse_single_update_001');
    return (await res.json()) as WarehouseDto;
}