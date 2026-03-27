"use client"

import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { Calendar, Clock, MapPin, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Event {
  id: string
  title: string
  time: string
  date: string
  location?: string
  type: "meeting" | "delivery" | "visit" | "other"
}

const events: Event[] = [
  { id: "1", title: "供應商會議", date: "2026-03-27", time: "10:00", location: "會議室 A", type: "meeting" },
  { id: "2", title: "貨物到貨", date: "2026-03-27", time: "14:00", location: "倉庫", type: "delivery" },
  { id: "3", title: "客戶拜訪", date: "2026-03-28", time: "15:30", location: "客戶公司", type: "visit" },
  { id: "4", title: "月結前確認應收", date: "2026-03-31", time: "17:00", location: "財務辦公室", type: "other" },
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
  const displayDate = selectedDate || new Date()
  const dateKey = format(displayDate, "yyyy-MM-dd")
  const dayEvents = events.filter((event) => event.date === dateKey)

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
                <div
                  key={event.id}
                  className={`p-3.5 rounded-xl bg-secondary/35 border border-border/60 border-l-2 ${eventTypeConfig[event.type].className}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h5 className="text-sm font-medium text-foreground">{event.title}</h5>
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
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 text-foreground border-border">
                      {event.time}
                    </Badge>
                  </div>
                </div>
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
    </Card>
  )
}
