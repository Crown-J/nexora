/**
 * File: apps/nx-ui/src/features/auth/constants.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-AUTH-001：Auth 共用常數（storage keys）
 */

export const AUTH_ACCESS_TOKEN_KEY = 'nx00_access_token';

/** Demo 模式寫入 localStorage 的固定 token（非 JWT） */
export const NEXORA_DEMO_ACCESS_TOKEN = '__NEXORA_DEMO_TOKEN__';

/** Demo 登入後暫存使用者帳號字串，供假 /me 顯示 */
export const NEXORA_DEMO_USERNAME_SESSION_KEY = 'nexora_demo_username';

/** Demo 模式固定帳密（僅擋路人；仍會出現在前端 bundle） */
export const NEXORA_DEMO_LOGIN_USERNAME = 'demo';
export const NEXORA_DEMO_LOGIN_PASSWORD = 'nexora2026';