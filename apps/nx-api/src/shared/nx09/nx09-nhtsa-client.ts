// apps/nx-api/src/shared/nx09/nx09-nhtsa-client.ts
// NX09-IMPL-02 NHTSA vPIC VIN decode client（純 fetch + env toggle + graceful fallback）
//
// 對齊：overview v0.2.0 §9 + plan v0.1.0 §2.L3 + Crown Q1=c
// 範式對齊：shared/nx06/nx06-google-maps-client.ts（純 fetch + env toggle + mock fallback）
//
// 業界真相（audit-02 §1+§2 揭露）：
//   - NHTSA vPIC API：美國國家公路交通安全管理局免費、無 key、無認證
//   - URL：https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json
//   - 亞洲車型覆蓋率較低（亞羅 VAG 70% + 亞系 20% + 歐美 10%）
//   - timeout 5s、失敗 graceful fallback → 業務員手動建檔

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin';
const NHTSA_TIMEOUT_MS = 5000;

/** 環境變數：NHTSA_API_ENABLED=false 時 skip call（測試 / 離線部署）。預設 true。 */
function isEnabled(): boolean {
  const v = process.env.NHTSA_API_ENABLED?.trim().toLowerCase();
  // 預設啟用（free API、無 key）、明確設為 'false' 才停用
  return v !== 'false';
}

export interface NhtsaDecodeResult {
  ok: boolean;
  vin: string;
  /** 由 Results 解析出來的關鍵欄位（可能 null = NHTSA 查不到）。*/
  make: string | null;
  model: string | null;
  modelYear: number | null;
  manufacturer: string | null;
  vehicleType: string | null;
  bodyClass: string | null;
  engineConfig: string | null;
  /** raw JSON（debug + 業務員補錄參考）。*/
  rawResponse: unknown;
  /** failure 原因（API disabled / timeout / HTTP error / parse error）。*/
  errorReason?: string;
}

interface NhtsaApiResponse {
  Count?: number;
  Results?: Array<{ Variable?: string; Value?: string | null }>;
}

/**
 * 對 NHTSA vPIC API 呼叫 VIN decode、回傳結構化結果。
 * 失敗一律 graceful（throw 不擴散、回傳 ok:false + errorReason）、上游服務以此走 MANUAL fallback。
 */
export async function decodeVinFromNhtsa(vin: string): Promise<NhtsaDecodeResult> {
  const cleanVin = vin.trim().toUpperCase();

  if (!isEnabled()) {
    return emptyResult(cleanVin, 'NHTSA_API_ENABLED=false');
  }

  const url = `${NHTSA_BASE}/${encodeURIComponent(cleanVin)}?format=json`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), NHTSA_TIMEOUT_MS);

  try {
    const resp = await fetch(url, { signal: ac.signal });
    if (!resp.ok) return emptyResult(cleanVin, `HTTP ${resp.status}`);
    const data = (await resp.json()) as NhtsaApiResponse;
    if (!data?.Results?.length) return emptyResult(cleanVin, 'NHTSA returned empty Results');

    const find = (variable: string): string | null => {
      const r = data.Results!.find((x) => x.Variable === variable);
      const v = r?.Value;
      if (v === undefined || v === null) return null;
      const trimmed = String(v).trim();
      return trimmed && trimmed !== 'null' && trimmed !== '0' ? trimmed : null;
    };
    const yearStr = find('Model Year');
    const yearNum = yearStr ? parseInt(yearStr, 10) : null;

    return {
      ok: true,
      vin: cleanVin,
      make: find('Make'),
      model: find('Model'),
      modelYear: yearNum && Number.isFinite(yearNum) ? yearNum : null,
      manufacturer: find('Manufacturer Name'),
      vehicleType: find('Vehicle Type'),
      bodyClass: find('Body Class'),
      engineConfig: find('Engine Configuration'),
      rawResponse: data,
    };
  } catch (err) {
    const isAbort = (err as Error)?.name === 'AbortError';
    return emptyResult(cleanVin, isAbort ? 'timeout 5s' : `fetch failed: ${(err as Error)?.message ?? 'unknown'}`);
  } finally {
    clearTimeout(t);
  }
}

function emptyResult(vin: string, reason: string): NhtsaDecodeResult {
  return {
    ok: false,
    vin,
    make: null,
    model: null,
    modelYear: null,
    manufacturer: null,
    vehicleType: null,
    bodyClass: null,
    engineConfig: null,
    rawResponse: null,
    errorReason: reason,
  };
}

export const NHTSA_ENABLED = (): boolean => isEnabled();
