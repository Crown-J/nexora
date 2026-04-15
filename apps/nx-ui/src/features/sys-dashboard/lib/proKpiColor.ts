/**
 * PRO 首頁 KPI 圓餅／色階（依顯示百分比）
 */

export function getKpiColor(percent: number): string {
  if (percent < 20) return '#E24B4A';
  if (percent < 40) return '#E8A020';
  if (percent < 60) return '#F5C842';
  if (percent < 80) return '#A8C015';
  return '#1D9E75';
}

export function getProKpiDisplayPercent(item: {
  current: number;
  target: number;
  reverse?: boolean;
}): number {
  if (item.target <= 0) return 0;
  if (item.reverse) {
    const deductionPct = Math.round(((item.target - item.current) / item.target) * 100);
    return Math.max(0, Math.min(100, 100 - deductionPct));
  }
  return Math.min(100, Math.round((item.current / item.target) * 100));
}
