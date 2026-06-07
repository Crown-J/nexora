// apps/nx-ui/src/features/shared/part-compat/part-alternatives-api.ts
// 02 對齊第二批前端收尾軌 FE-CP6 2026-06-07：part fan-out alternatives client
import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';

export type AlternativeMember = {
  memberId: string;
  partId: string;
  code: string;
  name: string;
  role: number;
  customPrice: string | null;
  isBidirectional: boolean;
  stockOnHand: string;
};

export type AlternativesGroup = {
  groupId: string;
  groupCode: string;
  groupName: string;
  sourceRole: number;
  members: AlternativeMember[];
};

export type PartAlternativesResponse = {
  sourcePart: { id: string; code: string; name: string };
  groups: AlternativesGroup[];
  groupCount: number;
  alternativeCount: number;
};

export async function fetchPartAlternatives(partId: string): Promise<PartAlternativesResponse> {
  const res = await apiFetch(`/nx01/parts/${encodeURIComponent(partId)}/compat-alternatives`, { method: 'GET' });
  await assertOk(res, 'nxui_part_alternatives');
  return (await res.json()) as PartAlternativesResponse;
}
