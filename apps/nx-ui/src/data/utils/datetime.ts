/**
 * File: apps/nx-ui/src/shared/format/datetime.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-DATETIME-001：Datetime formatter（zh-TW / Asia-Taipei）
 *
 * Output:
 * - 2026-02-17 上午 08:30
 */

export function formatDatetimeZhTw(iso: string | null | undefined) {
    if (!iso) return '-';

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';

    const parts = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).formatToParts(d);

    const map = Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<string, string>;

    // zh-TW 的 dayPeriod 會是「上午/下午」
    const yyyy = map.year ?? '0000';
    const mm = map.month ?? '00';
    const dd = map.day ?? '00';
    const period = map.dayPeriod ?? '';
    const hh = map.hour ?? '00';
    const min = map.minute ?? '00';

    return `${yyyy}-${mm}-${dd} ${period} ${hh}:${min}`;
}