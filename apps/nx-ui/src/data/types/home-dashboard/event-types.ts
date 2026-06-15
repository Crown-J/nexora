// apps/nx-ui/src/features/home-dashboard/event-types.ts
// 行事曆事件共用型別（CalendarPanel + EventBookPanel）

export type CalendarEvent = {
  id: string;
  title: string;
  /** S=SYSTEM / C=COMPANY / R=REMIND */
  type: string;
  dateStart: string;
  dateEnd: string;
  isAllDay: boolean;
  orderType?: string | null;
  orderDocNo?: string | null;
};
