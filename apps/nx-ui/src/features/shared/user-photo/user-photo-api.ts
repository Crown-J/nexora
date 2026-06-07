// apps/nx-ui/src/features/shared/user-photo/user-photo-api.ts
// 02 第四批 軌 1 2026-06-07：使用者大頭貼 client（base64 範式、單張、scalar 掛 nx01_user）
import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';

export type UserPhotoUploadResult = { ok: boolean; hasPhoto: boolean };

export async function uploadUserPhoto(
  userId: string,
  body: { base64Content: string; originalFilename: string; mimeType: string },
): Promise<UserPhotoUploadResult> {
  const res = await apiFetch(`/nx01/users/${encodeURIComponent(userId)}/photo`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_user_photo_upload');
  return res.json() as Promise<UserPhotoUploadResult>;
}

export async function deleteUserPhoto(userId: string): Promise<UserPhotoUploadResult> {
  const res = await apiFetch(`/nx01/users/${encodeURIComponent(userId)}/photo`, {
    method: 'DELETE',
  });
  await assertOk(res, 'nxui_user_photo_delete');
  return res.json() as Promise<UserPhotoUploadResult>;
}

/** 大頭貼 raw URL（authed binary、由 <img src> + cookie 或 header 取） */
export function userPhotoRawPath(userId: string): string {
  return `/nx01/users/${encodeURIComponent(userId)}/photo/raw`;
}
