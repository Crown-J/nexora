/**
 * File: apps/nx-ui/src/features/nx00/part/api/part.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PART-API-001：Part API Client（list/get/create/update/setActive）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { CreatePartBody, PagedResult, PartDto, UpdatePartBody } from '@/features/nx00/part/types';

const BASE = '/part';

export type ListPartParams = {
    page: number;
    pageSize: number;
    q?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F01
 * 說明：
 * - listPart：列出零件清單（分頁）
 * - GET /part?page=&pageSize=&q=
 */
export async function listPart(params: ListPartParams): Promise<PagedResult<PartDto>> {
    const query = buildQueryString({
        page: String(params.page),
        pageSize: String(params.pageSize),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_part_list_001');
    return (await res.json()) as PagedResult<PartDto>;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F02
 * 說明：
 * - getPart：取得單筆零件
 * - GET /part/:id
 */
export async function getPart(id: string): Promise<PartDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_part_get_001');
    return (await res.json()) as PartDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F03
 * 說明：
 * - createPart：建立零件
 * - POST /part
 */
export async function createPart(body: CreatePartBody): Promise<PartDto> {
    const res = await apiFetch(BASE, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_part_create_001');
    return (await res.json()) as PartDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F04
 * 說明：
 * - updatePart：更新零件
 * - PUT /part/:id
 */
export async function updatePart(id: string, body: UpdatePartBody): Promise<PartDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_part_update_001');
    return (await res.json()) as PartDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F05
 * 說明：
 * - setPartActive：切換啟用狀態
 * - PATCH /part/:id/active
 */
export async function setPartActive(id: string, isActive: boolean): Promise<PartDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
    });

    await assertOk(res, 'nxui_nx00_part_set_active_001');
    return (await res.json()) as PartDto;
}