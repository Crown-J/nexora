// apps/nx-api/src/shared/nx06/nx06-google-maps-client.ts
// NX06-IMPL-02 Google Maps Distance Matrix API 整合 client（env toggle mock vs real）
//
// 對齊：overview v0.2.0 §4.1 #1/#2 路線優化 + audit-02 §1 推薦組合
// Hank Q-H1：純 fetch + env key、無 axios（既有 nx-api 0 HTTP client）
// Hank Q-H3：API key 未到時 mock fallback（同 Lalamove 範式）

/** 環境變數：GOOGLE_MAPS_API_KEY 未設時走 mock 模式。 */
function getApiKey(): string | null {
  const k = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return k && process.env.GOOGLE_MAPS_API_ENABLED === 'true' ? k : null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DistanceMatrixCell {
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Google Maps Distance Matrix API call（origin/destination 矩陣）。
 * mock 模式（API key 未到時）：用 Haversine 估距 + URBAN_AVG_KMH 估時長。
 */
export async function fetchDistanceMatrix(
  origins: LatLng[],
  destinations: LatLng[],
): Promise<DistanceMatrixCell[][]> {
  const key = getApiKey();

  if (!key) {
    // mock fallback
    const { haversineKm, estimateDurationSec } = await import('./nx06-haversine');
    return origins.map((o) =>
      destinations.map((d) => {
        const km = haversineKm(o, d);
        return {
          distanceMeters: Math.round(km * 1000),
          durationSeconds: estimateDurationSec(km),
        };
      }),
    );
  }

  // real Google Maps Distance Matrix API
  const originsStr = origins.map((p) => `${p.lat},${p.lng}`).join('|');
  const destStr = destinations.map((p) => `${p.lat},${p.lng}`).join('|');
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destStr)}&mode=driving&key=${key}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Google Maps Distance Matrix HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as {
    status: string;
    rows: Array<{
      elements: Array<{
        status: string;
        distance?: { value: number };
        duration?: { value: number };
      }>;
    }>;
  };
  if (data.status !== 'OK') {
    throw new Error(`Google Maps Distance Matrix status=${data.status}`);
  }
  return data.rows.map((row) =>
    row.elements.map((el) => ({
      distanceMeters: el.distance?.value ?? 0,
      durationSeconds: el.duration?.value ?? 0,
    })),
  );
}

export const GOOGLE_MAPS_ENABLED = (): boolean => getApiKey() !== null;
