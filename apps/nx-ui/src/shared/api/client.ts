/**
 * File: apps/nx-ui/src/shared/api/client.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-001：前端統一 API Client
 *
 * Notes:
 * - 自動附帶 Bearer token
 * - 自動處理 JSON header
 * - 統一錯誤型別 ApiClientError
 */

import { getToken } from '@/features/auth/token';
import { ApiClientError } from './errors';

export type ApiClientOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('[NX00-API-001] NEXT_PUBLIC_API_URL is not set');
  }
  return baseUrl;
}

/**
 * @CODE nxui_shared_api_fetch_002
 */
export async function apiFetch(
  path: string,
  opts: ApiClientOptions = {}
): Promise<Response> {
  const baseUrl = getBaseUrl();
  const token = getToken();

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const hasContentType = Object.keys(headers).some(
    (k) => k.toLowerCase() === 'content-type'
  );

  if (opts.body && typeof opts.body === 'string' && !hasContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${baseUrl}${path}`, {
    ...opts,
    headers,
  });
}

/**
 * @CODE nxui_shared_api_json_002
 */
export async function apiJson<T>(
  path: string,
  opts: ApiClientOptions = {}
): Promise<T> {
  const res = await apiFetch(path, opts);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiClientError(
      res.status,
      `[NX00-API-001] HTTP ${res.status}`,
      body
    );
  }

  return (await res.json()) as T;
}