"use client"

import { useState, useEffect } from "react"

// Types
type PageType = "master" | "purchase" | "inventory" | "sales" | "accounting" | "analytics"

// Dummy Data
const partners = [
  { id: "P001", name: "台北科技有限公司", type: "供應商", contact: "王小明", phone: "02-2345-6789", status: "啟用" },
  { id: "P002", name: "新莊電子股份有限公司", type: "供應商", contact: "李大華", phone: "02-2987-6543", status: "啟用" },
  { id: "P003", name: "北投貿易商行", type: "客戶", contact: "張美玲", phone: "02-2876-5432", status: "啟用" },
  { id: "P004", name: "林口物流中心", type: "客戶", contact: "陳建宏", phone: "02-2654-3210", status: "停用" },
]

const parts = [
  { id: "M001", name: "高效能處理器 A1", category: "電子零件", unit: "個", price: 2500, stock: 150 },
  { id: "M002", name: "記憶體模組 16GB", category: "電子零件", unit: "條", price: 1200, stock: 320 },
  { id: "M003", name: "固態硬碟 512GB", category: "儲存設備", unit: "個", price: 1800, stock: 85 },
  { id: "M004", name: "主機板 B560", category: "電子零件", unit: "片", price: 3200, stock: 45 },
]

const purchaseOrders = [
  { id: "PO-2024001", supplier: "台北科技有限公司", date: "2024-01-15", total: 125000, status: "已收貨" },
  { id: "PO-2024002", supplier: "新莊電子股份有限公司", date: "2024-01-18", total: 85600, status: "已送出" },
  { id: "PO-2024003", supplier: "台北科技有限公司", date: "2024-01-20", total: 42300, status: "草稿" },
  { id: "PO-2024004", supplier: "新莊電子股份有限公司", date: "2024-01-22", total: 98700, status: "已送出" },
]

const warehouses = [
  { id: "Z00", name: "總倉", location: "台北市中山區", capacity: 10000, used: 7850, items: 1245 },
  { id: "Z01", name: "台北倉", location: "台北市內湖區", capacity: 5000, used: 3200, items: 568 },
  { id: "Z02", name: "新莊倉", location: "新北市新莊區", capacity: 8000, used: 6100, items: 892 },
  { id: "Z03", name: "北投倉", location: "台北市北投區", capacity: 3000, used: 1800, items: 324 },
  { id: "Z04", name: "林口倉", location: "新北市林口區", capacity: 6000, used: 4500, items: 678 },
]

const transfers = [
  { id: "TR-001", from: "Z00總倉", to: "Z01台北倉", date: "2024-01-20", items: 25, status: "已驗收" },
  { id: "TR-002", from: "Z02新莊倉", to: "Z03北投倉", date: "2024-01-21", items: 18, status: "待驗收" },
  { id: "TR-003", from: "Z00總倉", to: "Z04林口倉", date: "2024-01-22", items: 32, status: "申請中" },
  { id: "TR-004", from: "Z01台北倉", to: "Z02新莊倉", date: "2024-01-23", items: 15, status: "異常" },
]

const salesOrders = [
  { id: "SO-2024001", customer: "北投貿易商行", date: "2024-01-15", total: 156000, status: "已出貨" },
  { id: "SO-2024002", customer: "林口物流中心", date: "2024-01-18", total: 89500, status: "處理中" },
  { id: "SO-2024003", customer: "北投貿易商行", date: "2024-01-20", total: 234000, status: "已完成" },
  { id: "SO-2024004", customer: "林口物流中心", date: "2024-01-22", total: 67800, status: "待確認" },
]

const returns = [
  { id: "RT-001", orderId: "SO-2024001", customer: "北投貿易商行", date: "2024-01-25", reason: "商品瑕疵", status: "處理中" },
  { id: "RT-002", orderId: "SO-2024003", customer: "北投貿易商行", date: "2024-01-26", reason: "規格不符", status: "已完成" },
]

