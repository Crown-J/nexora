type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

/**
 * 以 pageSize（預設 100，符合 nx-api Nx01ListQueryDto 上限）逐頁拉取，直到拿齊或達 maxPages。
 * 用於主檔／選人清單等需完整集合、但單次請求不可超過後端上限的情境。
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<Paged<T>>,
  opts?: { pageSize?: number; maxPages?: number },
): Promise<T[]> {
  const pageSize = Math.min(Math.max(opts?.pageSize ?? 100, 1), 100);
  const maxPages = Math.max(opts?.maxPages ?? 50, 1);
  const items: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const r = await fetchPage(page, pageSize);
    items.push(...r.items);
    if (r.items.length < pageSize || items.length >= r.total) break;
  }
  return items;
}
