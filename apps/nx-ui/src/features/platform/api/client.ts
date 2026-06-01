// apps/nx-ui/src/features/platform/api/client.ts
// 平台層 vs 租戶層分離軌 Phase 4：平台後台 API client
//
// 跟 shared/api/client（客戶端）不同點：
// - 共用 localStorage key access_token（同瀏覽器一次只能持一種 token、後登入覆蓋）
// - 失敗時不做 demo mode 短路、直接拋錯
// - 401 統一視為「平台 session 失效」、由上層 platform layout 統一處理

import { getToken } from '@/features/auth/token';

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('[NW-001] NEXT_PUBLIC_API_URL is not set');
  }
  return baseUrl.replace(/\/+$/, '');
}

export class PlatformApiError extends Error {
  constructor(public readonly status: number, public readonly body: unknown, message?: string) {
    super(message ?? `Platform API error ${status}`);
  }
}

export async function platformFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, { ...opts, headers });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    throw new PlatformApiError(res.status, body);
  }
  return (await res.json()) as T;
}
