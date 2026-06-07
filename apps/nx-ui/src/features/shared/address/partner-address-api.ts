// apps/nx-ui/src/features/shared/address/partner-address-api.ts
// 02 對齊第二批前端收尾軌 FE-CP2 2026-06-07：partner_address CRUD client
import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';

export type PartnerAddressRow = {
  id: string;
  partnerId: string;
  addressType: 'BILLING' | 'SHIPPING';
  label: string | null;
  isDefault: boolean;
  countryId: string | null;
  cityId: string | null;
  districtId: string | null;
  postalCode: string | null;
  streetName: string | null;
  lane: string | null;
  alley: string | null;
  buildingNo: string | null;
  buildingSubNo: string | null;
  floor: string | null;
  roomNo: string | null;
  freeformAddress: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  note: string | null;
  isActive: boolean;
  city?: { code: string; name: string } | null;
  district?: { code: string; name: string } | null;
  country?: { code: string; name: string } | null;
};

export type PartnerAddressWriteBody = Partial<Omit<PartnerAddressRow, 'id' | 'partnerId' | 'isActive' | 'city' | 'district' | 'country'>>;

export async function listPartnerAddresses(partnerId: string): Promise<PartnerAddressRow[]> {
  const res = await apiFetch(`/nx01/partners/${encodeURIComponent(partnerId)}/addresses`, { method: 'GET' });
  await assertOk(res, 'nxui_partner_address_list');
  const j = (await res.json()) as { rows: PartnerAddressRow[] };
  return j.rows ?? [];
}

export async function createPartnerAddress(
  partnerId: string,
  body: PartnerAddressWriteBody & { addressType: 'BILLING' | 'SHIPPING' },
): Promise<PartnerAddressRow> {
  const res = await apiFetch(`/nx01/partners/${encodeURIComponent(partnerId)}/addresses`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_partner_address_create');
  return (await res.json()) as PartnerAddressRow;
}

export async function updatePartnerAddress(
  partnerId: string,
  addressId: string,
  body: PartnerAddressWriteBody,
): Promise<PartnerAddressRow> {
  const res = await apiFetch(
    `/nx01/partners/${encodeURIComponent(partnerId)}/addresses/${encodeURIComponent(addressId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  await assertOk(res, 'nxui_partner_address_update');
  return (await res.json()) as PartnerAddressRow;
}

export async function deletePartnerAddress(partnerId: string, addressId: string): Promise<void> {
  const res = await apiFetch(
    `/nx01/partners/${encodeURIComponent(partnerId)}/addresses/${encodeURIComponent(addressId)}`,
    { method: 'DELETE' },
  );
  await assertOk(res, 'nxui_partner_address_delete');
}
