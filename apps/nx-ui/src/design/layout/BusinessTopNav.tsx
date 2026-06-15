// apps/nx-ui/src/features/layout/ui/BusinessTopNav.tsx
// v1.2 對齊軌 FU-05 + FU-06：業務語意橫排主導覽（含權限過濾）
//
// v1.2 §4.2：「NEXORA | 進貨 銷貨 庫存 財務 報表 | 主檔中心 設定 | 王經理▼」
//
// 5 大業務分類 + 主檔中心 + 設定
// 按權限過濾顯示（v1.2 §4.1「主導覽分類依使用者權限顯示」）

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { usePermissions } from '@/features/auth/hooks/useHasPermission';

interface NavEntry {
  key: string;
  label: string;
  href: string;
  /// 任一 permission 命中即顯示
  permissions: string[];
}

const PRIMARY_NAV: NavEntry[] = [
  {
    key: 'purchase',
    label: '進貨',
    href: '/dashboard/purchase',
    permissions: [
      'purchase.rfq.list',
      'purchase.po.list',
      'purchase.rr.list',
      'purchase.pr.list',
      'purchase.demand.list',
      'purchase.warranty-claim.list',
      'purchase.vendor.list',
      'purchase.product.list',
    ],
  },
  {
    key: 'sale',
    label: '銷貨',
    href: '/dashboard/sale/so',
    permissions: [
      'sale.quote.list',
      'sale.so.list',
      'sale.sr.list',
      'sale.ti.list',
      'sale.customer.list',
    ],
  },
  {
    key: 'inventory',
    label: '庫存',
    href: '/dashboard/inventory',
    permissions: [
      'inventory.stocktake.list',
      'inventory.stock-query.list',
      'inventory.issue-report.list',
      'inventory.conversion.list',
      'inventory.location.list',
      'inventory.part-stock-setting.list',
    ],
  },
  {
    key: 'finance',
    label: '財務',
    href: '/dashboard/finance',
    permissions: [
      'finance.ar.list',
      'finance.ap.list',
      'finance.voucher.list',
      'finance.closing.list',
      'finance.account.list',
    ],
  },
  {
    key: 'report',
    label: '報表',
    href: '/dashboard/report',
    permissions: [
      'report.personal.view',
      'report.sales.view',
      'report.purchase.view',
      'report.inventory.view',
      'report.finance.view',
      'report.operation.view',
    ],
  },
];

const SECONDARY_NAV: NavEntry[] = [
  {
    key: 'master',
    label: '主檔中心',
    href: '/dashboard/base',
    permissions: [
      'master.customer.list',
      'master.supplier.list',
      'master.peer.list',
      'master.bank.list',
      'master.vendor.list',
      'master.product.list',
      'master.warehouse.list',
      'master.employee.list',
    ],
  },
  {
    key: 'settings',
    label: '設定',
    href: '/dashboard/settings',
    permissions: [
      'settings.company.edit',
      'settings.role.list',
      'settings.system-param.edit',
      'settings.account.manage',
    ],
  },
];

function hasAny(perms: string[], required: string[]): boolean {
  if (perms.includes('*')) return true;
  return required.some((r) => perms.includes(r));
}

export function BusinessTopNav() {
  const pathname = usePathname() ?? '';
  const { permissions, loading } = usePermissions();

  if (loading) return null;

  const visiblePrimary = PRIMARY_NAV.filter((n) => hasAny(permissions, n.permissions));
  const visibleSecondary = SECONDARY_NAV.filter((n) => hasAny(permissions, n.permissions));

  // 沒任何權限的 user（一般員工剛建、負責人還沒給角色）
  if (!visiblePrimary.length && !visibleSecondary.length) return null;

  return (
    <nav
      aria-label="業務主導覽"
      className="flex flex-wrap items-center gap-1 border-b bg-background/60 px-4 py-2 text-sm"
    >
      <span className="mr-3 font-semibold tracking-wider text-primary">NEXORA</span>
      {visiblePrimary.map((entry) => {
        const isActive = pathname.startsWith(entry.href);
        return (
          <Link
            key={entry.key}
            href={entry.href}
            className={`rounded px-3 py-1 transition ${
              isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {entry.label}
          </Link>
        );
      })}
      {visibleSecondary.length ? (
        <>
          <span className="mx-2 text-muted-foreground">|</span>
          {visibleSecondary.map((entry) => {
            const isActive = pathname.startsWith(entry.href);
            return (
              <Link
                key={entry.key}
                href={entry.href}
                className={`rounded px-3 py-1 transition ${
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                {entry.label}
              </Link>
            );
          })}
        </>
      ) : null}
    </nav>
  );
}