const invoices = [
  { id: "INV-2024001", vendor: "台北科技有限公司", date: "2024-01-15", amount: 125000, due: "2024-02-15", status: "已付款" },
  { id: "INV-2024002", vendor: "新莊電子股份有限公司", date: "2024-01-18", amount: 85600, due: "2024-02-18", status: "待付款" },
  { id: "INV-2024003", vendor: "台北科技有限公司", date: "2024-01-20", amount: 42300, due: "2024-02-01", status: "逾期" },
  { id: "INV-2024004", vendor: "新莊電子股份有限公司", date: "2024-01-22", amount: 98700, due: "2024-02-22", status: "待付款" },
]

const monthlyRevenue = [
  { month: "一月", value: 1250000 },
  { month: "二月", value: 1180000 },
  { month: "三月", value: 1420000 },
  { month: "四月", value: 1380000 },
  { month: "五月", value: 1560000 },
  { month: "六月", value: 1720000 },
]

const inventoryTrend = [
  { month: "一月", value: 8500 },
  { month: "二月", value: 9200 },
  { month: "三月", value: 8800 },
  { month: "四月", value: 9500 },
  { month: "五月", value: 10200 },
  { month: "六月", value: 9800 },
]

const salesByCategory = [
  { category: "電子零件", value: 45, color: "#3b82f6" },
  { category: "儲存設備", value: 25, color: "#10b981" },
  { category: "週邊配件", value: 20, color: "#f59e0b" },
  { category: "其他", value: 10, color: "#6366f1" },
]

// Icons
const Icons = {
  master: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  purchase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  inventory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sales: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  accounting: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

const navItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
  { id: "master", label: "主檔", icon: Icons.master },
  { id: "purchase", label: "採購", icon: Icons.purchase },
  { id: "inventory", label: "庫存", icon: Icons.inventory },
  { id: "sales", label: "銷售", icon: Icons.sales },
  { id: "accounting", label: "會計", icon: Icons.accounting },
  { id: "analytics", label: "報表", icon: Icons.analytics },
]

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const getStatusStyle = () => {
    switch (status) {
      case "草稿":
        return "bg-slate-500/15 text-slate-500 dark:bg-slate-400/10 dark:text-slate-400 shadow-sm shadow-slate-500/5"
      case "已送出":
      case "處理中":
      case "申請中":
        return "bg-indigo-500/15 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400 shadow-sm shadow-indigo-500/10"
      case "已收貨":
      case "已驗收":
      case "已完成":
      case "已出貨":
      case "已付款":
      case "啟用":
        return "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 shadow-sm shadow-emerald-500/10"
      case "待驗收":
      case "待確認":
      case "待付款":
        return "bg-amber-500/15 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 shadow-sm shadow-amber-500/10"
      case "異常":
      case "逾期":
      case "停用":
        return "bg-rose-500/15 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400 shadow-sm shadow-rose-500/10"
      default:
        return "bg-slate-500/15 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400"
    }
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle()}`}>
      {status}
    </span>
  )
}

// Glass Card Component
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.02] backdrop-blur-xl dark:border-indigo-400/[0.08] dark:bg-indigo-400/[0.02] ${className}`}>
      {children}
    </div>
  )
}

// Search Input Component
function SearchInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400">
        {Icons.search}
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all dark:bg-white/[0.02] dark:border-white/[0.06]"
      />
    </div>
  )
}

