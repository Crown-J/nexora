"use client"

import { useState } from "react"
import { zhTW } from "date-fns/locale"
import { DayPicker, DayButtonProps } from "react-day-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { format, addMonths, subMonths, isSameDay } from "date-fns"

interface CalendarPanelProps {
  selectedDate: Date | undefined
  onDateSelect: (date: Date | undefined) => void
}

// ★ 完全自訂 DayButton，掌控每一天的樣式邏輯
function CustomDayButton({ day, modifiers, onClick, ...props }: DayButtonProps) {
  const isToday = modifiers.today
  const isSelected = modifiers.selected
  const isOutside = modifiers.outside

  let className =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg p-0 transition-colors "

  if (isOutside) {
    className += "text-muted-foreground/40 font-normal "
  } else if (isToday) {
    // 今天永遠橘底，不管有沒有被選取
    className +=
      "bg-primary text-primary-foreground font-semibold hover:ring-2 hover:ring-foreground/40 "
    if (isSelected) {
      // 今天同時被選取：橘底 + 外框
      className += "ring-2 ring-foreground/40 "
    }
  } else if (isSelected) {
    // 選取非今天的日期：灰底 + 外框
    className +=
      "bg-secondary text-foreground font-semibold ring-1 ring-foreground/30 hover:bg-secondary "
  } else {
    // 一般日期：hover 只加外框
    className +=
      "text-foreground font-normal hover:ring-1 hover:ring-foreground/30 "
  }

  return (
    <button {...props} onClick={onClick} className={className}>
      {day.date.getDate()}
    </button>
  )
}

export function CalendarPanel({ selectedDate, onDateSelect }: CalendarPanelProps) {
  const [month, setMonth] = useState(new Date())

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
          <CalendarDays className="w-4 h-4 text-primary" />
          行事曆
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 sm:px-3">
        <div className="flex items-center justify-between h-10 px-1 mb-1">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="h-7 w-7 rounded-full bg-secondary/90 hover:bg-secondary text-foreground shadow-sm flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xl font-semibold text-foreground">
            {format(month, "yyyy年M月", { locale: zhTW })}
          </span>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="h-7 w-7 rounded-full bg-secondary/90 hover:bg-secondary text-foreground shadow-sm flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          month={month}
          onMonthChange={setMonth}
          locale={zhTW}
          weekStartsOn={0}
          hideNavigation
          className="home-calendar w-full"
          classNames={{
            months: "w-full",
            month: "w-full",
            month_caption: "hidden",
            table: "w-full border-collapse",
            weekdays: "flex w-full",
            weekday:
              "text-muted-foreground flex-1 font-normal text-[0.8rem] text-center",
            week: "flex w-full mt-1.5",
            day: "flex-1 p-0 flex items-center justify-center",
            day_button: "",
            today: "",
            selected: "",
            outside: "",
          }}
          components={{
            DayButton: CustomDayButton,
          }}
        />
      </CardContent>
    </Card>
  )
}