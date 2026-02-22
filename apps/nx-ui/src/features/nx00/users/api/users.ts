import { getToken } from '@/features/auth/token';

export type UserRow = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  statusCode: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

function apiBase() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new Error('NEXT_PUBLIC_API_URL is not set');
  return baseUrl;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

// ===== List =====
export async function listUsers(params: {
  page: number;
  pageSize: number;
  q?: string;
}): Promise<PagedResult<UserRow>> {
  const q = params.q ? `&q=${encodeURIComponent(params.q)}` : '';
  return apiFetch(`/users?page=${params.page}&pageSize=${params.pageSize}${q}`);
}

// ===== Detail =====
export async function getUser(id: string): Promise<UserRow> {
  return apiFetch(`/users/${encodeURIComponent(id)}`);
}

// ===== Create =====
export async function createUser(payload: {
  username: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  password?: string; // 你後端若不支援可移除
}): Promise<UserRow> {
  return apiFetch(`/users`, { method: 'POST', body: JSON.stringify(payload) });
}

// ===== Update =====
export async function updateUser(
  id: string,
  payload: { displayName?: string; email?: string | null; phone?: string | null; statusCode?: string }
): Promise<UserRow> {
  return apiFetch(`/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ===== Active toggle =====
export async function setUserActive(id: string, isActive: boolean): Promise<UserRow> {
  return apiFetch(`/users/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

// ===== Change password =====
export async function changeUserPassword(id: string, password: string): Promise<{ ok: boolean }> {
  return apiFetch(`/users/${encodeURIComponent(id)}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  });
}
