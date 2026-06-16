// apps/nx-ui/src/data/mocks/report-hub.ts
/**
 * 報表中心首頁 Mock（待串接 API）
 */

export const mockReportCounts = {
  daily: { pending: 1, total: 28 },
  monthly: { pending: 0, total: 12 },
  export: { total: 156 },
} as const;
