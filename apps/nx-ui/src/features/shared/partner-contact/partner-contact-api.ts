// apps/nx-ui/src/features/shared/partner-contact/partner-contact-api.ts
// 02 第三批 T2 2026-06-07：partner 聯絡窗口子表 CRUD client
import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';

export type PartnerContactRow = {
  id: string;
  partnerId: string;
  contactName: string;
  jobTitle: string | null;
  phone: string | null;
  phoneExt: string | null;
  mobile: string | null;
  email: string | null;
  note: string | null;
  sortNo: number;
  isActive: boolean;
};

export type PartnerContactWriteBody = Partial<Omit<PartnerContactRow, 'id' | 'partnerId' | 'isActive'>>;

export async function listPartnerContacts(partnerId: string): Promise<PartnerContactRow[]> {
  const res = await apiFetch(`/nx01/partners/${encodeURIComponent(partnerId)}/contacts`, { method: 'GET' });
  await assertOk(res, 'nxui_partner_contact_list');
  const j = (await res.json()) as { rows: PartnerContactRow[] };
  return j.rows ?? [];
}

export async function createPartnerContact(
  partnerId: string,
  body: PartnerContactWriteBody & { contactName: string },
): Promise<PartnerContactRow> {
  const res = await apiFetch(`/nx01/partners/${encodeURIComponent(partnerId)}/contacts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_partner_contact_create');
  return (await res.json()) as PartnerContactRow;
}

export async function updatePartnerContact(
  partnerId: string,
  contactId: string,
  body: PartnerContactWriteBody,
): Promise<PartnerContactRow> {
  const res = await apiFetch(
    `/nx01/partners/${encodeURIComponent(partnerId)}/contacts/${encodeURIComponent(contactId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  await assertOk(res, 'nxui_partner_contact_update');
  return (await res.json()) as PartnerContactRow;
}

export async function deletePartnerContact(partnerId: string, contactId: string): Promise<void> {
  const res = await apiFetch(
    `/nx01/partners/${encodeURIComponent(partnerId)}/contacts/${encodeURIComponent(contactId)}`,
    { method: 'DELETE' },
  );
  await assertOk(res, 'nxui_partner_contact_delete');
}
