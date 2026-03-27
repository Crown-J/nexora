"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { StickyNote, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface Memo {
  id: string
  content: string
  createdAt: string
  color: "amber" | "blue" | "emerald" | "rose"
}

const initialMemos: Memo[] = [
  {
    id: "1",
    content: "記得確認「永昌汽材」的出貨單，客戶下週需要。",
    createdAt: "2026-03-27 09:30",
    color: "amber",
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
    color: "emerald",
  },
]

const colorConfig = {
  amber: {
    bg: "bg-gradient-to-br from-amber-500/15 to-amber-500/5",
    border: "border-amber-500/30 hover:border-amber-500/50",
    accent: "bg-amber-500",
    text: "text-amber-200/90"
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-500/15 to-blue-500/5",
    border: "border-blue-500/30 hover:border-blue-500/50",
    accent: "bg-blue-500",
    text: "text-blue-200/90"
  },
  emerald: {
    bg: "bg-gradient-to-br from-emerald-500/15 to-emerald-500/5",
    border: "border-emerald-500/30 hover:border-emerald-500/50",
    accent: "bg-emerald-500",
    text: "text-emerald-200/90"
  },
  rose: {
    bg: "bg-gradient-to-br from-rose-500/15 to-rose-500/5",
    border: "border-rose-500/30 hover:border-rose-500/50",
    accent: "bg-rose-500",
    text: "text-rose-200/90"
  },
}

export function MemoPanel() {
  const [memos, setMemos] = useState<Memo[]>(initialMemos)

  const deleteMemo = (id: string) => {
    setMemos(memos.filter((m) => m.id !== id))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="glass-card h-full overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base font-semibold flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-xl bg-primary/15 border border-primary/20">
              <StickyNote className="w-4 h-4 text-primary" />
            </div>
            備忘錄
            <Badge variant="outline" className="text-[10px] font-normal border-border/50 text-muted-foreground">
              {memos.length} 則
            </Badge>
          </CardTitle>
          <CardAction>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-[280px] pr-2">
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {memos.map((memo, index) => (
                  <motion.div
                    key={memo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                    transition={{ duration: 0.2, delay: 0.05 * index }}
                    className={`relative p-4 rounded-xl border transition-all duration-300 group cursor-pointer hover:translate-y-[-2px] ${colorConfig[memo.color].bg} ${colorConfig[memo.color].border}`}
                  >
                    {/* Color accent bar */}
                    <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${colorConfig[memo.color].accent}`} />
                    
                    <p className="text-sm text-foreground pr-8 pl-2 leading-relaxed">{memo.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-3 pl-2 tabular-nums">{memo.createdAt}</p>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMemo(memo.id)
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>

            {memos.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
              >
                <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                  <StickyNote className="w-6 h-6" />
                </div>
                <p className="text-sm">沒有備忘錄</p>
                <p className="text-xs mt-1">點擊右上角新增</p>
              </motion.div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  )
}
