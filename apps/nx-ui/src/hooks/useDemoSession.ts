/**
 * @SYS-AUTH-HOOK-001-F01
 * Demo 模式假 session，NEXT_PUBLIC_DEMO_MODE=true 時生效（不接後端 /auth/me）
 */

import type { MeDto } from '@/features/auth/types';

export interface DemoUser {
  id: string;
  name: string;
  role: string;
  planCode: 'LITE' | 'PLUS' | 'PRO';
  tenantName: string;
  avatarInitial: string;
}

const rawName = process.env.NEXT_PUBLIC_DEMO_USER_NAME ?? 'Demo User';

export function isNextPublicDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export const DEMO_USER: DemoUser = {
  id: 'DEMO-USR-001',
  name: rawName,
  role: process.env.NEXT_PUBLIC_DEMO_USER_ROLE ?? '系統管理員',
  planCode: (process.env.NEXT_PUBLIC_DEMO_PLAN_CODE ?? 'PRO') as DemoUser['planCode'],
  tenantName: process.env.NEXT_PUBLIC_DEMO_TENANT_NAME ?? 'Demo 公司',
  avatarInitial: Array.from(rawName.trim() || 'D')[0] ?? 'D',
};

/**
 * 供 useSessionMe 注入假 me，與 /auth/me 型別一致
 */
export function demoUserToMeDto(u: DemoUser): MeDto {
  return {
    id: u.id,
    username: u.name,
    display_name: u.name,
    displayName: u.name,
    tenant_name: u.tenantName,
    plan_code: u.planCode,
    planCode: u.planCode,
    is_active: true,
    isActive: true,
    view_permissions: null,
    roles: ['ADMIN'],
    last_login_at: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

export function useDemoSession() {
  const isDemoMode = isNextPublicDemoMode();
  return {
    isDemoMode,
    user: isDemoMode ? DEMO_USER : null,
  };
}
