/**
 * File: apps/nx-ui/src/features/auth/run-mode.ts
 * Purpose: 區分 development（接真後端／DB）與 demo（離線展示、不接登入 API）
 */

export type NexoraRunMode = 'development' | 'demo';

function rawMode(): string {
  return (process.env.NEXT_PUBLIC_NEXORA_RUN_MODE ?? '').trim().toLowerCase();
}

/**
 * - 未設定或 `development`：走真實 API + 資料庫驗證
 * - `demo`：登入與 session 短路（見 callLoginApi、useSessionMe）
 */
export function getNexoraRunMode(): NexoraRunMode {
  return rawMode() === 'demo' ? 'demo' : 'development';
}

export function isNexoraDemoMode(): boolean {
  return getNexoraRunMode() === 'demo';
}
