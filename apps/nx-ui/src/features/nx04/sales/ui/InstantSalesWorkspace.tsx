// apps/nx-ui/src/features/nx04/sales/ui/InstantSalesWorkspace.tsx
// F2 即時工作檯・站 4「即時銷售」——成交快速建單精靈（5 步 客戶→明細→交易→出貨→訊息）
//
// 拍板（執行長 2026-07-18）：
//   · 站 4 = 即時銷售、原「即時補貨」順延站 5（station-registry.ts）
//   · 精靈只做到「建單 + 確認」→ 落撿貨清單、倉庫接手後續（不在此撿貨/出貨）
// 範式對齊 F5 調貨詢價（GlobalTransferInquiry）：單一元件內 stage(1~5) 切步、
//   左 52px 流程軌 + 中主區 + 右副區、FocusLockedDialog 全螢幕、Alt+1~5 跳步、Enter 走到底。
// 後端：POST /nx04/so（DRAFT）→ PATCH status=CONFIRMED；零 schema、沿用現成端點。
//
// ⚠️ commit 1 骨架：五步殼 + 導覽 + 開關；各步內容為佔位，後續 commit 逐步填。
'use client';

import { ListPlus, MessageSquareText, ReceiptText, Truck, UserRound, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

/** 站內步驟號（5 步；與 SO 建單流程對應） */
type SalesStage = 1 | 2 | 3 | 4 | 5;

type StageDef = { n: SalesStage; label: string; icon: ReactNode; hint: string };

const STAGE_DEFS: StageDef[] = [
  { n: 1, label: '客戶', icon: <UserRound size={18} />, hint: '選擇客戶' },
  { n: 2, label: '明細', icon: <ListPlus size={18} />, hint: '品項・數量・價格' },
  { n: 3, label: '交易', icon: <ReceiptText size={18} />, hint: '付款方式・發票種類' },
  { n: 4, label: '出貨', icon: <Truck size={18} />, hint: '出貨倉庫・取貨方式' },
  { n: 5, label: '訊息', icon: <MessageSquareText size={18} />, hint: '確認・訊息內容' },
];

/** 對外：受控元件，殼以 open/onClosed 掛載（比照 GlobalTransferInquiry） */
export function InstantSalesWorkspace({ open, onClosed }: { open: boolean; onClosed: () => void }) {
  if (!open) return null;
  return <InstantSalesDialog onClose={onClosed} />;
}

function InstantSalesDialog({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<SalesStage>(1);

  // Alt+1~5 直接跳步（全域 capture，比照 F5）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        e.preventDefault();
        e.stopPropagation();
        setStage(n as SalesStage);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, []);

  const cur = STAGE_DEFS.find((s) => s.n === stage)!;

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="即時銷售"
      backdropClassName="bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: 'min(1080px, 96vw)', height: 'min(680px, 92vh)' }}
    >
      {/* header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
        <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
        <h2 className="text-sm font-bold tracking-wide">即時銷售</h2>
        <span className="text-[11px] text-muted-foreground">・成交快速建單</span>
        <kbd className="ml-auto rounded border border-border/60 bg-background/60 px-1.5 font-mono text-[10px] text-muted-foreground">
          F2
        </kbd>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* body：52px 流程軌 | 主區 | 副區 */}
      <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(360px,1fr)_minmax(320px,1fr)]">
        {/* 流程軌 */}
        <nav className="relative flex flex-col items-center justify-evenly border-r border-border/40 py-6">
          <span aria-hidden className="absolute bottom-12 left-1/2 top-12 w-[2px] -translate-x-1/2 bg-border/70" />
          {STAGE_DEFS.map((s) => {
            const active = s.n === stage;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => setStage(s.n)}
                title={`${s.label}（Alt+${s.n}）`}
                className={
                  active
                    ? 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(2,237,171,0.35)]'
                    : 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-border/60 bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }
              >
                {s.icon}
                <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border border-border/60 bg-background font-mono text-[9px] text-muted-foreground">
                  {s.n}
                </span>
              </button>
            );
          })}
        </nav>

        {/* 主區（佔位；後續 commit 依 stage 填內容） */}
        <section className="flex min-h-0 flex-col overflow-auto p-5">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-base font-bold">
              {cur.n}. {cur.label}
            </span>
            <span className="text-[12px] text-muted-foreground">{cur.hint}</span>
          </div>
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border/50 text-sm text-muted-foreground">
            步驟 {cur.n}「{cur.label}」建置中
          </div>
        </section>

        {/* 副區（佔位） */}
        <aside className="flex min-h-0 flex-col overflow-auto border-l border-border/40 p-5">
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border/40 text-[12px] text-muted-foreground">
            右側資訊區（步驟 5 訊息設定）
          </div>
        </aside>
      </div>

      {/* footer 快捷鍵提示 */}
      <div className="border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
        Alt+1~5 跳步・Enter 下一步・Esc 關閉
      </div>
    </FocusLockedDialog>
  );
}
