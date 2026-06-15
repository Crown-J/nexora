// apps/nx-ui/src/features/sys-admin/onboarding/api.ts
import { apiJson, apiFetch } from '@data/api/client';

import type { CreateOnboardingPayload, OnboardingResponse } from '@data/types/sys-admin/onboarding';

export function createOnboarding(payload: CreateOnboardingPayload): Promise<OnboardingResponse> {
  return apiJson('/sys-admin/onboarding/create-tenant', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type UploadLogoResponse = {
  storageKey: string;
  size: number;
  mimeType: string;
  origFilename: string;
};

/**
 * LOGO 上傳：選檔即觸發、回 storage_key 讓上層帶在 create-tenant payload。
 * - multipart/form-data（不能用 apiJson）
 * - 限 image MIME（png/jpeg/gif/webp）、後端再驗
 */
export async function uploadOnboardingLogo(file: File): Promise<UploadLogoResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch('/sys-admin/onboarding/upload-logo', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    let msg = `Upload failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) msg = String(body.message);
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json();
}

/**
 * 將 storage_key 拼成可顯示的 LOGO URL（給 <img src> 用）。
 * storage_key 範式：{tenantPrefix}/onboarding/{yyyy}/{mm}/{filename}
 * 公開 endpoint：GET /files/public/logos/{tenantPrefix}/{yyyy}/{mm}/{filename}
 */
export function logoStorageKeyToUrl(storageKey: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';
  // storage_key 已是 `prefix/onboarding/yyyy/mm/file`、轉成 `logos/prefix/yyyy/mm/file`
  const parts = storageKey.split('/');
  if (parts.length !== 5 || parts[1] !== 'onboarding') return '';
  const [tenantPrefix, , yyyy, mm, filename] = parts;
  return `${base}/files/public/logos/${tenantPrefix}/${yyyy}/${mm}/${filename}`;
}
