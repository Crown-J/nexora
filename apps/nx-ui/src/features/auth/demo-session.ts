/**
 * File: apps/nx-ui/src/features/auth/demo-session.ts
 * Purpose: Demo 模式暫存展示用帳號字串、組裝假 MeDto
 */

import {
  NEXORA_DEMO_USERNAME_SESSION_KEY,
} from '@/features/auth/constants';
import type { MeDto } from '@/features/auth/types';

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
  } catch {
    // ignore
  }
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
  };
}
