/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx08.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX08 經營分析側邊選單
 *
 * Notes:
 * - TASK-NX08-IMPL-01 Phase 4：audit-01 §3.3 揭露既有 0 個 menu.nx08.ts、本軌建立
 * - 7 角色 group × 3 dashboard items = 21 placeholder + workspace 首頁
 * - 對齊 menu.nx05 / menu.nx06 範式
 * - 3 業界改革標 ⭐⭐⭐：handover-stats / ar-recall-hit-rate / bcg-matrix
 */

import type { SideMenuGroup } from '@design/layout/config/menu.base';

export function getNx08SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '經營分析首頁',
      items: [
        { key: 'analytics.home',      label: '經營分析首頁',     href: '/dashboard/report/workspace' },
      ],
    },
    {
      group: '業務員 dashboard',
      items: [
        { key: 'analytics.sales.personal', label: '個人銷售業績',   href: '/dashboard/report/sales-rep/personal-sales' },
        { key: 'analytics.sales.customer', label: '客戶分析',       href: '/dashboard/report/sales-rep/customer-insight' },
        { key: 'analytics.sales.product',  label: '商品銷量排行',   href: '/dashboard/report/sales-rep/product-sales' },
      ],
    },
    {
      group: '倉管 dashboard',
      items: [
        { key: 'analytics.wh.turnover', label: '庫存周轉率',     href: '/dashboard/report/warehouse-staff/turnover' },
        { key: 'analytics.wh.dormant',  label: '滯銷品警示',     href: '/dashboard/report/warehouse-staff/dormant' },
        { key: 'analytics.wh.lowstock', label: '缺貨警示',       href: '/dashboard/report/warehouse-staff/low-stock-alert' },
      ],
    },
    {
      group: '倉管組長 dashboard',
      items: [
        { key: 'analytics.whl.cost',     label: '配送成本分析',          href: '/dashboard/report/warehouse-lead/delivery-cost' },
        { key: 'analytics.whl.route',    label: '路線效率',              href: '/dashboard/report/warehouse-lead/route-efficiency' },
        { key: 'analytics.whl.handover', label: '動態任務轉派統計 ⭐⭐⭐', href: '/dashboard/report/warehouse-lead/handover-stats' },
      ],
    },
    {
      group: '採購 dashboard',
      items: [
        { key: 'analytics.pur.supplier', label: '廠商評等',                  href: '/dashboard/report/purchasing/supplier-grade' },
        { key: 'analytics.pur.price',    label: '比價歷史',                  href: '/dashboard/report/purchasing/price-compare' },
        { key: 'analytics.pur.po',       label: '採購額月度統計',            href: '/dashboard/report/purchasing/po-stats' },
        { key: 'analytics.pur.arhit',    label: 'AR 補貨建議命中率 ⭐⭐⭐',  href: '/dashboard/report/purchasing/ar-recall-hit-rate' },
      ],
    },
    {
      group: '財務 dashboard',
      items: [
        { key: 'analytics.fin.ar',       label: '應收帳款總覽',  href: '/dashboard/report/finance/ar-overview' },
        { key: 'analytics.fin.ap',       label: '應付帳款總覽',  href: '/dashboard/report/finance/ap-overview' },
        { key: 'analytics.fin.cashflow', label: '現金流預測',    href: '/dashboard/report/finance/cash-flow' },
      ],
    },
    {
      group: '主管 dashboard',
      items: [
        { key: 'analytics.own.dept',    label: '部門業績',         href: '/dashboard/report/owner/dept-perf' },
        { key: 'analytics.own.ranking', label: '業務員排行',       href: '/dashboard/report/owner/sales-ranking' },
        { key: 'analytics.own.kpi',     label: 'KPI 目標 vs 實績', href: '/dashboard/report/owner/kpi-gap' },
      ],
    },
    {
      group: 'Crown 戰略 dashboard',
      items: [
        { key: 'analytics.str.cross',  label: '跨部門綜合',           href: '/dashboard/report/strategy/cross-module' },
        { key: 'analytics.str.bcg',    label: 'BCG matrix ⭐⭐⭐',     href: '/dashboard/report/strategy/bcg-matrix' },
        { key: 'analytics.str.kpi',    label: '戰略 KPI 複合',        href: '/dashboard/report/strategy/strategy-kpi' },
      ],
    },
  ];
}
