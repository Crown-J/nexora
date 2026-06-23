// apps/nx-ui/src/features/shared/address/country-helper.ts
// 02 真正完工軌 2026-06-07：國家清單共用 helper
//
// 動態抓 nx01_country、判斷「是否台灣」用 country.code='TWN'（不依賴 hard-code id）
import { apiFetch } from '@data/api/client';

export type CountryRow = { id: string; code: string; name: string; isActive?: boolean };

let cache: CountryRow[] | null = null;
let inflight: Promise<CountryRow[]> | null = null;

/** 抓全 active 國家清單、模組層 cache 一次（同頁多 picker 不重抓） */
export async function fetchCountries(): Promise<CountryRow[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      // 2026-06-23 修：原本 pageSize=200 撞後端 Nx01ListQueryDto max=100 → 400 →
      // countries 回空 → findTaiwanId 為 null → cities 永遠拉不到 → 地址 picker 全空。
      // 改成 pageSize=100（NEXORA 用戶國別不會超過 100 國、夠用）。
      const res = await apiFetch('/nx01/countries?pageSize=100&isActive=true', { method: 'GET' });
      if (!res.ok) {
        inflight = null;
        return [];
      }
      const j = (await res.json()) as { items?: CountryRow[]; rows?: CountryRow[] };
      const list = j.items ?? j.rows ?? [];
      cache = list;
      inflight = null;
      return list;
    } catch {
      inflight = null;
      return [];
    }
  })();
  return inflight;
}

/** 判斷 countryId 是否為台灣（null 或 code='TWN'） */
export function isTaiwan(countryId: string | null | undefined, countries: CountryRow[]): boolean {
  if (!countryId) return true; // null 預設台灣
  const row = countries.find((c) => c.id === countryId);
  return !row || row.code === 'TWN';
}

/** 找台灣的 id（用於 listCities filter） */
export function findTaiwanId(countries: CountryRow[]): string | null {
  return countries.find((c) => c.code === 'TWN')?.id ?? null;
}
