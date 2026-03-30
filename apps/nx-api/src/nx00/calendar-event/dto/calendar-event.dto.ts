/**
 * NX00 首頁行事曆 DTO（nx00_calendar_event）
 */

export type CalendarEventDto = {
  id: string;
  tenantId: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  /** S=SYSTEM / C=COMPANY / R=REMIND */
  scopeType: string;
  /** meeting | delivery | visit | other */
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

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ListCalendarEventQuery = {
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
};

export type CreateCalendarEventBody = {
  title: string;
  subtitle?: string | null;
  content?: string | null;
  scopeType: string;
  eventKind: string;
  dateStart: string;
  dateEnd: string;
  isAllDay?: boolean;
  location?: string | null;
  orderType?: string | null;
  orderId?: string | null;
  isActive?: boolean;
};

export type UpdateCalendarEventBody = {
  title?: string;
  subtitle?: string | null;
  content?: string | null;
  scopeType?: string;
  eventKind?: string;
  dateStart?: string;
  dateEnd?: string;
  isAllDay?: boolean;
  location?: string | null;
  orderType?: string | null;
  orderId?: string | null;
  isActive?: boolean;
};

export type SetActiveBody = {
  isActive: boolean;
};
