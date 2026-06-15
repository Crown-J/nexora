// apps/nx-ui/src/features/nx02/warranty-claim/api/warranty-claim.ts
// LITE 階段 1 M3：保固申請單 API client

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import type {
  CreateWarrantyClaimBody,
  RegisterResultBody,
  UpdateWarrantyClaimBody,
  WarrantyClaimAttachmentDto,
  WarrantyClaimDto,
} from '@data/types/nx03/warranty-claim';

const BASE = '/nx02/warranty-claims';

export type ListWarrantyClaimParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  supplierId?: string;
  partId?: string;
  claimType?: string;
};

export type PagedWarrantyClaim = {
  page: number;
  pageSize: number;
  total: number;
  rows: WarrantyClaimDto[];
};

export async function listWarrantyClaims(params: ListWarrantyClaimParams): Promise<PagedWarrantyClaim> {
  const qs = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.q?.trim() || undefined,
    status: params.status?.trim() || undefined,
    supplierId: params.supplierId?.trim() || undefined,
    partId: params.partId?.trim() || undefined,
    claimType: params.claimType?.trim() || undefined,
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_warranty_claim_list');
  return res.json() as Promise<PagedWarrantyClaim>;
}

export async function getWarrantyClaim(id: string): Promise<WarrantyClaimDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_warranty_claim_get');
  return res.json() as Promise<WarrantyClaimDto>;
}

export async function createWarrantyClaim(body: CreateWarrantyClaimBody): Promise<WarrantyClaimDto> {
  const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx02_warranty_claim_create');
  return res.json() as Promise<WarrantyClaimDto>;
}

export async function updateWarrantyClaim(id: string, body: UpdateWarrantyClaimBody): Promise<WarrantyClaimDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_warranty_claim_update');
  return res.json() as Promise<WarrantyClaimDto>;
}

export async function submitWarrantyClaim(id: string): Promise<WarrantyClaimDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/submit`, { method: 'POST', body: '{}' });
  await assertOk(res, 'nxui_nx02_warranty_claim_submit');
  return res.json() as Promise<WarrantyClaimDto>;
}

export async function startReviewWarrantyClaim(id: string): Promise<WarrantyClaimDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/start-review`, { method: 'POST', body: '{}' });
  await assertOk(res, 'nxui_nx02_warranty_claim_start_review');
  return res.json() as Promise<WarrantyClaimDto>;
}

export async function registerResult(id: string, body: RegisterResultBody): Promise<WarrantyClaimDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/register-result`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_warranty_claim_register_result');
  return res.json() as Promise<WarrantyClaimDto>;
}

export async function voidWarrantyClaim(id: string): Promise<WarrantyClaimDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx02_warranty_claim_void');
  return res.json() as Promise<WarrantyClaimDto>;
}

export async function listAttachments(claimId: string): Promise<{ rows: WarrantyClaimAttachmentDto[] }> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(claimId)}/attachments`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_warranty_claim_att_list');
  return res.json() as Promise<{ rows: WarrantyClaimAttachmentDto[] }>;
}

/** M3-redo-3b base64 範式（對齊 bulletin attachment）*/
export type CreateAttachmentBody = {
  fileType: 'LIC' | 'PHO' | 'VID';
  /** base64 字串（不含 data URL prefix）*/
  base64Content: string;
  origFilename: string;
  mimeType: string;
};

export async function createAttachment(claimId: string, body: CreateAttachmentBody): Promise<WarrantyClaimAttachmentDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(claimId)}/attachments`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_warranty_claim_att_create');
  return res.json() as Promise<WarrantyClaimAttachmentDto>;
}

export async function deleteAttachment(claimId: string, attachmentId: string): Promise<void> {
  const res = await apiFetch(
    `${BASE}/${encodeURIComponent(claimId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { method: 'DELETE' },
  );
  await assertOk(res, 'nxui_nx02_warranty_claim_att_delete');
}
