"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { addHours, endOfDay, endOfMonth, format, parseISO, startOfDay, startOfMonth } from "date-fns"
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
import type { CalendarEventDto } from "@/features/home/api/calendar-event"
import {
  createCalendarEvent,
  listCalendarEvents,
  setCalendarEventActive,
  updateCalendarEvent,
} from "@/features/home/api/calendar-event"

export interface HomeCalendarEvent {
  id: string
  title: string
  subtitle: string
  content: string
  time: string
  date: string
  location?: string
  type: "meeting" | "delivery" | "visit" | "other"
  allDay?: boolean
  startAt?: string
  endAt?: string
}

function toEventKind(t: HomeCalendarEvent["type"]): string {
  return t
}

function parseEventKind(k: string): HomeCalendarEvent["type"] {
  if (k === "meeting" || k === "delivery" || k === "visit" || k === "other") return k
  return "other"
}

function dtoToHome(e: CalendarEventDto): HomeCalendarEvent {
  const start = parseISO(e.dateStart)
  const end = parseISO(e.dateEnd)
  const type = parseEventKind(e.eventKind)
  const date = format(start, "yyyy-MM-dd")
  let time = ""
  if (e.isAllDay) {
    time = start.getTime() === end.getTime() ? "整天" : `${format(start, "yyyy-MM-dd")}–${format(end, "yyyy-MM-dd")}`
  } else {
    time = `${format(start, "HH:mm")}–${format(end, "HH:mm")}`
  }
  return {
    id: e.id,
    title: e.title,
    subtitle: e.subtitle ?? "",
    content: e.content ?? "",
    date,
    time,
    location: e.location ?? undefined,
    type,
    allDay: e.isAllDay,
    startAt: e.dateStart,
    endAt: e.dateEnd,
  }
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
  if (e.allDay && e.startAt && e.endAt) {
    const s = startOfDay(parseISO(e.startAt))
    const en = endOfDay(parseISO(e.endAt))
    const anchor = parseISO(`${dayYmd}T12:00:00`)
    return anchor >= s && anchor <= en
  }
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

const eventTypeConfig = {
  meeting: { className: "border-l-primary", label: "會議" },
  delivery: { className: "border-l-green-500", label: "交貨" },
  visit: { className: "border-l-blue-500", label: "拜訪" },
  other: { className: "border-l-muted-foreground", label: "其他" },
}

interface CalendarDetailsProps {
  selectedDate: Date | undefined
  isAdmin?: boolean
}

export function CalendarDetails({ selectedDate, isAdmin = false }: CalendarDetailsProps) {
  const [events, setEvents] = useState<HomeCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dtoById, setDtoById] = useState<Record<string, CalendarEventDto>>({})

  const [createOpen, setCreateOpen] = useState(false)
  const [detailEvent, setDetailEvent] = useState<HomeCalendarEvent | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const displayDate = selectedDate ?? new Date()
  const dateKey = format(displayDate, "yyyy-MM-dd")

  const [formTitle, setFormTitle] = useState("")
  const [formSubtitle, setFormSubtitle] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formLocation, setFormLocation] = useState("")
  const [formScope, setFormScope] = useState<"S" | "C" | "R">("C")
  const [formType, setFormType] = useState<HomeCalendarEvent["type"]>("other")
  const [formAllDay, setFormAllDay] = useState(false)
  const [formStartDate, setFormStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [formEndDate, setFormEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [formStartYmd, setFormStartYmd] = useState(() => initialSplitForDay(format(new Date(), "yyyy-MM-dd")).s.ymd)
  const [formStartHm, setFormStartHm] = useState(() => initialSplitForDay(format(new Date(), "yyyy-MM-dd")).s.hm)
  const [formEndYmd, setFormEndYmd] = useState(() => initialSplitForDay(format(new Date(), "yyyy-MM-dd")).e.ymd)
  const [formEndHm, setFormEndHm] = useState(() => initialSplitForDay(format(new Date(), "yyyy-MM-dd")).e.hm)

  const loadMonth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const base = selectedDate ?? new Date()
      const from = format(startOfMonth(base), "yyyy-MM-dd")
      const to = format(endOfMonth(base), "yyyy-MM-dd")
      const q = await listCalendarEvents({ from, to, page: 1, pageSize: 200 })
      const map: Record<string, CalendarEventDto> = {}
      const home: HomeCalendarEvent[] = []
      for (const row of q.items) {
        map[row.id] = row
        home.push(dtoToHome(row))
      }
      setDtoById(map)
      setEvents(home)
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入行事曆失敗")
      setEvents([])
      setDtoById({})
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    void loadMonth()
  }, [loadMonth])

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
    setFormScope("C")
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    try {
      if (formAllDay) {
        if (!formStartDate || !formEndDate) return
        if (formStartDate > formEndDate) return
        const [ys, ms, ds] = formStartDate.split("-").map(Number)
        const [ye, me, de] = formEndDate.split("-").map(Number)
        const dateStart = new Date(ys, ms - 1, ds, 0, 0, 0, 0).toISOString()
        const dateEnd = new Date(ye, me - 1, de, 23, 59, 59, 999).toISOString()
        await createCalendarEvent({
          title: formTitle.trim(),
          subtitle: formSubtitle.trim() || null,
          content: formContent.trim() || null,
          scopeType: formScope,
          eventKind: toEventKind(formType),
          dateStart,
          dateEnd,
          isAllDay: true,
          location: formLocation.trim() || null,
        })
      } else {
        const start = new Date(`${formStartYmd}T${formStartHm}:00`)
        const end = new Date(`${formEndYmd}T${formEndHm}:00`)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
          return
        }
        await createCalendarEvent({
          title: formTitle.trim(),
          subtitle: formSubtitle.trim() || null,
          content: formContent.trim() || null,
          scopeType: formScope,
          eventKind: toEventKind(formType),
          dateStart: start.toISOString(),
          dateEnd: end.toISOString(),
          isAllDay: false,
          location: formLocation.trim() || null,
        })
      }
      setCreateOpen(false)
      resetCreateForm()
      await loadMonth()
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立失敗")
    }
  }

  const openEdit = (ev: HomeCalendarEvent) => {
    setEditingId(ev.id)
    const raw = dtoById[ev.id]
    setFormTitle(ev.title)
    setFormSubtitle(ev.subtitle)
    setFormContent(ev.content)
    setFormLocation(ev.location ?? "")
    setFormScope((raw?.scopeType as "S" | "C" | "R") || "C")
    setFormType(ev.type)
    setFormAllDay(Boolean(ev.allDay))
    if (ev.allDay && ev.startAt && ev.endAt) {
      const s = parseISO(ev.startAt)
      const en = parseISO(ev.endAt)
      setFormStartDate(format(s, "yyyy-MM-dd"))
      setFormEndDate(format(en, "yyyy-MM-dd"))
    } else if (ev.startAt && ev.endAt) {
      applyRangeToSplitFields({ start: toLocalInputValue(parseISO(ev.startAt)), end: toLocalInputValue(parseISO(ev.endAt)) })
    }
    setDetailEvent(null)
    setEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    try {
      if (formAllDay) {
        if (!formStartDate || !formEndDate || formStartDate > formEndDate) return
        const [ys, ms, ds] = formStartDate.split("-").map(Number)
        const [ye, me, de] = formEndDate.split("-").map(Number)
        const dateStart = new Date(ys, ms - 1, ds, 0, 0, 0, 0).toISOString()
        const dateEnd = new Date(ye, me - 1, de, 23, 59, 59, 999).toISOString()
        await updateCalendarEvent(editingId, {
          title: formTitle.trim(),
          subtitle: formSubtitle.trim() || null,
          content: formContent.trim() || null,
          scopeType: formScope,
          eventKind: toEventKind(formType),
          dateStart,
          dateEnd,
          isAllDay: true,
          location: formLocation.trim() || null,
        })
      } else {
        const start = new Date(`${formStartYmd}T${formStartHm}:00`)
        const end = new Date(`${formEndYmd}T${formEndHm}:00`)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return
        await updateCalendarEvent(editingId, {
          title: formTitle.trim(),
          subtitle: formSubtitle.trim() || null,
          content: formContent.trim() || null,
          scopeType: formScope,
          eventKind: toEventKind(formType),
          dateStart: start.toISOString(),
          dateEnd: end.toISOString(),
          isAllDay: false,
          location: formLocation.trim() || null,
        })
      }
      setEditOpen(false)
      setEditingId(null)
      resetCreateForm()
      await loadMonth()
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗")
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      await setCalendarEventActive(id, false)
      setDetailEvent(null)
      await loadMonth()
    } catch (err) {
      setError(err instanceof Error ? err.message : "停用失敗")
    }
  }

  return (
    <Card className="glass-panel h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            {format(displayDate, "M月d日 EEEE", { locale: zhTW })}
          </CardTitle>
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleCreateOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-xs text-primary hover:bg-primary/20 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              建立事件
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            當天事件
          </h4>
          <ScrollArea className="h-[270px] pr-1">
            <div className="space-y-2.5">
              {loading && (
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
                  載入中…
                </div>
              )}
              {!loading &&
                dayEvents.map((event) => (
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
              {!loading && dayEvents.length === 0 && (
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
                  這天尚無事件，{isAdmin ? "點「建立事件」新增。" : "目前沒有排程。"}
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
                  <Label htmlFor="evt-scope">範圍</Label>
                  <select
                    id="evt-scope"
                    value={formScope}
                    onChange={(ev) => setFormScope(ev.target.value as "S" | "C" | "R")}
                    className={cn(
                      "nx-native-select h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground",
                      "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    )}
                  >
                    <option value="S">系統</option>
                    <option value="C">公司</option>
                    <option value="R">提醒</option>
                  </select>
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

      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { resetCreateForm(); setEditingId(null) } }}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] gap-0 p-6 sm:max-w-[min(96vw,80rem)] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-0">
            <DialogHeader className="pb-4">
              <DialogTitle>編輯事件</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 py-1">
              <div className="space-y-3 min-w-0">
                <div className="grid gap-2">
                  <Label>標題</Label>
                  <Input value={formTitle} onChange={(ev) => setFormTitle(ev.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>副標題</Label>
                  <Input value={formSubtitle} onChange={(ev) => setFormSubtitle(ev.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>範圍</Label>
                  <select
                    value={formScope}
                    onChange={(ev) => setFormScope(ev.target.value as "S" | "C" | "R")}
                    className="nx-native-select h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="S">系統</option>
                    <option value="C">公司</option>
                    <option value="R">提醒</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>類型</Label>
                  <select
                    value={formType}
                    onChange={(ev) => setFormType(ev.target.value as HomeCalendarEvent["type"])}
                    className="nx-native-select h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="meeting">會議</option>
                    <option value="delivery">交貨</option>
                    <option value="visit">拜訪</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>地點</Label>
                  <Input value={formLocation} onChange={(ev) => setFormLocation(ev.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
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
                      <Label>開始日期</Label>
                      <Input type="date" value={formStartDate} onChange={(ev) => setFormStartDate(ev.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>結束日期</Label>
                      <Input type="date" value={formEndDate} onChange={(ev) => setFormEndDate(ev.target.value)} required />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input type="date" value={formStartYmd} onChange={(ev) => setFormStartYmd(ev.target.value)} />
                      <Input type="time" value={formStartHm} onChange={(ev) => setFormStartHm(ev.target.value)} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input type="date" value={formEndYmd} onChange={(ev) => setFormEndYmd(ev.target.value)} />
                      <Input type="time" value={formEndHm} onChange={(ev) => setFormEndHm(ev.target.value)} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>內容</Label>
                <Textarea value={formContent} onChange={(ev) => setFormContent(ev.target.value)} rows={12} className="min-h-[200px]" />
              </div>
            </div>
            <DialogFooter className="mt-6 gap-2 border-t border-border/50 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button type="submit">儲存</Button>
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
              <DialogFooter className="flex flex-wrap gap-2">
                {isAdmin && (
                  <>
                    <Button type="button" variant="secondary" onClick={() => openEdit(detailEvent)}>
                      編輯
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => void handleDeactivate(detailEvent.id)}>
                      停用
                    </Button>
                  </>
                )}
                <Button type="button" variant="outline" onClick={() => setDetailEvent(null)}>
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
