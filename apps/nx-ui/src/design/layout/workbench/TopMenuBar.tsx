// apps/nx-ui/src/design/layout/workbench/TopMenuBar.tsx
// 傳統 ERP 頂部功能選單列（偉盟風）：系統 / 主檔 / 採購 / 銷貨 / 庫存 / 財務 / 報表 / 視窗
// - 點頂層展開下拉、展開後滑過其他頂層即切換
// - 多層子選單向右飛出（主檔六分區 → 各主檔）
// - 點外面 / Esc 關閉；選擇葉節點 → onSelect

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { MenuNode } from './menu-data';

type Props = {
  menus: MenuNode[];
  onSelect: (node: MenuNode) => void;
  onHome: () => void;
};

function SubMenu({ items, onPick }: { items: MenuNode[]; onPick: (n: MenuNode) => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <div className="min-w-[13rem] py-1">
      {items.map((it) =>
        it.children?.length ? (
          <div
            key={it.key}
            className="relative"
            onMouseEnter={() => setOpenKey(it.key)}
            onMouseLeave={() => setOpenKey(null)}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12.5px] text-popover-foreground hover:bg-primary/10"
            >
              <span>{it.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {openKey === it.key && (
              <div className="absolute left-full top-0 -mt-1 z-10 rounded-sm border border-border bg-popover shadow-lg">
                <SubMenu items={it.children} onPick={onPick} />
              </div>
            )}
          </div>
        ) : (
          <button
            key={it.key}
            type="button"
            onClick={() => onPick(it)}
            className="block w-full px-3 py-1.5 text-left text-[12.5px] text-popover-foreground hover:bg-primary/10"
          >
            {it.label}
          </button>
        ),
      )}
    </div>
  );
}

export function TopMenuBar({ menus, onSelect, onHome }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const pick = useCallback(
    (node: MenuNode) => {
      close();
      onSelect(node);
    },
    [close, onSelect],
  );

  return (
    <div ref={ref} className="flex items-center gap-0.5 border-b border-border bg-card px-1.5">
      <button
        type="button"
        onClick={onHome}
        title="首頁"
        className="grid h-7 w-7 place-items-center rounded-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <Home className="h-[15px] w-[15px]" />
      </button>
      <span className="mx-1 h-4 w-px bg-border" />
      {menus.map((m) => {
        const hasChildren = !!m.children?.length;
        const isOpen = open === m.key;
        return (
          <div key={m.key} className="relative">
            <button
              type="button"
              onClick={() => {
                if (hasChildren) setOpen(isOpen ? null : m.key);
                else pick(m);
              }}
              onMouseEnter={() => {
                if (open && hasChildren) setOpen(m.key);
              }}
              className={`rounded-sm px-3 py-1.5 text-[13px] transition ${
                isOpen ? 'bg-primary/12 text-foreground' : 'text-foreground hover:bg-foreground/[0.06]'
              }`}
            >
              {m.label}
            </button>
            {isOpen && hasChildren && (
              <div className="absolute left-0 top-full z-30 mt-px rounded-sm border border-border bg-popover shadow-xl">
                <SubMenu items={m.children!} onPick={pick} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
