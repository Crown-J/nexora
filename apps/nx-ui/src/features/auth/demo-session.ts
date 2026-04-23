/**
 * File: apps/nx-ui/src/features/auth/demo-session.ts
 * Purpose: Demo 模式暫存展示用帳號字串、組裝假 MeDto
 *
 * R4A-FIX：登入時寫入 tenantCode 到 sessionStorage，後續 DEMO_USER /
 * buildDemoMeFromStorage 依此動態決定 plan code，避免寫死 PRO 導致
 * TEST-LITE / TEST-PLUS 登入仍看到 PRO 版面。
 */

import {
  NEXORA_DEMO_USERNAME_SESSION_KEY,
} from '@/features/auth/constants';
import type { MeDto } from '@/features/auth/types';

/** 登入時暫存的 tenantCode（sessionStorage），僅供 demo mode 推導 plan code 使用 */
const DEMO_TENANT_CODE_SESSION_KEY = 'nexora_demo_tenant_code';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function setDemoSessionUsername(username: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(NEXORA_DEMO_USERNAME_SESSION_KEY, username.trim() || 'demo');
  } catch {
    // ignore
  }
}

export function clearDemoSessionUsername(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(NEXORA_DEMO_USERNAME_SESSION_KEY);
    // 一併清 tenantCode，避免下一次登入殘留到上次的 tier
    sessionStorage.removeItem(DEMO_TENANT_CODE_SESSION_KEY);
  } catch {
    // ignore
  }
}

/** 登入成功後寫入；未設或空字串則清掉。 */
export function setDemoSessionTenantCode(tenantCode: string | null | undefined): void {
  if (!isBrowser()) return;
  const trimmed = String(tenantCode ?? '').trim();
  try {
    if (trimmed) {
      sessionStorage.setItem(DEMO_TENANT_CODE_SESSION_KEY, trimmed);
    } else {
      sessionStorage.removeItem(DEMO_TENANT_CODE_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

function readDemoSessionTenantCode(): string | null {
  if (!isBrowser()) return null;
  try {
    const v = sessionStorage.getItem(DEMO_TENANT_CODE_SESSION_KEY);
    return v && v.trim() !== '' ? v.trim() : null;
  } catch {
    return null;
  }
}

/**
 * 依登入時的 tenantCode 推導 plan code。測試租戶固定對照：
 *   TEST-LITE → NEXORA-LITE-M
 *   TEST-PLUS → NEXORA-PLUS-L
 *   TEST-PRO  → NEXORA-PRO-XL
 * 未知 tenantCode（含 null）回 null，讓上層選擇 fallback 到 env var。
 */
export function deriveDemoPlanCodeFromSession(): string | null {
  const tenantCode = readDemoSessionTenantCode();
  if (!tenantCode) return null;
  const upper = tenantCode.toUpperCase();
  if (upper === 'TEST-PRO') return 'NEXORA-PRO-XL';
  if (upper === 'TEST-PLUS') return 'NEXORA-PLUS-L';
  if (upper === 'TEST-LITE') return 'NEXORA-LITE-M';
  return null;
}

export function buildDemoMeFromStorage(): MeDto {
  let username = 'demo';
  if (isBrowser()) {
    try {
      username = sessionStorage.getItem(NEXORA_DEMO_USERNAME_SESSION_KEY) || 'demo';
    } catch {
      username = 'demo';
    }
  }

  // R4A-FIX：優先用登入時的 tenantCode 推導的 plan code；否則 fallback env var；否則 PRO
  const planCode =
    deriveDemoPlanCodeFromSession() ??
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_DEMO_PLAN_CODE : undefined) ??
    'PRO';

  return {
    id: 'nexora-demo-user',
    username,
    display_name: '展示模式',
    displayName: '展示模式',
    /** 展示模式不套用矩陣（等同平台管理語意） */
    view_permissions: null,
    is_active: true,
    isActive: true,
    last_login_at: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    tenant_name: '伊諾瓦資訊科技有限公司',
    tenant_name_en: 'Innova Information Technology',
    plan_code: planCode,
  };
}
