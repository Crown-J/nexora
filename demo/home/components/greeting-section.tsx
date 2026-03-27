"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, TrendingUp, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GreetingSection() {
  const [greeting, setGreeting] = useState("您好")
  const [icon, setIcon] = useState("sun")

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      setGreeting("早安")
      setIcon("sunrise")
    } else if (hour >= 12 && hour < 18) {
      setGreeting("午安")
      setIcon("sun")
    } else {
      setGreeting("晚安")
      setIcon("moon")
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
    >
      <div className="space-y-2">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-2xl lg:text-4xl font-bold text-foreground tracking-tight"
        >
          {greeting}，<span className="gradient-text">CROWN</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-muted-foreground flex items-center gap-2"
        >
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span>
              今天還有 <span className="text-destructive font-semibold">3 筆</span> 訂單未完成
            </span>
          </span>
        </motion.p>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex items-center gap-4"
      >
        <div className="glass-card rounded-2xl p-4 min-w-[140px]">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-chart-4" />
            今日營業額
          </div>
          <p className="text-xl font-bold gradient-text">NT$ 128,500</p>
          <p className="text-[10px] text-chart-4 mt-0.5">+12.5% 較昨日</p>
        </div>
        
        <Button 
          variant="ghost" 
          className="h-auto p-4 glass-card rounded-2xl hover:bg-secondary/50 group"
        >
          <div className="text-left">
            <p className="text-xs text-muted-foreground mb-1">快速新增</p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              建立訂單
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </Button>
      </motion.div>
    </motion.div>
  )
}
