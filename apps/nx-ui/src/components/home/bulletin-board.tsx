"use client"

import { useCallback, useEffect, useState } from "react"
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
import type { BulletinDto } from "@/features/home/api/bulletin"
import {
  createBulletin,
  listBulletins,
  setBulletinActive,
  updateBulletin,
} from "@/features/home/api/bulletin"

function scopeToChannel(scope: string): "company" | "system" | "remind" {
  if (scope === "C") return "company"
  if (scope === "R") return "remind"
  return "system"
}

function badgeUi(b: BulletinDto): "important" | "normal" | "update" {
  const d = b.displayBadge
  if (d === "important" || d === "normal" || d === "update") return d
  if (b.isPinned) return "important"
  return "normal"
}

type UiRow = {
  id: string
  title: string
  subtitle: string
  content: string
  date: string
  channel: "company" | "system" | "remind"
  type: "important" | "normal" | "update"
  pinned?: boolean
  raw: BulletinDto
}

const typeConfig = {
  important: { label: "重要", className: "bg-destructive/20 text-destructive border-destructive/30" },
  update: { label: "更新", className: "bg-primary/20 text-primary border-primary/30" },
  normal: { label: "一般", className: "bg-muted text-muted-foreground border-muted-foreground/30" },
}

type BulletinTab = "all" | "company" | "system"

export type BulletinBoardProps = {
  isAdmin?: boolean
}

