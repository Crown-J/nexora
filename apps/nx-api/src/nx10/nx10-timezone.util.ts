/**
 * 租戶曆日（YYYY-MM-DD），供簽到／日任務 period 使用。
 */
export function formatYmdInTimeZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** 以租戶時區為準，從現在往回推 N 個曆日（0=今天，1=昨天）。 */
export function ymdDaysAgoFromNow(daysAgo: number, timeZone: string): string {
  const ms = Date.now() - daysAgo * 86_400_000;
  return formatYmdInTimeZone(new Date(ms), timeZone);
}