// Data Table Component
function DataTable({ columns, data, searchKey }: { columns: { key: string; label: string }[]; data: Record<string, unknown>[]; searchKey?: string }) {
  const [search, setSearch] = useState("")
  const filteredData = searchKey
    ? data.filter((item) => String(item[searchKey]).toLowerCase().includes(search.toLowerCase()))
    : data

  return (
    <div className="space-y-4">
      {searchKey && (
        <SearchInput placeholder="搜尋..." value={search} onChange={setSearch} />
      )}
      <div className="overflow-x-auto rounded-xl border border-white/10 dark:border-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 dark:border-white/[0.06]">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, i) => (
              <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 dark:hover:bg-white/[0.02] transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.key === "status" ? <StatusBadge status={String(row[col.key])} /> : String(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Master Data Category Icons
const MasterIcons = {
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  key: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  cpu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 7h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zm3 4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  warehouse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

const masterDataCategories = [
  { id: "users", title: "使用者基本資料", icon: MasterIcons.user, count: 156 },
  { id: "roles", title: "權限角色基本資料", icon: MasterIcons.shield, count: 12 },
  { id: "positions", title: "使用者職位設定", icon: MasterIcons.briefcase, count: 28 },
  { id: "permissions", title: "使用者權限設定", icon: MasterIcons.key, count: 45 },
  { id: "parts", title: "零件基本資料", icon: MasterIcons.cpu, count: 1842 },
  { id: "brands", title: "廠牌基本資料", icon: MasterIcons.tag, count: 89 },
  { id: "warehouses", title: "倉庫基本資料", icon: MasterIcons.warehouse, count: 5 },
  { id: "locations", title: "庫位基本資料", icon: MasterIcons.grid, count: 324 },
  { id: "customers", title: "往來客戶基本資料", icon: MasterIcons.users, count: 567 },
]

// Master Page
function MasterPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {masterDataCategories.map((category) => (
        <div
          key={category.id}
          className="group relative rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.03] backdrop-blur-xl p-6 transition-all duration-300 hover:border-indigo-500/20 hover:bg-indigo-500/[0.06] hover:shadow-lg hover:shadow-indigo-500/5 dark:border-indigo-400/10 dark:bg-indigo-400/[0.02] dark:hover:border-indigo-400/20 dark:hover:bg-indigo-400/[0.05]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 p-2.5 text-indigo-600 dark:text-indigo-400 transition-colors group-hover:bg-indigo-500/15 dark:group-hover:bg-indigo-400/15">
              {category.icon}
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-white/5 px-2 py-1 rounded-full">
              {category.count.toLocaleString()} 筆
            </span>
          </div>
          <h3 className="text-base font-semibold mb-4 text-zinc-800 dark:text-zinc-100">
            {category.title}
          </h3>
          <button className="w-full py-2.5 rounded-xl text-sm font-medium bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:bg-indigo-400/10 dark:text-indigo-400 dark:hover:bg-indigo-400/20 transition-all">
            管理
          </button>
        </div>
      ))}
    </div>
  )
}

// Purchase Page
function PurchasePage() {
  const [filter, setFilter] = useState("全部")
  const suppliers = ["全部", "台北科技有限公司", "新莊電子股份有限公司"]
  const filteredOrders = filter === "全部" ? purchaseOrders : purchaseOrders.filter((o) => o.supplier === filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-zinc-500">供應商篩選：</span>
        {suppliers.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? "bg-blue-500 text-white" : "bg-white/5 hover:bg-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">採購單列表</h3>
        <DataTable
          columns={[
            { key: "id", label: "單號" },
            { key: "supplier", label: "供應商" },
            { key: "date", label: "日期" },
            { key: "total", label: "金額" },
            { key: "status", label: "狀態" },
          ]}
          data={filteredOrders}
        />
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">進貨流程追蹤</h3>
        <div className="flex items-center justify-between max-w-2xl mx-auto py-4">
          {["建立採購單", "送出審核", "供應商確認", "出貨通知", "驗收入庫"].map((step, i) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${i < 3 ? "bg-emerald-500 text-white" : "bg-white/10 text-zinc-500 dark:bg-white/[0.05]"}`}>
                  {i + 1}
                </div>
                <span className="text-xs mt-2 text-center max-w-[60px]">{step}</span>
              </div>
              {i < 4 && (
                <div className={`w-8 h-0.5 mx-1 ${i < 2 ? "bg-emerald-500" : "bg-white/10 dark:bg-white/[0.05]"}`} />
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}

// Inventory Page
function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {warehouses.map((w) => {
          const percentage = Math.round((w.used / w.capacity) * 100)
          return (
            <GlassCard key={w.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{w.id}</h4>
                <span className="text-xs text-zinc-500">{w.name}</span>
              </div>
              <p className="text-xs text-zinc-500 mb-3">{w.location}</p>
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>使用率</span>
                  <span>{percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 dark:bg-white/[0.05] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${percentage > 80 ? "bg-amber-500" : "bg-blue-500"}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{w.used.toLocaleString()} / {w.capacity.toLocaleString()}</span>
                <span>{w.items} 品項</span>
              </div>
            </GlassCard>
          )
        })}
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">調撥申請列表</h3>
        <DataTable
          columns={[
            { key: "id", label: "單號" },
            { key: "from", label: "調出倉" },
            { key: "to", label: "調入倉" },
            { key: "date", label: "日期" },
            { key: "items", label: "品項數" },
            { key: "status", label: "狀態" },
          ]}
          data={transfers}
        />
      </GlassCard>
    </div>
  )
}

// Sales Page
function SalesPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "returns">("orders")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "orders" ? "bg-blue-500 text-white" : "bg-white/5 hover:bg-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"}`}
        >
          銷售訂單
        </button>
        <button
          onClick={() => setActiveTab("returns")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "returns" ? "bg-blue-500 text-white" : "bg-white/5 hover:bg-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"}`}
        >
          銷退申請
        </button>
      </div>

      <GlassCard className="p-6">
        {activeTab === "orders" ? (
          <>
            <h3 className="text-lg font-semibold mb-4">銷售訂單列表</h3>
            <DataTable
              columns={[
                { key: "id", label: "單號" },
                { key: "customer", label: "客戶" },
                { key: "date", label: "日期" },
                { key: "total", label: "金額" },
                { key: "status", label: "狀態" },
              ]}
              data={salesOrders}
              searchKey="customer"
            />
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-4">銷退申請列表</h3>
            <DataTable
              columns={[
                { key: "id", label: "退貨單號" },
                { key: "orderId", label: "原訂單號" },
                { key: "customer", label: "客戶" },
                { key: "date", label: "日期" },
                { key: "reason", label: "原因" },
                { key: "status", label: "狀態" },
              ]}
              data={returns}
            />
          </>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">訂單狀態流程</h3>
        <div className="flex items-center justify-between max-w-2xl mx-auto py-4">
          {["待確認", "處理中", "已出貨", "已完成"].map((step, i) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${i < 2 ? "bg-emerald-500 text-white" : "bg-white/10 text-zinc-500 dark:bg-white/[0.05]"}`}>
                  {i + 1}
                </div>
                <span className="text-xs mt-2">{step}</span>
              </div>
              {i < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${i < 1 ? "bg-emerald-500" : "bg-white/10 dark:bg-white/[0.05]"}`} />
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}

// Accounting Page
function AccountingPage() {
  const [dateRange, setDateRange] = useState({ start: "2024-01-01", end: "2024-01-31" })
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const paidAmount = invoices.filter((inv) => inv.status === "已付款").reduce((sum, inv) => sum + inv.amount, 0)
  const pendingAmount = invoices.filter((inv) => inv.status === "待付款").reduce((sum, inv) => sum + inv.amount, 0)
  const overdueAmount = invoices.filter((inv) => inv.status === "逾期").reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">日期範圍：</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:bg-white/[0.02] dark:border-white/[0.06]"
          />
          <span className="text-zinc-500">至</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:bg-white/[0.02] dark:border-white/[0.06]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "總金額", value: totalAmount, color: "text-foreground" },
          { label: "已付款", value: paidAmount, color: "text-emerald-500" },
          { label: "待付款", value: pendingAmount, color: "text-amber-500" },
          { label: "已逾期", value: overdueAmount, color: "text-red-500" },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-5">
            <p className="text-sm text-zinc-500 mb-1">{stat.label}</p>
            <p className={`text-xl font-semibold ${stat.color}`}>
              ${stat.value.toLocaleString()}
            </p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">票據列表</h3>
        <DataTable
          columns={[
            { key: "id", label: "票據編號" },
            { key: "vendor", label: "廠商" },
            { key: "date", label: "開立日期" },
            { key: "amount", label: "金額" },
            { key: "due", label: "到期日" },
            { key: "status", label: "狀態" },
          ]}
          data={invoices}
        />
      </GlassCard>
    </div>
  )
}

// Analytics Page with Hand-drawn SVG Charts
function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors">
          <span className="w-4 h-4">{Icons.download}</span>
          匯出報表
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Monthly Revenue */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-6">月營收趨勢</h3>
          <div className="relative h-64">
            <svg viewBox="0 0 400 200" className="w-full h-full">
              {/* Y-axis labels */}
              {[0, 500000, 1000000, 1500000, 2000000].map((val, i) => (
                <text key={val} x="45" y={180 - i * 40} className="fill-zinc-500 text-[10px]" textAnchor="end">
                  {(val / 10000).toFixed(0)}萬
                </text>
              ))}
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={i} x1="50" y1={180 - i * 40} x2="380" y2={180 - i * 40} stroke="currentColor" className="text-white/10 dark:text-white/[0.05]" strokeWidth="1" />
              ))}
              {/* Bars */}
              {monthlyRevenue.map((d, i) => {
                const barHeight = (d.value / 2000000) * 160
                return (
                  <g key={d.month}>
                    <rect
                      x={60 + i * 55}
                      y={180 - barHeight}
                      width="40"
                      height={barHeight}
                      rx="4"
                      className="fill-blue-500"
                    />
                    <text x={80 + i * 55} y="195" className="fill-zinc-500 text-[10px]" textAnchor="middle">
                      {d.month}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </GlassCard>

        {/* Line Chart - Inventory Trend */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-6">庫存趨勢</h3>
          <div className="relative h-64">
            <svg viewBox="0 0 400 200" className="w-full h-full">
              {/* Y-axis labels */}
              {[0, 3000, 6000, 9000, 12000].map((val, i) => (
                <text key={val} x="45" y={180 - i * 40} className="fill-zinc-500 text-[10px]" textAnchor="end">
                  {val.toLocaleString()}
                </text>
              ))}
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={i} x1="50" y1={180 - i * 40} x2="380" y2={180 - i * 40} stroke="currentColor" className="text-white/10 dark:text-white/[0.05]" strokeWidth="1" />
              ))}
              {/* Line path */}
              <path
                d={inventoryTrend.map((d, i) => {
                  const x = 70 + i * 60
                  const y = 180 - (d.value / 12000) * 160
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`
                }).join(" ")}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {inventoryTrend.map((d, i) => {
                const x = 70 + i * 60
                const y = 180 - (d.value / 12000) * 160
                return (
                  <g key={d.month}>
                    <circle cx={x} cy={y} r="5" className="fill-emerald-500" />
                    <circle cx={x} cy={y} r="3" className="fill-background" />
                    <text x={x} y="195" className="fill-zinc-500 text-[10px]" textAnchor="middle">
                      {d.month}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </GlassCard>

        {/* Donut Chart - Sales by Category */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-6">銷售分類佔比</h3>
          <div className="flex items-center gap-8">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {(() => {
                  let offset = 0
                  return salesByCategory.map((d) => {
                    const circumference = 2 * Math.PI * 35
                    const strokeDasharray = `${(d.value / 100) * circumference} ${circumference}`
                    const strokeDashoffset = -offset * circumference / 100
                    offset += d.value
                    return (
                      <circle
                        key={d.category}
                        cx="50"
                        cy="50"
                        r="35"
                        fill="none"
                        stroke={d.color}
                        strokeWidth="12"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    )
                  })
                })()}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold">100%</p>
                  <p className="text-xs text-zinc-500">總計</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {salesByCategory.map((d) => (
                <div key={d.category} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm">{d.category}</span>
                  <span className="text-sm text-zinc-500">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Summary Stats */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-6">本月摘要</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "總營收", value: "$1,720,000", change: "+12.5%", positive: true },
              { label: "訂單數", value: "156", change: "+8.2%", positive: true },
              { label: "平均訂單額", value: "$11,026", change: "+3.8%", positive: true },
              { label: "退貨率", value: "2.3%", change: "-0.5%", positive: true },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-white/5 dark:bg-white/[0.02]">
                <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                <p className="text-lg font-semibold mb-1">{stat.value}</p>
                <p className={`text-xs ${stat.positive ? "text-emerald-500" : "text-red-500"}`}>
                  {stat.change}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// Main App Component
export default function ERPDemo() {
  const [currentPage, setCurrentPage] = useState<PageType>("master")
  const [isDark, setIsDark] = useState(true)
  const [isDockVisible, setIsDockVisible] = useState(false)
  const [hoveredIcon, setHoveredIcon] = useState<number | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  const getIconScale = (index: number) => {
    if (hoveredIcon === null) return 1
    const distance = Math.abs(hoveredIcon - index)
    if (distance === 0) return 1.5
    if (distance === 1) return 1.25
    return 1
  }

  const renderPage = () => {
    switch (currentPage) {
      case "master":
        return <MasterPage />
      case "purchase":
        return <PurchasePage />
      case "inventory":
        return <InventoryPage />
      case "sales":
        return <SalesPage />
      case "accounting":
        return <AccountingPage />
      case "analytics":
        return <AnalyticsPage />
    }
  }

  const pageTitle = {
    master: "主檔管理",
    purchase: "採購與進貨作業",
    inventory: "庫存與調撥管理",
    sales: "銷售及銷退作業",
    accounting: "會計票據管理",
    analytics: "分析與報表",
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? "dark bg-[#0d1117] text-white" : "bg-[#f8fafc] text-zinc-900"}`}>
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 border-b border-slate-200/80 dark:border-indigo-500/10 bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-xl shadow-sm dark:shadow-none">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/25">
                E
              </div>
              <span className="font-semibold">ERP System</span>
              <span className="text-xs text-zinc-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-indigo-500/10 dark:text-indigo-400">v2.0</span>
            </div>
            <button
              onClick={() => setCurrentPage("master")}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/[0.05] transition-colors"
            >
              <span className="w-4 h-4">{Icons.home}</span>
              <span className="text-sm">首頁</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/[0.05] transition-colors"
              aria-label="Toggle theme"
            >
              <span className="w-5 h-5">{isDark ? Icons.sun : Icons.moon}</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25"
              >
                <span className="w-5 h-5">{Icons.user}</span>
              </button>
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-indigo-500/15 bg-white/95 dark:bg-[#151c28]/95 backdrop-blur-xl shadow-xl overflow-hidden">
                  <div className="p-3 border-b border-slate-200 dark:border-indigo-500/10">
                    <p className="font-medium">管理員</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">admin@example.com</p>
                  </div>
                  <div className="p-1">
                    {["個人設定", "系統設定", "登出"].map((item) => (
                      <button key={item} className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-indigo-500/10 transition-colors">
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Dock */}
      <div
        className="fixed left-0 top-0 bottom-0 z-50 hidden lg:flex items-center"
        onMouseEnter={() => setIsDockVisible(true)}
        onMouseLeave={() => {
          setIsDockVisible(false)
          setHoveredIcon(null)
        }}
      >
        {/* Visible trigger strip - always visible on left edge */}
        <div className="w-1 h-full bg-slate-300/50 dark:bg-indigo-500/20 hover:bg-slate-400/50 dark:hover:bg-indigo-500/30 transition-colors" />
        
        {/* Dock panel */}
        <div
          className={`transition-all duration-300 ease-out ${isDockVisible ? "opacity-100 translate-x-2" : "opacity-0 -translate-x-full pointer-events-none"}`}
        >
          <div className="p-2 rounded-2xl border border-slate-200 dark:border-indigo-500/15 bg-white/95 dark:bg-[#151c28]/95 backdrop-blur-xl shadow-2xl shadow-slate-900/10 dark:shadow-indigo-500/5">
            <div className="flex flex-col gap-1 items-center">
              {navItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  onMouseEnter={() => setHoveredIcon(index)}
                  onMouseLeave={() => setHoveredIcon(null)}
                  className={`relative p-2 rounded-xl transition-all duration-200 ease-out ${currentPage === item.id ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "hover:bg-slate-100 dark:hover:bg-indigo-500/10 text-slate-600 dark:text-slate-400"}`}
                  style={{
                    transform: `scale(${getIconScale(index)})`,
                    transformOrigin: "left center",
                  }}
                  aria-label={item.label}
                >
                  <span className="w-6 h-6 block">{item.icon}</span>
                  {hoveredIcon === index && (
                    <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-slate-800 dark:bg-indigo-500/90 text-white text-xs whitespace-nowrap shadow-lg">
                      {item.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-slate-200/80 dark:border-indigo-500/10 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-xl">
        <div className="flex overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 py-3 px-2 transition-colors ${currentPage === item.id ? "text-indigo-500" : "text-slate-500 dark:text-slate-400"}`}
            >
              <span className={`w-6 h-6 ${currentPage === item.id ? "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : ""}`}>{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-24 lg:pb-8 lg:pl-8 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{pageTitle[currentPage]}</h1>
            <p className="text-zinc-500 text-sm mt-1">管理您的企業資源</p>
          </div>
          {renderPage()}
        </div>
      </main>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
      )}
    </div>
  )
}
