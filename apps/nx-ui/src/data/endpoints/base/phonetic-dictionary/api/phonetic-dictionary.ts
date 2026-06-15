// apps/nx-ui/src/features/nx01/phonetic-dictionary/api/phonetic-dictionary.ts
// 對應後端：apps/nx-api/src/nx01/phonetic-dictionary/phonetic-dictionary.controller.ts
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type {
  CreatePhoneticDictionaryBody,
  ListPhoneticDictionaryParams,
  PagedPhoneticDictionary,
  PhoneticDictionaryDto,
  UpdatePhoneticDictionaryBody,
} from '@data/types/base/phonetic-dictionary';

const BASE = '/nx01/phonetic-dictionary';

export async function listPhoneticDictionary(
  params: ListPhoneticDictionaryParams,
): Promise<PagedPhoneticDictionary> {
  const query = buildQueryString({
    page: params.page !== undefined ? String(params.page) : undefined,
    pageSize: params.pageSize !== undefined ? String(params.pageSize) : undefined,
    search: params.search?.trim() ? params.search.trim() : undefined,
    primaryInitial: params.primaryInitial?.trim() ? params.primaryInitial.trim() : undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_phonetic_dictionary_list');
  return (await res.json()) as PagedPhoneticDictionary;
}

export async function createPhoneticDictionary(
  body: CreatePhoneticDictionaryBody,
): Promise<PhoneticDictionaryDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_phonetic_dictionary_create');
  return (await res.json()) as PhoneticDictionaryDto;
}

export async function updatePhoneticDictionary(
  id: string,
  body: UpdatePhoneticDictionaryBody,
): Promise<PhoneticDictionaryDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_phonetic_dictionary_update');
  return (await res.json()) as PhoneticDictionaryDto;
}

export async function softDeletePhoneticDictionary(id: string): Promise<PhoneticDictionaryDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_phonetic_dictionary_delete');
  return (await res.json()) as PhoneticDictionaryDto;
}
