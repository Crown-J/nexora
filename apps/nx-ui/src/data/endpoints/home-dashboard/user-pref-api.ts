// apps/nx-ui/src/features/home-dashboard/user-pref-api.ts
// 使用者偏好設定 API client

import { apiJson } from '@data/api/client';

import { EMPTY_METRICS, METRICS_PREF_KEY, type MetricsPrefValue } from '@/features/home-dashboard/metric-options.config';

type PrefRow<T = unknown> = {
  prefKey: string;
  prefValue: T;
  updatedAt: string;
};

/** 拉首頁儀表板 5 格設定（不存在回 EMPTY_METRICS）*/
export async function fetchMetricsPref(): Promise<MetricsPrefValue> {
  try {
    const row = await apiJson<PrefRow<MetricsPrefValue> | null>(
      `/nx01/user-pref/${METRICS_PREF_KEY}`,
      { method: 'GET' },
    );
    if (!row || !row.prefValue) return EMPTY_METRICS;
    const slots = Array.isArray(row.prefValue.slots) ? row.prefValue.slots : [];
    // 補滿 5 格
    const normalized = [...slots];
    while (normalized.length < 5) normalized.push(null);
    return { slots: normalized.slice(0, 5) };
  } catch {
    return EMPTY_METRICS;
  }
}

/** 儲存首頁儀表板 5 格設定（upsert）*/
export async function saveMetricsPref(value: MetricsPrefValue): Promise<void> {
  await apiJson(`/nx01/user-pref/${METRICS_PREF_KEY}`, {
    method: 'PUT',
    body: JSON.stringify({ prefValue: value }),
  });
}
