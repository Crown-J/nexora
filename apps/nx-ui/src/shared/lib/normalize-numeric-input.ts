/**
 * File: apps/nx-ui/src/shared/lib/normalize-numeric-input.ts
 * Purpose: 受控數字欄位 — 去掉前導 0（如 0100→100），並保留輸入中的小數未完成狀態
 */

/**
 * 用於數量／單價等可為小數的 **字串** state。
 * - `0100` → `100`
 * - 保留 `""`、`"-"`、`"."`、`"-."`、以及尾端僅有小數點（如 `12.`）以利繼續輸入
 */
export function normalizeDecimalStringInput(raw: string): string {
  if (
    raw === '' ||
    raw === '-' ||
    raw === '+' ||
    raw === '.' ||
    raw === '-.' ||
    raw === '+.'
  ) {
    return raw;
  }
  if (/^-?\d*\.$/.test(raw)) {
    return raw;
  }
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) {
    return raw;
  }
  return String(n);
}

/**
 * 非負整數欄位（安全量、頁碼等），對應 `parseInt(x, 10) || 0` 行為。
 */
export function parseIntInput(v: string): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}
