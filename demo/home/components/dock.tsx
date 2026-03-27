"use client"

import { useRef, useState } from "react"
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion"
import {
  Home,
  ShoppingCart,
  Package,
  Warehouse,
  DollarSign,
  BarChart3,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DockItem {
  icon: LucideIcon
  label: string
  href: string
  active?: boolean
}

const dockItems: DockItem[] = [
  { icon: Home, label: "首頁", href: "/", active: true },
  { icon: ShoppingCart, label: "採購", href: "/purchase" },
  { icon: Package, label: "銷售", href: "/sales" },
  { icon: Warehouse, label: "庫存", href: "/inventory" },
  { icon: DollarSign, label: "財務", href: "/finance" },
  { icon: BarChart3, label: "報表", href: "/reports" },
]

function DockIcon({
  item,
  mouseX,
}: {
  item: DockItem
  mouseX: ReturnType<typeof useMotionValue<number>>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { y: 0, height: 44 }
    return val - bounds.y - bounds.height / 2
  })

  const widthSync = useTransform(distance, [-120, 0, 120], [44, 60, 44])
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 180, damping: 14 })

  return (
    <motion.div
      ref={ref}
      style={{ width, height: width }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "flex items-center justify-center rounded-2xl cursor-pointer group relative transition-all duration-300",
        item.active
          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg glow-primary"
          : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <item.icon className="w-1/2 h-1/2" />
      
      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full ml-4 px-3 py-1.5 glass-card rounded-lg text-xs font-medium whitespace-nowrap z-50 text-foreground"
          >
            {item.label}
            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-card rotate-45 border-l border-b border-border/50" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active indicator dot */}
      {item.active && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute -right-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow"
        />
      )}
    </motion.div>
  )
}

export function Dock() {
  const mouseY = useMotionValue(Infinity)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      onMouseMove={(e) => mouseY.set(e.clientY)}
      onMouseLeave={() => {
        mouseY.set(Infinity)
        setIsHovered(false)
      }}
      onMouseEnter={() => setIsHovered(true)}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
      className={cn(
        "fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3 p-3 rounded-3xl transition-all duration-500",
        "bg-gradient-to-b from-sidebar/95 to-sidebar/85 backdrop-blur-xl",
        "border border-border/50 shadow-2xl",
        isHovered && "shadow-[0_0_60px_oklch(0.82_0.15_75/0.1)]"
      )}
    >
      {/* Logo */}
      <div className="w-10 h-10 mb-2 flex items-center justify-center relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-transparent" />
        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg glow-primary" />
        <div className="absolute inset-1 border border-primary/30 rounded-full animate-orbit" />
        <div className="absolute inset-0 border border-primary/15 rounded-full animate-orbit-reverse" />
      </div>

      <div className="w-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {dockItems.map((item) => (
        <DockIcon key={item.label} item={item} mouseX={mouseY} />
      ))}
    </motion.div>
  )
}

export function MobileDock() {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around p-3 pb-6 lg:hidden glass-card border-t border-x-0 border-b-0 rounded-t-3xl"
    >
      {dockItems.map((item) => (
        <button
          key={item.label}
          className={cn(
            "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300",
            item.active
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-all duration-300",
            item.active && "bg-primary/15 glow-primary"
          )}>
            <item.icon className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </motion.div>
  )
}
