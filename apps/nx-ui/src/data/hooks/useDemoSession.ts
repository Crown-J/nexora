/**
 * @SYS-AUTH-HOOK-001-F01
 * Demo 模式假 session，NEXT_PUBLIC_DEMO_MODE=true 時生效（不接後端 /auth/me）
 *
 * R4A-FIX：DEMO_USER 的 planCode 從「env var 寫死」改為「讀登入時寫入的
 * sessionStorage tenantCode 動態推導」，以便 TEST-LITE / TEST-PLUS / TEST-PRO
 * 各自呈現對應版面。
 */

import type { MeDto } from '@/features/auth/types';
import { deriveDemoPlanCodeFromSession } from '@/features/auth/demo-session';

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

/** 把 NEXORA-PRO-XL 等長碼收斂為三段 PlanCode enum（LITE/PLUS/PRO） */
function collapseTier(planCodeStr: string | null | undefined): 'LITE' | 'PLUS' | 'PRO' {
  const s = String(planCodeStr ?? '').toUpperCase();
  if (s.includes('PRO')) return 'PRO';
  if (s.includes('PLUS')) return 'PLUS';
  if (s.includes('LITE')) return 'LITE';
  return 'PRO';
}

/**
 * 動態取得 DEMO_USER。每次呼叫都重新讀 sessionStorage，讓 tenantCode 切換立即生效。
 * 讀不到 sessionStorage tenantCode 時 fallback 到 env var（原有行為）。
 */
export function getDemoUser(): DemoUser {
  const dynamicTier = collapseTier(
    deriveDemoPlanCodeFromSession() ?? process.env.NEXT_PUBLIC_DEMO_PLAN_CODE ?? 'PRO',
  );
  return {
    id: 'DEMO-USR-001',
    name: rawName,
    role: process.env.NEXT_PUBLIC_DEMO_USER_ROLE ?? '系統管理員',
    planCode: dynamicTier,
    tenantName: process.env.NEXT_PUBLIC_DEMO_TENANT_NAME ?? 'Demo 公司',
    avatarInitial: Array.from(rawName.trim() || 'D')[0] ?? 'D',
  };
}

/**
 * Backward compat：原有 const export。模組載入時的初始快照（server-side 時拿不到
 * sessionStorage）；建議 consumer 改用 getDemoUser() 取動態值。
 */
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
    roles: ['SYSADMIN'],
    last_login_at: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

export function useDemoSession() {
  const isDemoMode = isNextPublicDemoMode();
  return {
    isDemoMode,
    user: isDemoMode ? getDemoUser() : null,
  };
}

