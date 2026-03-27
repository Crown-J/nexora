"use client"

import { zhTW } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays } from "lucide-react"

interface CalendarPanelProps {
  selectedDate: Date | undefined
  onDateSelect: (date: Date | undefined) => void
}

export function CalendarPanel({ selectedDate, onDateSelect }: CalendarPanelProps) {
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
          <CalendarDays className="w-4 h-4 text-primary" />
          行事曆
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          locale={zhTW}
          className="home-calendar rounded-md w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-head_th]:w-auto [&_.rdp-tbody_td]:w-auto"
          classNames={{
            months: "w-full",
            month: "w-full space-y-4",
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
            row: "flex w-full mt-2",
            cell: "flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
            day: "h-8 w-full p-0 font-normal text-foreground rounded-md transition-colors",
            day_selected: "font-semibold",
            day_today: "",
            day_outside: "text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
            day_hidden: "invisible",
          }}
        />
      </CardContent>
    </Card>
  )
}
