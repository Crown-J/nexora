/**
 * File: apps/nx-ui/src/features/nx00/partner/api/partner.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTNER-API-001：Partner API Client（list/get/create/update/setActive）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { CreatePartnerBody, PagedResult, PartnerDto, UpdatePartnerBody } from '@/features/nx00/partner/types';

const BASE = '/partner';

export type ListPartnerParams = {
    page: number;
    pageSize: number;
    q?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-PARTNER-API-001-F01
 * 說明：
 * - listPartner：列出交易夥伴清單（分頁）
 * - GET /partner?page=&pageSize=&q=
 */
export async function listPartner(params: ListPartnerParams): Promise<PagedResult<PartnerDto>> {
    const query = buildQueryString({
        page: String(params.page),
        pageSize: String(params.pageSize),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_partner_list_001');
    return (await res.json()) as PagedResult<PartnerDto>;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PARTNER-API-001-F02
 * 說明：
 * - getPartner：取得單筆交易夥伴
 * - GET /partner/:id
 */
export async function getPartner(id: string): Promise<PartnerDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_partner_get_001');
    return (await res.json()) as PartnerDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PARTNER-API-001-F03
 * 說明：
 * - createPartner：建立交易夥伴
 * - POST /partner
 */
export async function createPartner(body: CreatePartnerBody): Promise<PartnerDto> {
    const res = await apiFetch(BASE, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_partner_create_001');
    return (await res.json()) as PartnerDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PARTNER-API-001-F04
 * 說明：
 * - updatePartner：更新交易夥伴
 * - PUT /partner/:id
 */
export async function updatePartner(id: string, body: UpdatePartnerBody): Promise<PartnerDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_partner_update_001');
    return (await res.json()) as PartnerDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PARTNER-API-001-F05
 * 說明：
 * - setPartnerActive：切換啟用狀態
 * - PATCH /partner/:id/active
 */
export async function setPartnerActive(id: string, isActive: boolean): Promise<PartnerDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
    });

    await assertOk(res, 'nxui_nx00_partner_set_active_001');
    return (await res.json()) as PartnerDto;
}