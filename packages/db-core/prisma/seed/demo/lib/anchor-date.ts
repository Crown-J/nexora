// packages/db-core/prisma/seed/demo/lib/anchor-date.ts
// @FUNCTION_CODE SYS-DEMO-LIB-001-F01
// DEMO-02 時間錨點：所有時間從 hardcoded anchor date 推算（Crown Q3 拍板）
//
// 設計理由：
//   - Demo 跑時的「今天」是 anchor date、不依 new Date()
//   - dormant 期 = anchor 前 5.5 月（2025-11-01 ~ 2026-04-20）
//   - busy 期   = anchor 前 7 天（2026-04-21 ~ 2026-04-26，含 anchor 前一天）
//   - W2-mini demo refresh 時手動改 anchor date 重 seed

export const DEMO_ANCHOR_DATE = new Date('2026-04-27T00:00:00Z');

/** dormant 期起點（anchor 往前 5.5 月）*/
export const DORMANT_START = new Date('2025-11-01T00:00:00Z');

/** busy 期起點（anchor 往前 7 天）*/
export const BUSY_START = new Date('2026-04-21T00:00:00Z');

/** 最後一筆 demo SO 的日期（anchor 前一天）*/
export const LAST_SO_DATE = new Date('2026-04-26T23:59:59Z');

/** 推算「anchor 前 N 天」的日期 */
export function daysBeforeAnchor(days: number): Date {
  const d = new Date(DEMO_ANCHOR_DATE);
  d.setDate(d.getDate() - days);
  return d;
}

/** 推算「anchor 後 N 天」的日期（給 expectedDeliveryDate 用）*/
export function daysAfterAnchor(days: number): Date {
  const d = new Date(DEMO_ANCHOR_DATE);
  d.setDate(d.getDate() + days);
  return d;
}

/** dormant 期內隨機選一天（用 seed 確保可重現）*/
export function randomDormantDate(seed: number): Date {
  const start = DORMANT_START.getTime();
  const end = BUSY_START.getTime() - 24 * 60 * 60 * 1000; // dormant 結束 = busy 起點 - 1 天
  const range = end - start;
  // Linear-congruential pseudo-random (deterministic by seed)
  const pseudo = ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return new Date(start + pseudo * range);
}

/** busy 期內隨機選一天 */
export function randomBusyDate(seed: number): Date {
  const start = BUSY_START.getTime();
  const end = LAST_SO_DATE.getTime();
  const range = end - start;
  const pseudo = ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return new Date(start + pseudo * range);
}

/** anchor month 的 yyyymm 字串（給 docNo 用）*/
export function anchorYyyymm(): string {
  const y = DEMO_ANCHOR_DATE.getFullYear();
  const m = String(DEMO_ANCHOR_DATE.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

/** 給定日期回傳 yyyymm 字串 */
export function dateToYyyymm(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}
