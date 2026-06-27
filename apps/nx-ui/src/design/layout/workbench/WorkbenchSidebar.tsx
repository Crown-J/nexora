// apps/nx-ui/src/design/layout/workbench/WorkbenchSidebar.tsx
// 現代 ERP 左側導覽側欄：
// - 展開：手風琴（業務群組 → 子項，可多層；主檔六分區自動嵌套）
// - 收合：純 icon 直欄，點 icon 飛出該群組子選單
// 資料 = BUSINESS_MENUS（從 DOCK_NAV 衍生、導覽單一來源）

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Database,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { MenuNode } from './menu-data';

const GROUP_ICON: Record<string, LucideIcon> = {
  master: Database,
  purchase: ShoppingCart,
  sales: TrendingUp,
  inventory: Package,
  finance: DollarSign,
  reports: BarChart3,
};

function containsHref(node: MenuNode, href: string): boolean {
  if (node.href && node.href === href) return true;
  return (node.children ?? []).some((c) => containsHref(c, href));
}

type RowProps = {
  node: MenuNode;
  depth: number;
  activeHref: string;
  onSelect: (n: MenuNode) => void;
  showIcon?: boolean;
};

function NavRow({ node, depth, activeHref, onSelect, showIcon }: RowProps) {
  const hasChildren = !!node.children?.length;
  const [open, setOpen] = useState(() => hasChildren && containsHref(node, activeHref));
  const Icon = showIcon ? GROUP_ICON[node.key] : undefined;
  const active = !!node.href && node.href === activeHref;
  const pad = { paddingLeft: `${0.75 + depth * 0.85}rem` };

  if (!hasChildren) {
    return (
      <button
        type="button"
        onClick={() => onSelect(node)}
        style={pad}
        className={`flex w-full items-center gap-2.5 py-1.5 pr-3 text-left text-[13px] transition ${
          active
            ? 'bg-primary/12 font-medium text-primary'
            : 'text-foreground/85 hover:bg-foreground/[0.05]'
        }`}
      >
        {Icon ? <Icon className="h-[16px] w-[16px] flex-none" /> : null}
        <span className="truncate">{node.label}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={pad}
        className="flex w-full items-center gap-2.5 py-1.5 pr-2.5 text-left text-[13px] text-foreground/85 transition hover:bg-foreground/[0.05]"
      >
        {Icon ? <Icon className="h-[16px] w-[16px] flex-none" /> : null}
        <span className="flex-1 truncate">{node.label}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 flex-none text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-none text-muted-foreground" />
        )}
      </button>
      {open
        ? node.children!.map((c) => (
            <NavRow
              key={c.key}
              node={c}
              depth={depth + 1}
              activeHref={activeHref}
              onSelect={onSelect}
            />
          ))
        : null}
    </>
  );
}

type Props = {
  collapsed: boolean;
  items: MenuNode[];
  activeHref: string;
  onSelect: (n: MenuNode) => void;
};

export function WorkbenchSidebar({ collapsed, items, activeHref, onSelect }: Props) {
  if (collapsed) return <CollapsedRail items={items} activeHref={activeHref} onSelect={onSelect} />;

  return (
    <nav className="w-60 shrink-0 overflow-y-auto border-r border-border bg-card py-1.5">
      {items.map((g) => (
        <NavRow key={g.key} node={g} depth={0} activeHref={activeHref} onSelect={onSelect} showIcon />
      ))}
    </nav>
  );
}

function CollapsedRail({ items, activeHref, onSelect }: Omit<Props, 'collapsed'>) {
  const [flyout, setFlyout] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!flyout) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFlyout(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [flyout]);

  return (
    <nav
      ref={ref}
      className="relative flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-2"
    >
      {items.map((g) => {
        const Icon = GROUP_ICON[g.key] ?? Database;
        const active = containsHref(g, activeHref);
        const hasChildren = !!g.children?.length;
        return (
          <div key={g.key} className="relative">
            <button
              type="button"
              title={g.label}
              onClick={() => {
                if (hasChildren) setFlyout((f) => (f === g.key ? null : g.key));
                else onSelect(g);
              }}
              className={`grid h-9 w-9 place-items-center rounded-md transition ${
                active
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
            {flyout === g.key && hasChildren ? (
              <div className="absolute left-full top-0 z-40 ml-1 max-h-[72vh] w-56 overflow-auto rounded-md border border-border bg-popover py-1 shadow-xl">
                <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
                  {g.label}
                </div>
                {(g.children ?? []).map((c) => (
                  <NavRow
                    key={c.key}
                    node={c}
                    depth={0}
                    activeHref={activeHref}
                    onSelect={(n) => {
                      onSelect(n);
                      setFlyout(null);
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
