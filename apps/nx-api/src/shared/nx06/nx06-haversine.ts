// apps/nx-api/src/shared/nx06/nx06-haversine.ts
// NX06-IMPL-02 共用：地球大圓距離（Haversine）+ 半徑判斷 helper
//
// 對齊：overview v0.2.0 §4.3 動態任務轉派（亞羅簡化版半徑判斷）+ §4.1 #1/#2 路線優化基礎距離計算
// 性質：pure function、無外部依賴

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 兩 GPS 點之間距離（公里、Haversine 公式、誤差 < 0.5% < 100 km 範圍內）。 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Nearest-neighbor TSP heuristic：給起點 + 點列、回傳訪問順序 index 陣列。 */
export function nearestNeighborOrder(
  start: { lat: number; lng: number },
  points: Array<{ lat: number; lng: number }>,
): number[] {
  if (!points.length) return [];
  const remaining = points.map((_, i) => i);
  const order: number[] = [];
  let cur = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(cur, points[remaining[i]!]!);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const picked = remaining.splice(bestIdx, 1)[0]!;
    order.push(picked);
    cur = points[picked]!;
  }
  return order;
}

/** 配送速度估算（公里/小時、市區）。 */
export const URBAN_AVG_KMH = 25;

/** 距離 → 預估時長（秒）。市區平均 25 km/h。 */
export function estimateDurationSec(distanceKm: number): number {
  return Math.round((distanceKm / URBAN_AVG_KMH) * 3600);
}
