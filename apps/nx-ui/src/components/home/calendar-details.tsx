"use client"

import { useRef, useState } from "react"
import { addHours, endOfDay, format, parseISO, startOfDay } from "date-fns"
import { zhTW } from "date-fns/locale"
import { Calendar, CalendarDays, Clock, MapPin, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface HomeCalendarEvent {
  id: string
  title: string
  subtitle: string
  content: string
  /** 列表右側時間／區間摘要 */
  time: string
  /** 起始日 yyyy-MM-dd（相容與排序） */
  date: string
  location?: string
  type: "meeting" | "delivery" | "visit" | "other"
  allDay?: boolean
  startAt?: string
  endAt?: string
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultStartEndForDay(dateKey: string): { start: string; end: string } {
  const [y, m, d] = dateKey.split("-").map(Number)
  const start = new Date(y, m - 1, d, 9, 0, 0, 0)
  const end = addHours(start, 1)
  return { start: toLocalInputValue(start), end: toLocalInputValue(end) }
}

function splitLocalDatetime(isoLocal: string): { ymd: string; hm: string } {
  const [ymd, rest] = isoLocal.split("T")
  const hm = rest && rest.length >= 5 ? rest.slice(0, 5) : "09:00"
  return { ymd: ymd || "", hm }
}

function initialSplitForDay(dateKey: string) {
  const r = defaultStartEndForDay(dateKey)
  return { s: splitLocalDatetime(r.start), e: splitLocalDatetime(r.end) }
}

function getEventRange(e: HomeCalendarEvent): { start: Date; end: Date } | null {
  if (e.startAt && e.endAt) {
    const start = parseISO(e.startAt)
    const end = parseISO(e.endAt)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { start, end }
    }
  }
  const t = e.time
  if (!t || t === "全天" || t === "整天" || /^\d{4}-\d{2}-\d{2}[–-]\d{4}-\d{2}-\d{2}$/.test(t)) {
    return null
  }
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const [y, mo, d] = e.date.split("-").map(Number)
  const start = new Date(y, mo - 1, d, Number(m[1]), Number(m[2]), 0, 0)
  return { start, end: addHours(start, 1) }
}

function eventOverlapsDay(e: HomeCalendarEvent, dayYmd: string): boolean {
  const range = getEventRange(e)
  if (!range) {
    return e.date === dayYmd
  }
  const anchor = parseISO(`${dayYmd}T12:00:00`)
  const dayStart = startOfDay(anchor)
  const dayEnd = endOfDay(anchor)
  return range.start <= dayEnd && range.end >= dayStart
}

function formatDetailRange(e: HomeCalendarEvent): string {
  if (e.allDay && e.startAt && e.endAt) {
    const s = parseISO(e.startAt)
    const en = parseISO(e.endAt)
    return `${format(s, "yyyy-MM-dd", { locale: zhTW })} ～ ${format(en, "yyyy-MM-dd", { locale: zhTW })}（整天）`
  }
  const range = getEventRange(e)
  if (!range) return e.time
  return `${format(range.start, "yyyy-MM-dd HH:mm", { locale: zhTW })} ～ ${format(range.end, "yyyy-MM-dd HH:mm", { locale: zhTW })}`
}

const seedEvents: HomeCalendarEvent[] = [
  {
    id: "1",
    title: "供應商會議",
    subtitle: "季度檢討",
    content: "與主要供應商討論下一季交期與價格條件。",
    date: "2026-03-27",
    time: "10:00",
    location: "會議室 A",
    type: "meeting",
    startAt: "2026-03-27T10:00:00",
    endAt: "2026-03-27T11:00:00",
  },
  {
    id: "2",
    title: "貨物到貨",
    subtitle: "進貨驗收",
    content: "預定到貨批次驗收與入庫。",
    date: "2026-03-27",
    time: "14:00",
    location: "倉庫",
    type: "delivery",
    startAt: "2026-03-27T14:00:00",
    endAt: "2026-03-27T15:30:00",
  },
  {
    id: "3",
    title: "客戶拜訪",
    subtitle: "業務行程",
    content: "現場了解客戶需求與後續訂單規劃。",
    date: "2026-03-28",
    time: "15:30",
    location: "客戶公司",
    type: "visit",
    startAt: "2026-03-28T15:30:00",
    endAt: "2026-03-28T17:00:00",
  },
  {
    id: "4",
    title: "月結前確認應收",
    subtitle: "財務",
    content: "核對帳款與沖帳項目。",
    date: "2026-03-31",
    time: "17:00",
    location: "財務辦公室",
    type: "other",
    startAt: "2026-03-31T17:00:00",
    endAt: "2026-03-31T18:00:00",
  },
]

const eventTypeConfig = {
  meeting: { className: "border-l-primary", label: "會議" },
  delivery: { className: "border-l-green-500", label: "交貨" },
  visit: { className: "border-l-blue-500", label: "拜訪" },
  other: { className: "border-l-muted-foreground", label: "其他" },
}

interface CalendarDetailsProps {
  selectedDate: Date | undefined
}

export function CalendarDetails({ selectedDate }: CalendarDetailsProps) {
  const fallbackId = useRef(0)
  const [events, setEvents] = useState<HomeCalendarEvent[]>(seedEvents)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailEvent, setDetailEvent] = useState<HomeCalendarEvent | null>(null)

  const displayDate = selectedDate ?? new Date()
  const dateKey = format(displayDate, "yyyy-MM-dd")

  const [formTitle, setFormTitle] = useState("")
  const [formSubtitle, setFormSubtitle] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formLocation, setFormLocation] = useState("")
  const [formType, setFormType] = useState<HomeCalendarEvent["type"]>("other")
  const [formAllDay, setFormAllDay] = useState(false)
  const [formStartDate, setFormStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [formEndDate, setFormEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [formStartYmd, setFormStartYmd] = useState(() => initialSplitForDay(format(new Date(), "yyyy-MM-dd")).s.ymd)
  const [formStartHm, setFormStartHm] = useState(() => initialSplitForDay(format(new Date(), "yyyy-MM-dd")).s.hm)
  const [formEndYmd, setFormEndYmd] = useState(() => initialSplitForDay(format(new Date(), "yyyy-MM-dd")).e.ymd)
  const [formEndHm, setFormEndHm] = useState(() => initialSplitForDay(format(new Date(), "yyyy-MM-dd")).e.hm)

  const dayEvents = events.filter((e) => eventOverlapsDay(e, dateKey))

  const applyRangeToSplitFields = (range: { start: string; end: string }) => {
    const s = splitLocalDatetime(range.start)
    const e = splitLocalDatetime(range.end)
    setFormStartYmd(s.ymd)
    setFormStartHm(s.hm)
    setFormEndYmd(e.ymd)
    setFormEndHm(e.hm)
  }

  const resetCreateForm = () => {
    const d = defaultStartEndForDay(dateKey)
    setFormTitle("")
    setFormSubtitle("")
    setFormContent("")
    setFormLocation("")
    setFormType("other")
    setFormAllDay(false)
    setFormStartDate(dateKey)
    setFormEndDate(dateKey)
    applyRangeToSplitFields(d)
  }

  const handleCreateOpen = (open: boolean) => {
    setCreateOpen(open)
    if (open) {
      const d = defaultStartEndForDay(dateKey)
      setFormAllDay(false)
      setFormStartDate(dateKey)
      setFormEndDate(dateKey)
      applyRangeToSplitFields(d)
    } else {
      resetCreateForm()
    }
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    if (formAllDay) {
      if (!formStartDate || !formEndDate) return
      if (formStartDate > formEndDate) return
      const [ys, ms, ds] = formStartDate.split("-").map(Number)
      const [ye, me, de] = formEndDate.split("-").map(Number)
      const startAt = new Date(ys, ms - 1, ds, 0, 0, 0, 0).toISOString()
      const endAt = new Date(ye, me - 1, de, 23, 59, 59, 999).toISOString()
      const timeLabel =
        formStartDate === formEndDate ? "整天" : `${formStartDate}–${formEndDate}`
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `evt-${++fallbackId.current}`
      setEvents((prev) => [
        ...prev,
        {
          id,
          title: formTitle.trim(),
          subtitle: formSubtitle.trim(),
          content: formContent.trim(),
          time: timeLabel,
          date: formStartDate,
          location: formLocation.trim() || undefined,
          type: formType,
          allDay: true,
          startAt,
          endAt,
        },
      ])
      setCreateOpen(false)
      resetCreateForm()
      return
    }

    const start = new Date(`${formStartYmd}T${formStartHm}:00`)
    const end = new Date(`${formEndYmd}T${formEndHm}:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return
    }
    const startAt = start.toISOString()
    const endAt = end.toISOString()
    const date = format(start, "yyyy-MM-dd")
    const timeLabel = `${format(start, "HH:mm")}–${format(end, "HH:mm")}`
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `evt-${++fallbackId.current}`
    setEvents((prev) => [
      ...prev,
      {
        id,
        title: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        content: formContent.trim(),
        time: timeLabel,
        date,
        location: formLocation.trim() || undefined,
        type: formType,
        allDay: false,
        startAt,
        endAt,
      },
    ])
    setCreateOpen(false)
    resetCreateForm()
  }

  return (
    <Card className="glass-panel h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            {format(displayDate, "M月d日 EEEE", { locale: zhTW })}
          </CardTitle>
          <button
            type="button"
            onClick={() => handleCreateOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-xs text-primary hover:bg-primary/20 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            建立事件
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            當天事件
          </h4>
          <ScrollArea className="h-[270px] pr-1">
            <div className="space-y-2.5">
              {dayEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setDetailEvent(event)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl bg-secondary/35 border border-border/60 border-l-2 transition-all duration-200",
                    "hover:bg-secondary/55 hover:border-primary/30",
                    eventTypeConfig[event.type].className,
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h5 className="text-sm font-medium text-foreground">{event.title}</h5>
                      {event.subtitle ? (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.subtitle}</p>
                      ) : null}
                      <p className="mt-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border-border/70 text-muted-foreground"
                        >
                          {eventTypeConfig[event.type].label}
                        </Badge>
                      </p>
                      {event.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs shrink-0 text-foreground border-border max-w-[120px] truncate"
                      title={event.time}
                    >
                      {event.time}
                    </Badge>
                  </div>
                </button>
              ))}
              {dayEvents.length === 0 && (
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
                  這天尚無事件，點「建立事件」新增。
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>

      <Dialog open={createOpen} onOpenChange={handleCreateOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] gap-0 p-6 sm:max-w-[min(96vw,80rem)] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-0">
            <DialogHeader className="pb-4">
              <DialogTitle>建立事件</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 py-1">
              <div className="space-y-3 min-w-0">
                <div className="grid gap-2">
                  <Label htmlFor="evt-title">標題</Label>
                  <Input
                    id="evt-title"
                    value={formTitle}
                    onChange={(ev) => setFormTitle(ev.target.value)}
                    placeholder="必填"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="evt-subtitle">副標題</Label>
                  <Input
                    id="evt-subtitle"
                    value={formSubtitle}
                    onChange={(ev) => setFormSubtitle(ev.target.value)}
                    placeholder="選填"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="evt-type">類型</Label>
                  <select
                    id="evt-type"
                    value={formType}
                    onChange={(ev) => setFormType(ev.target.value as HomeCalendarEvent["type"])}
                    className={cn(
                      "nx-native-select h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground",
                      "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    )}
                  >
                    <option value="meeting">會議</option>
                    <option value="delivery">交貨</option>
                    <option value="visit">拜訪</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="evt-loc" className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    地點
                  </Label>
                  <Input
                    id="evt-loc"
                    value={formLocation}
                    onChange={(ev) => setFormLocation(ev.target.value)}
                    placeholder="選填"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none pt-0.5">
                  <input
                    type="checkbox"
                    checked={formAllDay}
                    onChange={(ev) => setFormAllDay(ev.target.checked)}
                    className="rounded border-border size-4 accent-primary"
                  />
                  整天
                </label>

                {formAllDay ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="evt-sd" className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                        開始日期
                      </Label>
                      <Input
                        id="evt-sd"
                        type="date"
                        value={formStartDate}
                        onChange={(ev) => setFormStartDate(ev.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="evt-ed" className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                        結束日期
                      </Label>
                      <Input
                        id="evt-ed"
                        type="date"
                        value={formEndDate}
                        onChange={(ev) => setFormEndDate(ev.target.value)}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="evt-symd" className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                          開始日期
                        </Label>
                        <Input
                          id="evt-symd"
                          type="date"
                          value={formStartYmd}
                          onChange={(ev) => setFormStartYmd(ev.target.value)}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="evt-shm" className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          開始時間
                        </Label>
                        <Input
                          id="evt-shm"
                          type="time"
                          value={formStartHm}
                          onChange={(ev) => setFormStartHm(ev.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="evt-eymd" className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                          結束日期
                        </Label>
                        <Input
                          id="evt-eymd"
                          type="date"
                          value={formEndYmd}
                          onChange={(ev) => setFormEndYmd(ev.target.value)}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="evt-ehm" className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          結束時間
                        </Label>
                        <Input
                          id="evt-ehm"
                          type="time"
                          value={formEndHm}
                          onChange={(ev) => setFormEndHm(ev.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 min-h-[280px] lg:min-h-[360px]">
                <Label htmlFor="evt-content">內容</Label>
                <Textarea
                  id="evt-content"
                  value={formContent}
                  onChange={(ev) => setFormContent(ev.target.value)}
                  placeholder="選填"
                  className="min-h-[260px] flex-1 resize-y lg:min-h-[320px]"
                />
              </div>
            </div>
            <DialogFooter className="mt-6 gap-2 sm:justify-end border-t border-border/50 pt-4">
              <Button type="button" variant="outline" onClick={() => handleCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit">建立</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailEvent} onOpenChange={(o) => !o && setDetailEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {detailEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{detailEvent.title}</DialogTitle>
                {detailEvent.subtitle ? (
                  <DialogDescription className="text-foreground/80">{detailEvent.subtitle}</DialogDescription>
                ) : null}
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{eventTypeConfig[detailEvent.type].label}</Badge>
                </div>
                <p className="text-muted-foreground tabular-nums">{formatDetailRange(detailEvent)}</p>
                {detailEvent.location ? (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 shrink-0" />
                    {detailEvent.location}
                  </p>
                ) : null}
                {detailEvent.content ? (
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{detailEvent.content}</p>
                ) : (
                  <p className="text-muted-foreground italic">無內文</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setDetailEvent(null)}>
                  關閉
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
