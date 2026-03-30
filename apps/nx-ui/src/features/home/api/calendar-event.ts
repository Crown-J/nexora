/**
 * 首頁行事曆 API（nx-api /calendar-event）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

export type CalendarEventDto = {
  id: string;
  tenantId: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  scopeType: string;
  eventKind: string;
  dateStart: string;
  dateEnd: string;
  isAllDay: boolean;
  location: string | null;
  orderType: string | null;
  orderId: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
};

export type PagedCalendarEvents = {
  items: CalendarEventDto[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listCalendarEvents(params: {
  from: string;
  to: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedCalendarEvents> {
  const qs = buildQueryString({
    from: params.from,
    to: params.to,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    isActive: 'true',
  });
  const res = await apiFetch(`/calendar-event${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_home_calendar_list');
  return res.json() as Promise<PagedCalendarEvents>;
}

export async function createCalendarEvent(body: {
  title: string;
  subtitle?: string | null;
  content?: string | null;
  scopeType: string;
  eventKind: string;
  dateStart: string;
  dateEnd: string;
  isAllDay?: boolean;
  location?: string | null;
}): Promise<CalendarEventDto> {
  const res = await apiFetch('/calendar-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_home_calendar_create');
  return res.json() as Promise<CalendarEventDto>;
}

export async function updateCalendarEvent(
  id: string,
  body: {
    title?: string;
    subtitle?: string | null;
    content?: string | null;
    scopeType?: string;
    eventKind?: string;
    dateStart?: string;
    dateEnd?: string;
    isAllDay?: boolean;
    location?: string | null;
  },
): Promise<CalendarEventDto> {
  const res = await apiFetch(`/calendar-event/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_home_calendar_update');
  return res.json() as Promise<CalendarEventDto>;
}

export async function setCalendarEventActive(id: string, isActive: boolean): Promise<CalendarEventDto> {
  const res = await apiFetch(`/calendar-event/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_home_calendar_active');
  return res.json() as Promise<CalendarEventDto>;
}