export function BulletinBoard({ isAdmin = false }: BulletinBoardProps) {
  const [tab, setTab] = useState<BulletinTab>("all")
  const [rows, setRows] = useState<UiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<UiRow | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formTitle, setFormTitle] = useState("")
  const [formSubtitle, setFormSubtitle] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formScope, setFormScope] = useState<"S" | "C" | "R">("S")
  const [formBadge, setFormBadge] = useState<"important" | "normal" | "update">("normal")
  const [formPinned, setFormPinned] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const scopeType =
        tab === "company" ? "C" : tab === "system" ? "S" : undefined
      const q = await listBulletins({ scopeType, page: 1, pageSize: 100 })
      const mapped: UiRow[] = q.items.map((b) => {
        const dateYmd = b.createdAt.slice(0, 10)
        return {
          id: b.id,
          title: b.title,
          subtitle: b.subtitle ?? "",
          content: (b.content ?? "").trim() || "（無內文）",
          date: dateYmd,
          channel: scopeToChannel(b.scopeType),
          type: badgeUi(b),
          pinned: b.isPinned,
          raw: b,
        }
      })
      setRows(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入公告失敗")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  const filteredAnnouncements = rows

  const resetForm = () => {
    setFormTitle("")
    setFormSubtitle("")
    setFormContent("")
    setFormScope("S")
    setFormBadge("normal")
    setFormPinned(false)
  }

  const openEdit = (r: UiRow) => {
    setEditingId(r.id)
    setFormTitle(r.raw.title)
    setFormSubtitle(r.raw.subtitle ?? "")
    setFormContent(r.raw.content ?? "")
    setFormScope((r.raw.scopeType as "S" | "C" | "R") || "S")
    setFormBadge(badgeUi(r.raw))
    setFormPinned(r.raw.isPinned)
    setDetailItem(null)
    setEditOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return
    try {
      await createBulletin({
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || null,
        content: formContent.trim() || null,
        scopeType: formScope,
        isPinned: formPinned,
        displayBadge: formBadge,
      })
      setCreateOpen(false)
      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增失敗")
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    try {
      await updateBulletin(editingId, {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || null,
        content: formContent.trim() || null,
        scopeType: formScope,
        isPinned: formPinned,
        displayBadge: formBadge,
      })
      setEditOpen(false)
      setEditingId(null)
      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗")
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      await setBulletinActive(id, false)
      setDetailItem(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "停用失敗")
    }
  }

  const channelLabel = (ch: UiRow["channel"]) =>
    ch === "company" ? "公司" : ch === "remind" ? "提醒" : "系統"

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Megaphone className="w-4 h-4 text-primary" />
            公告
          </CardTitle>
          {isAdmin && (
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
          )}
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
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        <ScrollArea className="h-[320px] pr-1">
          <div className="space-y-3">
            {loading && (
              <div className="text-sm text-muted-foreground rounded-xl border border-border/60 bg-secondary/30 p-4 text-center">
                載入中…
              </div>
            )}
            {!loading &&
              filteredAnnouncements.map((item) => (
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
                        {channelLabel(item.channel)}
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
            {!loading && filteredAnnouncements.length === 0 && (
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 py-2">
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
                <div className="grid gap-2">
                  <Label htmlFor="ann-scope">範圍</Label>
                  <select
                    id="ann-scope"
                    value={formScope}
                    onChange={(ev) => setFormScope(ev.target.value as "S" | "C" | "R")}
                    className="nx-native-select h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="S">系統</option>
                    <option value="C">公司</option>
                    <option value="R">提醒</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ann-badge">標籤</Label>
                  <select
                    id="ann-badge"
                    value={formBadge}
                    onChange={(ev) => setFormBadge(ev.target.value as typeof formBadge)}
                    className="nx-native-select h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="important">重要</option>
                    <option value="normal">一般</option>
                    <option value="update">更新</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formPinned}
                    onChange={(ev) => setFormPinned(ev.target.checked)}
                    className="rounded border-border size-4 accent-primary"
                  />
                  置頂
                </label>
              </div>
              <div className="flex flex-col gap-2 min-h-[200px]">
                <Label htmlFor="ann-content">內容</Label>
                <Textarea
                  id="ann-content"
                  value={formContent}
                  onChange={(ev) => setFormContent(ev.target.value)}
                  placeholder="選填"
                  rows={12}
                  className="min-h-[200px] resize-y"
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

      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { resetForm(); setEditingId(null) } }}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto sm:max-w-[min(96vw,80rem)]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader className="pb-2">
              <DialogTitle>編輯公告</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 py-2">
              <div className="space-y-3 min-w-0">
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">標題</Label>
                  <Input
                    id="edit-title"
                    value={formTitle}
                    onChange={(ev) => setFormTitle(ev.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-sub">副標題</Label>
                  <Input id="edit-sub" value={formSubtitle} onChange={(ev) => setFormSubtitle(ev.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>範圍</Label>
                  <select
                    value={formScope}
                    onChange={(ev) => setFormScope(ev.target.value as "S" | "C" | "R")}
                    className="nx-native-select h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="S">系統</option>
                    <option value="C">公司</option>
                    <option value="R">提醒</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>標籤</Label>
                  <select
                    value={formBadge}
                    onChange={(ev) => setFormBadge(ev.target.value as typeof formBadge)}
                    className="nx-native-select h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="important">重要</option>
                    <option value="normal">一般</option>
                    <option value="update">更新</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formPinned}
                    onChange={(ev) => setFormPinned(ev.target.checked)}
                    className="rounded border-border size-4 accent-primary"
                  />
                  置頂
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-content">內容</Label>
                <Textarea
                  id="edit-content"
                  value={formContent}
                  onChange={(ev) => setFormContent(ev.target.value)}
                  rows={12}
                  className="min-h-[200px] resize-y"
                />
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2 border-t border-border/50 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button type="submit">儲存</Button>
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
                    {channelLabel(detailItem.channel)}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto tabular-nums">{detailItem.date}</span>
                </div>
                <DialogTitle className="pt-2">{detailItem.title}</DialogTitle>
                {detailItem.subtitle ? (
                  <DialogDescription className="text-foreground/85">{detailItem.subtitle}</DialogDescription>
                ) : null}
              </DialogHeader>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{detailItem.content}</p>
              <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
                {isAdmin && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => openEdit(detailItem)}
                    >
                      編輯
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void handleDeactivate(detailItem.id)}
                    >
                      停用
                    </Button>
                  </>
                )}
                <Button type="button" variant="outline" onClick={() => setDetailItem(null)}>
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
