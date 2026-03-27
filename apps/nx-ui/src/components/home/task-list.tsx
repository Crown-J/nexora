"use client"

import { useState } from "react"
import { ClipboardList, Circle, CheckCircle2, AlertTriangle, Truck, ReceiptText, FileClock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  orderNumber: string
  customer: string
  items: string
  dueDate: string
  status: "quote" | "shipping" | "invoice" | "urgent"
  completed: boolean
}

const initialTasks: Task[] = [
  {
    id: "1",
    orderNumber: "SO-2026032701",
    customer: "大同汽車",
    items: "煞車來令片 x5, 機油濾芯 x10",
    dueDate: "2026-03-28",
    status: "urgent",
    completed: false,
  },
  {
    id: "2",
    orderNumber: "SO-2026032702",
    customer: "永昌汽材",
    items: "雨刷片 x20, 空氣濾芯 x15",
    dueDate: "2026-03-29",
    status: "shipping",
    completed: false,
  },
  {
    id: "3",
    orderNumber: "SO-2026032703",
    customer: "金龍汽修",
    items: "火星塞 x8, 正時皮帶 x2",
    dueDate: "2026-03-30",
    status: "quote",
    completed: false,
  },
  {
    id: "4",
    orderNumber: "SO-2026032601",
    customer: "順發汽車",
    items: "避震器 x4",
    dueDate: "2026-03-27",
    status: "invoice",
    completed: false,
  },
]

const statusConfig = {
  quote: {
    label: "待報價",
    icon: FileClock,
    className: "text-sky-300 border-sky-500/30 bg-sky-500/10"
  },
  shipping: {
    label: "待出貨",
    icon: Truck,
    className: "text-violet-300 border-violet-500/30 bg-violet-500/10"
  },
  invoice: {
    label: "待開立發票",
    icon: ReceiptText,
    className: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
  },
  urgent: {
    label: "急件優先",
    icon: AlertTriangle,
    className: "text-destructive border-destructive/30 bg-destructive/10"
  },
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  const toggleComplete = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    )
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const statusOrder = { urgent: 0, shipping: 1, quote: 2, invoice: 3 }
    return statusOrder[a.status] - statusOrder[b.status]
  })

  return (
    <Card className="glass-panel h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
          <ClipboardList className="w-4 h-4 text-primary" />
          未完成訂單
          <Badge variant="outline" className="ml-auto text-xs text-foreground border-border">
            {tasks.filter((t) => !t.completed).length} 單
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-1">
          <div className="space-y-2">
            {sortedTasks.map((task) => {
              const statusMeta = statusConfig[task.status]
              const StatusIcon = statusMeta.icon
              return (
                <div
                  key={task.id}
                  onClick={() => toggleComplete(task.id)}
                  className={cn(
                    "p-3.5 rounded-xl bg-secondary/35 hover:bg-secondary/60 transition-all cursor-pointer group border border-border/60",
                    task.completed && "opacity-50",
                    task.status === "urgent" && !task.completed && "border-destructive/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-sm font-medium",
                          task.completed ? "line-through text-muted-foreground" : "text-foreground"
                        )}>
                          {task.orderNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 inline-flex items-center gap-1",
                            statusMeta.className
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusMeta.label}
                        </Badge>
                      </div>
                      <p className={cn(
                        "text-sm",
                        task.completed ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {task.customer}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {task.items}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        到期：{task.dueDate}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
