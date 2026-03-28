"use client"

import { useMemo, useRef, useState } from "react"
import { Pin, ChevronRight, Megaphone, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface Announcement {
  id: string
  title: string
  subtitle: string
  content: string
  date: string
  channel: "company" | "system"
  type: "important" | "normal" | "update"
  pinned?: boolean
}

const seedAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "系統維護公告",
    subtitle: "週六凌晨維護時段",
    content: "本週六凌晨 2:00-4:00 進行系統維護，届時系統將暫停服務。",
    date: "2026-03-27",
    channel: "system",
    type: "important",
    pinned: true,
  },
  {
    id: "2",
    title: "新版本更新 v1.2.0",
    subtitle: "庫存與報表優化",
    content: "新增庫存預警功能、優化報表匯出速度。",
    date: "2026-03-25",
    channel: "system",
    type: "update",
  },
  {
    id: "3",
    title: "供應商聯絡資訊更新",
    subtitle: "和泰汽材",
    content: "「和泰汽材」聯絡電話已更新，請至供應商管理查看。",
    date: "2026-03-24",
    channel: "company",
    type: "normal",
  },
  {
    id: "4",
    title: "月結作業提醒",
    subtitle: "三月份截止日",
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

function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function BulletinBoard() {
  const fallbackId = useRef(0)
  const [tab, setTab] = useState<BulletinTab>("all")
  const [announcements, setAnnouncements] = useState<Announcement[]>(seedAnnouncements)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<Announcement | null>(null)

  const [formTitle, setFormTitle] = useState("")
  const [formSubtitle, setFormSubtitle] = useState("")
  const [formContent, setFormContent] = useState("")

  const filteredAnnouncements = useMemo(() => {
    if (tab === "all") return announcements
    return announcements.filter((a) => a.channel === tab)
  }, [tab, announcements])

  const resetForm = () => {
    setFormTitle("")
    setFormSubtitle("")
    setFormContent("")
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `ann-${++fallbackId.current}`
    setAnnouncements((prev) => [
      {
        id,
        title: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        content: formContent.trim() || formSubtitle.trim() || "（無內文）",
        date: todayYmd(),
        channel: "system",
        type: "normal",
      },
      ...prev,
    ])
    setCreateOpen(false)
    resetForm()
  }

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Megaphone className="w-4 h-4 text-primary" />
            公告
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-primary/50 bg-primary/10 text-xs text-primary hover:bg-primary/15"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            新增公告
          </Button>
        </div>
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
              <button
                key={item.id}
                type="button"
                onClick={() => setDetailItem(item)}
                className={cn(
                  "w-full flex items-start gap-3 p-3.5 rounded-xl bg-secondary/35 border border-border/60 text-left",
                  "transition-all duration-200 cursor-pointer group",
                  "hover:bg-secondary/55 hover:border-primary/25 hover:shadow-sm",
                )}
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
                    {item.pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
                    <span className="text-xs text-muted-foreground ml-auto tabular-nums">{item.date}</span>
                  </div>
                  <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary/95 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate mt-0.5 group-hover:text-foreground/70 transition-colors">
                    {item.content}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
              </button>
            ))}
            {filteredAnnouncements.length === 0 && (
              <div className="text-sm text-muted-foreground rounded-xl border border-border/60 bg-secondary/30 p-4 text-center">
                目前沒有對應公告
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm() }}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto sm:max-w-[min(96vw,80rem)]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader className="pb-2">
              <DialogTitle>新增公告</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 py-2">
              <div className="space-y-3 min-w-0">
                <div className="grid gap-2">
                  <Label htmlFor="ann-title">標題</Label>
                  <Input
                    id="ann-title"
                    value={formTitle}
                    onChange={(ev) => setFormTitle(ev.target.value)}
                    placeholder="必填"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ann-subtitle">副標題</Label>
                  <Input
                    id="ann-subtitle"
                    value={formSubtitle}
                    onChange={(ev) => setFormSubtitle(ev.target.value)}
                    placeholder="選填"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 min-h-[280px] lg:min-h-[360px]">
                <Label htmlFor="ann-content">內容</Label>
                <Textarea
                  id="ann-content"
                  value={formContent}
                  onChange={(ev) => setFormContent(ev.target.value)}
                  placeholder="選填"
                  rows={14}
                  className="min-h-[260px] flex-1 resize-y lg:min-h-[320px]"
                />
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2 border-t border-border/50 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit">發布</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="sm:max-w-md">
          {detailItem && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={typeConfig[detailItem.type].className}>
                    {typeConfig[detailItem.type].label}
                  </Badge>
                  <Badge variant="outline" className="border-border/70 text-muted-foreground">
                    {detailItem.channel === "company" ? "公司" : "系統"}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto tabular-nums">{detailItem.date}</span>
                </div>
                <DialogTitle className="pt-2">{detailItem.title}</DialogTitle>
                {detailItem.subtitle ? (
                  <DialogDescription className="text-foreground/85">{detailItem.subtitle}</DialogDescription>
                ) : null}
              </DialogHeader>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{detailItem.content}</p>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setDetailItem(null)}>
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
