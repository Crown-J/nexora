"use client"

import { motion } from "framer-motion"
import { Pin, ChevronRight, Megaphone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Announcement {
  id: string
  title: string
  content: string
  date: string
  type: "important" | "normal" | "update"
  pinned?: boolean
}

const announcements: Announcement[] = [
  {
    id: "1",
    title: "系統維護公告",
    content: "本週六凌晨 2:00-4:00 進行系統維護，届時系統將暫停服務。",
    date: "2026-03-27",
    type: "important",
    pinned: true,
  },
  {
    id: "2",
    title: "新版本更新 v1.2.0",
    content: "新增庫存預警功能、優化報表匯出速度。",
    date: "2026-03-25",
    type: "update",
  },
  {
    id: "3",
    title: "供應商聯絡資訊更新",
    content: "「和泰汽材」聯絡電話已更新，請至供應商管理查看。",
    date: "2026-03-24",
    type: "normal",
  },
  {
    id: "4",
    title: "月結作業提醒",
    content: "三月份月結作業將於 3/31 截止，請儘早完成對帳。",
    date: "2026-03-23",
    type: "important",
  },
]

const typeConfig = {
  important: { 
    label: "重要", 
    className: "bg-destructive/15 text-destructive border-destructive/30",
    dotColor: "bg-destructive"
  },
  update: { 
    label: "更新", 
    className: "bg-primary/15 text-primary border-primary/30",
    dotColor: "bg-primary"
  },
  normal: { 
    label: "一般", 
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
    dotColor: "bg-muted-foreground"
  },
}

export function BulletinBoard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base font-semibold flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-xl bg-primary/15 border border-primary/20">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            佈告欄
            <Badge variant="outline" className="ml-auto text-[10px] border-border/50 text-muted-foreground">
              {announcements.length} 則公告
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-[160px] pr-4">
            <div className="space-y-3">
              {announcements.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  className="group relative flex items-start gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-transparent hover:border-border/50 transition-all duration-300 cursor-pointer"
                >
                  {/* Type indicator line */}
                  <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${typeConfig[item.type].dotColor}`} />
                  
                  <div className="flex-1 min-w-0 pl-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 font-medium ${typeConfig[item.type].className}`}
                      >
                        {typeConfig[item.type].label}
                      </Badge>
                      {item.pinned && (
                        <Pin className="w-3 h-3 text-primary" />
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
                        {item.date}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.content}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  )
}
