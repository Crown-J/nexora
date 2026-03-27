"use client"

import { useState } from "react"
import { StickyNote, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Memo {
  id: string
  content: string
  createdAt: string
  color: "yellow" | "blue" | "green" | "pink"
}

const initialMemos: Memo[] = [
  {
    id: "1",
    content: "記得確認「永昌汽材」的出貨單，客戶下週需要。",
    createdAt: "2026-03-27 09:30",
    color: "yellow",
  },
  {
    id: "2",
    content: "下週二供應商來訪，準備會議室及相關資料。",
    createdAt: "2026-03-26 14:15",
    color: "blue",
  },
  {
    id: "3",
    content: "更新庫存盤點表格式，加入新的分類欄位。",
    createdAt: "2026-03-25 11:00",
    color: "green",
  },
]

const colorConfig = {
  yellow: "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20",
  blue: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20",
  green: "bg-green-500/10 border-green-500/30 hover:bg-green-500/20",
  pink: "bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20",
}

export function MemoPanel() {
  const [memos, setMemos] = useState<Memo[]>(initialMemos)

  const deleteMemo = (id: string) => {
    setMemos(memos.filter((m) => m.id !== id))
  }

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
          <StickyNote className="w-4 h-4 text-primary" />
          備忘錄
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Plus className="w-4 h-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px]">
          <div className="space-y-3">
            {memos.map((memo) => (
              <div
                key={memo.id}
                className={`p-3 rounded-lg border transition-colors group relative ${colorConfig[memo.color]}`}
              >
                <p className="text-sm text-foreground pr-6">{memo.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{memo.createdAt}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMemo(memo.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {memos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                沒有備忘錄
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
