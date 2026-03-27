"use client"

import { useMemo, useState } from "react"
import { Pin, ChevronRight, Megaphone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Announcement {
  id: string
  title: string
  content: string
  date: string
  channel: "company" | "system"
  type: "important" | "normal" | "update"
  pinned?: boolean
}

const announcements: Announcement[] = [
  {
    id: "1",
    title: "系統維護公告",
    content: "本週六凌晨 2:00-4:00 進行系統維護，届時系統將暫停服務。",
    date: "2026-03-27",
    channel: "system",
    type: "important",
    pinned: true,
  },
  {
    id: "2",
    title: "新版本更新 v1.2.0",
    content: "新增庫存預警功能、優化報表匯出速度。",
    date: "2026-03-25",
    channel: "system",
    type: "update",
  },
  {
    id: "3",
    title: "供應商聯絡資訊更新",
    content: "「和泰汽材」聯絡電話已更新，請至供應商管理查看。",
    date: "2026-03-24",
    channel: "company",
    type: "normal",
  },
  {
    id: "4",
    title: "月結作業提醒",
    content: "三月份月結作業將於 3/31 截止，請儘早完成對帳。",
    date: "2026-03-23",
    channel: "company",
    type: "important",
  },
]

const typeConfig = {
  important: { label: "重要", className: "bg-destructive/20 text-destructive border-destructive/30" },
  update: { label: "更新", className: "bg-primary/20 text-primary border-primary/30" },
  normal: { label: "一般", className: "bg-muted text-muted-foreground border-muted-foreground/30" },
}

type BulletinTab = "all" | "company" | "system"

export function BulletinBoard() {
  const [tab, setTab] = useState<BulletinTab>("all")

  const filteredAnnouncements = useMemo(() => {
    if (tab === "all") return announcements
    return announcements.filter((a) => a.channel === tab)
  }, [tab])

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
          <Megaphone className="w-4 h-4 text-primary" />
          公告
        </CardTitle>
        <div className="mt-1 flex items-center gap-2">
          {[
            { key: "all", label: "全部" },
            { key: "company", label: "公司" },
            { key: "system", label: "系統" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as BulletinTab)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                tab === t.key
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/70 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-1">
          <div className="space-y-3">
            {filteredAnnouncements.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-secondary/35 hover:bg-secondary/60 transition-colors cursor-pointer group border border-border/60"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${typeConfig[item.type].className}`}
                    >
                      {typeConfig[item.type].label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-border/70 text-muted-foreground"
                    >
                      {item.channel === "company" ? "公司" : "系統"}
                    </Badge>
                    {item.pinned && <Pin className="w-3 h-3 text-primary" />}
                    <span className="text-xs text-muted-foreground ml-auto">{item.date}</span>
                  </div>
                  <h4 className="text-sm font-medium text-foreground truncate">{item.title}</h4>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.content}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
              </div>
            ))}
            {filteredAnnouncements.length === 0 && (
              <div className="text-sm text-muted-foreground rounded-xl border border-border/60 bg-secondary/30 p-4 text-center">
                目前沒有對應公告
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
