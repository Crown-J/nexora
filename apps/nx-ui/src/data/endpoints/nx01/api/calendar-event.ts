// apps/nx-ui/src/data/endpoints/nx01/api/calendar-event.ts
// 2026-06-25 首頁儀表板「測試資料移除」Phase 1：補 calendar event endpoint client
// 後端 controller: apps/nx-api/src/nx01/calendar-event/calendar-event.controller.ts
//   GET /nx01/calendar-event?from=&to=  → { total, rows: CalendarEventDto[] }

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

export type CalendarEventDto = {
  id: string;
  title: string;
  type: string;
  dateStart: string;
  dateEnd: string | null;
  isAllDay: boolean;
  orderType: string | null;
  orderDocNo: string | null;
};

const BASE = '/nx01/calendar-event';

export async function listCalendarEvents(params?: {
  from?: string;
  to?: string;
}): Promise<CalendarEventDto[]> {
  const qs = buildQueryString({
    from: params?.from,
    to: params?.to,
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_calendar_event_list');
  const j = (await res.json()) as { total?: number; rows?: CalendarEventDto[] };
  return Array.isArray(j.rows) ? j.rows : [];
}
