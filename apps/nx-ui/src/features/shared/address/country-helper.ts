// apps/nx-ui/src/features/shared/address/country-helper.ts
// 02 真正完工軌 2026-06-07：國家清單共用 helper
//
// 動態抓 nx01_country、判斷「是否台灣」用 country.code='TWN'（不依賴 hard-code id）
import { apiFetch } from '@/shared/api/client';

export type CountryRow = { id: string; code: string; name: string; isActive?: boolean };

let cache: CountryRow[] | null = null;
let inflight: Promise<CountryRow[]> | null = null;

/** 抓全 active 國家清單、模組層 cache 一次（同頁多 picker 不重抓） */
export async function fetchCountries(): Promise<CountryRow[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await apiFetch('/nx01/countries?pageSize=200&isActive=true', { method: 'GET' });
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
