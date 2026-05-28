/**
 * nx-api 共用列表 DTO（Nx01ListQueryDto）對 pageSize 有 @Max(100)。
 * 前端任何路徑（含 URL query、舊 master client）都應經此 clamp，避免 400。
 */
export const NX01_MAX_LIST_PAGE_SIZE = 100;

export function clampNx01ListPageSize(pageSize: number | undefined, fallback = 20): number {
  const raw = pageSize == null || !Number.isFinite(Number(pageSize)) ? fallback : Math.trunc(Number(pageSize));
  return Math.min(Math.max(raw, 1), NX01_MAX_LIST_PAGE_SIZE);
}
