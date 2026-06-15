/**
 * File: apps/nx-ui/src/shared/lib/cx.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-001：共用工具（className 合併）
 */

/**
 * @FUNCTION_CODE NX00-UI-SHARED-001-F01
 * 說明：
 * - 將多個 className 片段安全合併成字串
 * - 支援 false/null/undefined（會自動忽略）
 *
 * 使用時機：
 * - Tailwind className 很長、需要條件組合時
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}