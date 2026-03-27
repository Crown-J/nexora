"use client"

import { motion } from "framer-motion"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { Users, Calendar, Clock, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Employee {
  id: string
  name: string
  status: "present" | "absent" | "late" | "leave"
  checkIn?: string
}

interface Event {
  id: string
  title: string
  time: string
  location?: string
  type: "meeting" | "delivery" | "visit" | "other"
}

const employees: Employee[] = [
  { id: "1", name: "王小明", status: "present", checkIn: "08:30" },
  { id: "2", name: "李美玲", status: "present", checkIn: "08:45" },
  { id: "3", name: "張志豪", status: "late", checkIn: "09:15" },
  { id: "4", name: "陳怡君", status: "leave" },
  { id: "5", name: "林大偉", status: "present", checkIn: "08:28" },
]

const events: Event[] = [
  { id: "1", title: "供應商會議", time: "10:00", location: "會議室 A", type: "meeting" },
  { id: "2", title: "貨物到貨", time: "14:00", location: "倉庫", type: "delivery" },
  { id: "3", title: "客戶拜訪", time: "15:30", location: "客戶公司", type: "visit" },
]

const statusConfig = {
  present: { label: "出勤", className: "bg-chart-4/15 text-chart-4 border-chart-4/30" },
  absent: { label: "缺勤", className: "bg-destructive/15 text-destructive border-destructive/30" },
  late: { label: "遲到", className: "bg-chart-5/15 text-chart-5 border-chart-5/30" },
  leave: { label: "請假", className: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
}

const eventTypeConfig = {
  meeting: { className: "border-l-primary bg-primary/5", icon: "bg-primary" },
  delivery: { className: "border-l-chart-4 bg-chart-4/5", icon: "bg-chart-4" },
  visit: { className: "border-l-chart-2 bg-chart-2/5", icon: "bg-chart-2" },
  other: { className: "border-l-muted-foreground bg-muted/50", icon: "bg-muted-foreground" },
}

interface CalendarDetailsProps {
  selectedDate: Date | undefined
}

export function CalendarDetails({ selectedDate }: CalendarDetailsProps) {
  const displayDate = selectedDate || new Date()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
    >
      <Card className="glass-card h-full overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base font-semibold flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-xl bg-primary/15 border border-primary/20">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <span>{format(displayDate, "M月d日", { locale: zhTW })}</span>
            <Badge variant="outline" className="font-normal text-xs border-border/50 text-muted-foreground">
              {format(displayDate, "EEEE", { locale: zhTW })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-6">
          {/* Attendance Section */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              員工出勤狀況
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                {employees.filter(e => e.status === 'present').length}/{employees.length} 人出勤
              </span>
            </h4>
            <ScrollArea className="h-[100px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {employees.map((emp, index) => (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: 0.05 * index }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8 border border-border/50">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-semibold">
                        {emp.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                      {emp.checkIn && (
                        <p className="text-[10px] text-muted-foreground tabular-nums">{emp.checkIn} 打卡</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 font-medium ${statusConfig[emp.status].className}`}
                    >
                      {statusConfig[emp.status].label}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Events Section */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              當天活動
              <Badge variant="outline" className="text-[10px] font-normal border-border/50 text-muted-foreground ml-auto">
                {events.length} 項
              </Badge>
            </h4>
            <ScrollArea className="h-[120px]">
              <div className="space-y-2">
                {events.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                    className={`p-3 rounded-xl border-l-3 transition-all duration-300 hover:translate-x-1 cursor-pointer ${eventTypeConfig[event.type].className}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${eventTypeConfig[event.type].icon}`} />
                          <h5 className="text-sm font-medium text-foreground">{event.title}</h5>
                        </div>
                        {event.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className="text-xs shrink-0 text-foreground border-border/50 bg-background/50 tabular-nums font-semibold"
                      >
                        {event.time}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
