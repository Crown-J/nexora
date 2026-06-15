// apps/nx-ui/src/features/shared/part-photo/part-photo-api.ts
// 02 第三批 T4 2026-06-07：零件照片 CRUD client（base64 範式、同 bulletin 附件）
import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';

export type PartPhotoRow = {
  id: string;
  partId: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  origFilename: string | null;
  sortNo: number;
  uploaderUserId: string;
  createdAt: string;
};

export async function listPartPhotos(partId: string): Promise<PartPhotoRow[]> {
  const res = await apiFetch(`/nx01/parts/${encodeURIComponent(partId)}/photos`, { method: 'GET' });
  await assertOk(res, 'nxui_part_photo_list');
  const j = (await res.json()) as { rows: PartPhotoRow[] };
  return j.rows ?? [];
}

export async function uploadPartPhoto(
  partId: string,
  body: {
    base64Content: string;
    originalFilename: string;
    mimeType: string;
    sortNo?: number;
  },
): Promise<PartPhotoRow> {
  const res = await apiFetch(`/nx01/parts/${encodeURIComponent(partId)}/photos`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_part_photo_upload');
  return (await res.json()) as PartPhotoRow;
}

export async function setPartPhotoSortNo(
  partId: string,
  photoId: string,
  sortNo: number,
): Promise<PartPhotoRow> {
  const res = await apiFetch(
    `/nx01/parts/${encodeURIComponent(partId)}/photos/${encodeURIComponent(photoId)}`,
    { method: 'PATCH', body: JSON.stringify({ sortNo }) },
  );
  await assertOk(res, 'nxui_part_photo_update');
  return (await res.json()) as PartPhotoRow;
}

export async function deletePartPhoto(partId: string, photoId: string): Promise<void> {
  const res = await apiFetch(
    `/nx01/parts/${encodeURIComponent(partId)}/photos/${encodeURIComponent(photoId)}`,
    { method: 'DELETE' },
  );
  await assertOk(res, 'nxui_part_photo_delete');
}

/** 拼圖片預覽 URL（authed binary endpoint） */
export function partPhotoUrl(partId: string, photoId: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  return `${base}/nx01/parts/${encodeURIComponent(partId)}/photos/${encodeURIComponent(photoId)}/raw`;
}
