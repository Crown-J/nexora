"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ClipboardList, Circle, CheckCircle2, Clock, AlertTriangle, Package } from "lucide-react"
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
  status: "pending" | "processing" | "urgent"
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
    status: "processing",
    completed: false,
  },
  {
    id: "3",
    orderNumber: "SO-2026032703",
    customer: "金龍汽修",
    items: "火星塞 x8, 正時皮帶 x2",
    dueDate: "2026-03-30",
    status: "pending",
    completed: false,
  },
  {
    id: "4",
    orderNumber: "SO-2026032601",
    customer: "順發汽車",
    items: "避震器 x4",
    dueDate: "2026-03-27",
    status: "urgent",
    completed: false,
  },
]

const statusConfig = {
  pending: { 
    label: "待處理", 
    icon: Circle, 
    className: "text-muted-foreground border-muted-foreground/30 bg-muted/20",
    iconColor: "text-muted-foreground"
  },
  processing: { 
    label: "處理中", 
    icon: Clock, 
    className: "text-chart-2 border-chart-2/30 bg-chart-2/10",
    iconColor: "text-chart-2"
  },
  urgent: { 
    label: "急件", 
    icon: AlertTriangle, 
    className: "text-destructive border-destructive/30 bg-destructive/10",
    iconColor: "text-destructive"
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
    const statusOrder = { urgent: 0, processing: 1, pending: 2 }
    return statusOrder[a.status] - statusOrder[b.status]
  })

  const pendingCount = tasks.filter((t) => !t.completed).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
    >
      <Card className="glass-card h-full overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base font-semibold flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-xl bg-primary/15 border border-primary/20">
              <ClipboardList className="w-4 h-4 text-primary" />
            </div>
            任務清單
            <Badge 
              variant="outline" 
              className={cn(
                "ml-auto text-xs font-semibold",
                pendingCount > 0 
                  ? "border-destructive/30 bg-destructive/10 text-destructive" 
                  : "border-chart-4/30 bg-chart-4/10 text-chart-4"
              )}
            >
              {pendingCount} 筆待處理
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-[280px] pr-2">
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {sortedTasks.map((task, index) => {
                  const StatusIcon = statusConfig[task.status].icon
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: 0.03 * index }}
                      onClick={() => toggleComplete(task.id)}
                      className={cn(
                        "relative p-4 rounded-xl transition-all duration-300 cursor-pointer group",
                        "bg-secondary/30 hover:bg-secondary/50 border border-transparent",
                        task.completed && "opacity-50",
                        task.status === "urgent" && !task.completed && "border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                      )}
                    >
                      {/* Status indicator line */}
                      {!task.completed && (
                        <div className={cn(
                          "absolute left-0 top-4 bottom-4 w-0.5 rounded-full transition-all",
                          task.status === "urgent" && "bg-destructive",
                          task.status === "processing" && "bg-chart-2",
                          task.status === "pending" && "bg-muted-foreground/50"
                        )} />
                      )}

                      <div className="flex items-start gap-3 pl-2">
                        <motion.div
                          whileTap={{ scale: 0.9 }}
                          className="mt-0.5 shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-chart-4" />
                          ) : (
                            <Circle className={cn(
                              "w-5 h-5 transition-colors",
                              statusConfig[task.status].iconColor,
                              "group-hover:text-foreground"
                            )} />
                          )}
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={cn(
                              "text-sm font-semibold tabular-nums",
                              task.completed ? "line-through text-muted-foreground" : "text-foreground"
                            )}>
                              {task.orderNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-2 py-0.5 font-medium",
                                statusConfig[task.status].className
                              )}
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[task.status].label}
                            </Badge>
                          </div>
                          
                          <p className={cn(
                            "text-sm flex items-center gap-1.5",
                            task.completed ? "text-muted-foreground" : "text-foreground"
                          )}>
                            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {task.customer}
                          </p>
                          
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {task.items}
                          </p>
                          
                          <p className={cn(
                            "text-[10px] mt-2 tabular-nums",
                            task.status === "urgent" && !task.completed 
                              ? "text-destructive font-medium" 
                              : "text-muted-foreground"
                          )}>
                            到期：{task.dueDate}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  )
}
