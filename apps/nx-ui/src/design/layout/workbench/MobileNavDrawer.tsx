// apps/nx-ui/src/design/layout/workbench/MobileNavDrawer.tsx
// 手機版 L1：漢堡側滑抽屜（八大組選單手風琴 + 首頁 + 狀態列資訊收於底）。
'use client';

import { useState } from 'react';
import { Building2, ChevronDown, Home, User, X } from 'lucide-react';
import { BrandLogo } from '@design/brand/BrandLogo';
import type { MenuNode } from './menu-data';

type Props = {
  open: boolean;
  menus: MenuNode[];
  onClose: () => void;
  onSelect: (node: MenuNode) => void;
  onHome: () => void;
  status?: { tenantName: string; displayName: string; employeeNo: string };
};

function DrawerNode({
  node,
  depth,
  onPick,
}: {
  node: MenuNode;
  depth: number;
  onPick: (n: MenuNode) => void;
}) {
  const [exp, setExp] = useState(false);
  const pad = { paddingLeft: 16 + depth * 14 } as const;
  const hasChildren = !!node.children?.length;

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExp((v) => !v)}
          style={pad}
          className="flex w-full items-center justify-between py-2.5 pr-3 text-left text-[14px] text-foreground"
        >
          <span className={node.comingSoon ? 'text-muted-foreground' : ''}>
            {node.label}
            {node.comingSoon ? (
              <span className="ml-2 rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">即將推出</span>
            ) : null}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${exp ? 'rotate-180' : ''}`} />
        </button>
        {exp ? (
          node.comingSoon ? (
            <div style={{ paddingLeft: 16 + (depth + 1) * 14 }} className="py-2 text-[12.5px] text-muted-foreground">
              此模組即將推出
            </div>
          ) : (
            <div className="border-l border-border/50 ml-4">
              {node.children!.map((c) => (
                <DrawerNode key={c.key} node={c} depth={depth + 1} onPick={onPick} />
              ))}
            </div>
          )
        ) : null}
      </div>
    );
  }

  if (node.pending) {
    return (
      <div style={pad} className="flex items-center justify-between py-2.5 pr-3 text-[14px] text-muted-foreground/50">
        {node.label}
        <span className="rounded bg-muted px-1.5 py-px text-[10px]">建置中</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPick(node)}
      style={pad}
      className="block w-full py-2.5 pr-3 text-left text-[14px] text-foreground/90 hover:bg-primary/8 active:bg-primary/12"
    >
      {node.label}
    </button>
  );
}

export function MobileNavDrawer({ open, menus, onClose, onSelect, onHome, status }: Props) {
  if (!open) return null;
  const pick = (n: MenuNode) => {
    if (n.pending) return;
    onSelect(n);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-sm flex-col bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <BrandLogo size={28} className="rounded-md" />
          <span className="text-sm font-bold tracking-wide text-foreground">NEXORA GRID</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent/15"
            aria-label="關閉選單"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onHome();
            onClose();
          }}
          className="flex items-center gap-2 border-b border-border/60 px-4 py-3 text-left text-[14px] font-medium text-foreground hover:bg-primary/8"
        >
          <Home className="h-4 w-4 text-primary" />
          首頁
        </button>

        <div className="min-h-0 flex-1 divide-y divide-border/40 overflow-y-auto">
          {menus.map((m) => (
            <DrawerNode key={m.key} node={m} depth={0} onPick={pick} />
          ))}
        </div>

        {status ? (
          <div className="border-t border-border bg-secondary px-4 py-2.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              {status.tenantName}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {status.displayName}
              {status.employeeNo ? <span className="text-muted-foreground/70">（{status.employeeNo}）</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
