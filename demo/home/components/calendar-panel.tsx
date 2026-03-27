"use client"

import { motion } from "framer-motion"
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-2 border-b border-border/30">
          <CardTitle className="text-base font-semibold flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-xl bg-primary/15 border border-primary/20">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            行事曆
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            locale={zhTW}
            className="rounded-xl w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full"
            classNames={{
              months: "w-full",
              month: "w-full space-y-4",
              caption: "flex justify-center pt-1 relative items-center text-foreground",
              caption_label: "text-sm font-semibold",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-secondary rounded-lg transition-all",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex w-full",
              head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-[0.75rem] text-center py-2",
              row: "flex w-full mt-1",
              cell: "flex-1 text-center text-sm p-0.5 relative focus-within:relative focus-within:z-20",
              day: "h-9 w-full p-0 font-normal text-foreground/80 hover:text-foreground aria-selected:opacity-100 hover:bg-secondary/60 rounded-lg transition-all duration-200",
              day_selected: "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:from-primary hover:to-primary/80 hover:text-primary-foreground focus:from-primary focus:to-primary/80 focus:text-primary-foreground shadow-lg glow-primary font-semibold",
              day_today: "bg-secondary text-foreground font-semibold border border-primary/30",
              day_outside: "text-muted-foreground/40 hover:text-muted-foreground/60",
              day_disabled: "text-muted-foreground/30",
              day_hidden: "invisible",
            }}
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}
