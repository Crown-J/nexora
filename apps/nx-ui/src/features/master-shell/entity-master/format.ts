// apps/nx-ui/src/features/master-shell/entity-master/format.ts
/**
 * 主檔共用格式化 helper（全 23 主檔一致）
 */

/**
 * 時間欄位顯示為業界繁中友善格式（12 小時制 + 上午/下午）。
 * 例：2026-05-27T00:50:46.873Z → 「2026-05-27 上午 12:50:46」
 * 用於所有主檔的最後登入 / 建立 / 修改 / 指派時間等欄位。
 */
export function formatDateTimeZh(iso: unknown): string {
  if (iso == null || iso === '') return '—';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  let h = d.getHours();
  const ampm = h < 12 ? '上午' : '下午';
  h = h % 12;
  if (h === 0) h = 12;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${ampm} ${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
