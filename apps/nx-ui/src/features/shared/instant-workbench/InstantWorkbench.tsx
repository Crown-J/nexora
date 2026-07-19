// apps/nx-ui/src/features/shared/instant-workbench/InstantWorkbench.tsx
// F2 即時工作檯・殼＝啟動器選單＋調度器（執行長 2026-07-14 拍板、instant-workbench-keymap-plan.md §3）
//
// 動線（執行長本機驗收後修正版：像選單一樣列出 1/2/3、不做常駐分頁列）：
//   F2 → 選單（直排列出各站、數字鍵直達）→ 按 1/2/3 進站 → 站內再按 F2 = 選單疊上來換站
//   數字鍵只在選單內作用（選單是 focused dialog）——跟站內打料號/數量零打架、不需焦點守衛
//
// 設計要點：
//   · 殼不重包視窗——三站都是現成的自帶 overlay 元件、殼只管選單＋「誰現在開著」
//   · 站 2 唯一「切走保留 session」：隱藏保活（hidden prop＋FocusLockedDialog suspended）；
//     站 1/站 3 切走即關（＝改版前 toggle 關窗的既有行為、站 3 清單本來就存 localStorage）
//   · 站關閉（使用者 X/Esc）→ 全收；站 2 完成/放棄（onClose）→ 整站重生（「下一通」退場）
//   · F2 監聽掛 window capture：搶在 modal-stack 的 document capture guard 之前
//   · 選單用 FocusLockedDialog：modal-stack 自動管焦點/Esc/層級（可疊在站上換站）
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  GlobalPartQuickSearch,
  type F2EntryContext,
} from '@design/components/quick-search/GlobalPartQuickSearch';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { GlobalTransferInquiry } from '@/features/nx04/quote/ui/GlobalTransferInquiry';
import { QuoteWorkspace } from '@/features/nx04/quote/ui/QuoteWorkspace';
import { InstantSalesWorkspace } from '@/features/nx04/sales/ui/InstantSalesWorkspace';

import { LIVE_STATIONS, stationHasUnsavedData, type InstantStationNo } from './station-registry';

/** 各站選單副標（錨提示、拍板：四站各有各的錨） */
const ANCHOR_HINT: Record<string, string> = {
  part: '料號直查・庫存/庫位',
  customer: '先定客戶・連續報價',
  'transfer-target': '同行調貨・詢價清單',
  basket: '收集待補・批次產單',
};

export function InstantWorkbench() {
  // 目前開著的站（null=沒開）；lastStation=選單游標預設（回上次的站、初始站 2=F2 報價肌肉記憶）
  const [current, setCurrent] = useState<InstantStationNo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastStation, setLastStation] = useState<InstantStationNo>(2);
  // 站 2 隱藏保活（切走不丟客戶+報價清單）；epoch=完成/放棄後整站重生 key
  const [quoteMounted, setQuoteMounted] = useState(false);
  const [quoteEpoch, setQuoteEpoch] = useState(0);
  // 站 1 開站情境（nx-part-quick-search-open 嵌入點事件帶入、殼轉交）
  const [station1Ctx, setStation1Ctx] = useState<Partial<F2EntryContext> | undefined>(undefined);

  const enterStation = useCallback(
    (no: InstantStationNo) => {
      // 切站守衛（執行長 2026-07-19）：「切走即關」的站有未完成資料 → 先確認
      //（站 2 切走保活不會註冊；取消 → 留在原站、選單留著讓使用者 Esc 回去）
      if (current !== null && current !== no && stationHasUnsavedData(current)) {
        if (!window.confirm('目前站內還有未完成的資料、切站會清空——確定切換？')) return;
      }
      if (no === 2) setQuoteMounted(true);
      setLastStation(no);
      setCurrent(no);
      setMenuOpen(false);
    },
    [current],
  );

  // F2 = 選單 toggle（window capture：比照原 F5 範式、modal 開著也叫得出來）
  // 鍵位宣告：design/keyboard/keymap-registry.ts『instant-workbench』（全域保留鍵 SSOT）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'F2' || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      setMenuOpen((v) => !v);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);

  // 嵌入點開站 1（採購/倉管入口 openPartQuickSearch()、帶情境直達不走選單）
  useEffect(() => {
    const h = (e: Event) => {
      setStation1Ctx((e as CustomEvent<Partial<F2EntryContext>>).detail ?? {});
      enterStation(1);
    };
    window.addEventListener('nx-part-quick-search-open', h);
    return () => window.removeEventListener('nx-part-quick-search-open', h);
  }, [enterStation]);

  // 站自己關（使用者 X/Esc）→ 全收（F2 再開選單、游標停上次的站）
  const stationClosed = useCallback(() => setCurrent(null), []);
  // 站 2 完成/放棄（QuoteWorkspace onClose：存檔後「下一通」退場 / guarded 確認放棄）→ 整站重生
  const quoteClosed = useCallback(() => {
    setQuoteMounted(false);
    setQuoteEpoch((n) => n + 1);
    setCurrent(null);
  }, []);

  const station2Visible = current === 2;

  return (
    <>
      {/* 啟動器選單（F2 toggle；可疊在站上換站；數字直達、Esc 關） */}
      {menuOpen ? (
        <WorkbenchMenu
          current={current}
          defaultStation={lastStation}
          onPick={enterStation}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}

      {/* 站 1 庫存查詢（受控；切走即關＝原 F1 toggle 行為；B 期升級庫存視角） */}
      <GlobalPartQuickSearch
        open={current === 1}
        entryCtx={station1Ctx}
        onClosed={stationClosed}
      />

      {/* 站 2 即時報價（隱藏保活：切站不丟 session；hidden 時鍵盤閘門＋modal layer suspend） */}
      {quoteMounted ? (
        <div className={station2Visible ? undefined : 'hidden'}>
          <QuoteWorkspace key={quoteEpoch} hidden={!station2Visible} onClose={quoteClosed} />
        </div>
      ) : null}

      {/* 站 3 調貨詢價（wrapper 常駐：nx-transfer-add 清單事件＋回饋 chip 不論開關都收） */}
      <GlobalTransferInquiry open={current === 3} onClosed={stationClosed} />

      {/* 站 4 即時銷售（成交快速建單精靈；切走即關＝比照站 1/3 toggle 行為） */}
      <InstantSalesWorkspace open={current === 4} onClosed={stationClosed} />
    </>
  );
}

/** F2 啟動器選單：直排列出 live 站（planned 不渲染、執行長拍板不擺灰項）*/
function WorkbenchMenu({
  current,
  defaultStation,
  onPick,
  onClose,
}: {
  current: InstantStationNo | null;
  defaultStation: InstantStationNo;
  onPick: (no: InstantStationNo) => void;
  onClose: () => void;
}) {
  const [sel, setSel] = useState(() => {
    const target = current ?? defaultStation;
    const idx = LIVE_STATIONS.findIndex((s) => s.no === target);
    return idx >= 0 ? idx : 0;
  });
  // 初始焦點落在預設站（回上次的站）；↑↓ 焦點跟著走、onFocus 回寫 sel（Tab 也同步）
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const initialSelRef = useRef(sel);
  const initialBtnRef = useRef<HTMLElement | null>(null);

  // 選單鍵盤流：數字直達、↑↓ 移動、Enter/Space 進站（Esc 由 FocusLockedDialog 收）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const no = Number(e.key) as InstantStationNo;
    if (LIVE_STATIONS.some((s) => s.no === no)) {
      e.preventDefault();
      e.stopPropagation();
      onPick(no);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const d = e.key === 'ArrowDown' ? 1 : LIVE_STATIONS.length - 1;
      const next = (sel + d) % LIVE_STATIONS.length;
      setSel(next);
      btnRefs.current[next]?.focus();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onPick(LIVE_STATIONS[sel].no);
    }
  };

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      initialFocusRef={initialBtnRef}
      ariaLabel="即時工作檯選單"
      backdropClassName="bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="w-[340px] rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-150"
    >
      <div onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
          <h2 className="text-sm font-bold tracking-wide">即時工作檯</h2>
          <kbd className="ml-auto rounded border border-border/60 bg-background/60 px-1.5 font-mono text-[10px] text-muted-foreground">
            F2
          </kbd>
        </div>
        <div className="flex flex-col gap-1 p-2">
          {LIVE_STATIONS.map((s, i) => (
            <button
              key={s.no}
              type="button"
              ref={(el) => {
                btnRefs.current[i] = el;
                if (i === initialSelRef.current) initialBtnRef.current = el;
              }}
              onClick={() => onPick(s.no)}
              onFocus={() => setSel(i)}
              onMouseEnter={() => setSel(i)}
              className={
                i === sel
                  ? 'flex items-center gap-3 rounded-xl border border-primary/50 bg-primary/12 px-3 py-2.5 text-left outline-none'
                  : 'flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left outline-none hover:bg-muted/40'
              }
            >
              <kbd
                className={
                  i === sel
                    ? 'flex size-7 items-center justify-center rounded-lg border border-primary/60 bg-primary/15 font-mono text-[13px] font-bold text-primary'
                    : 'flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background/60 font-mono text-[13px] text-muted-foreground'
                }
              >
                {s.no}
              </kbd>
              <span className="flex flex-col">
                <span className={i === sel ? 'text-[13px] font-bold text-primary' : 'text-[13px] font-medium'}>
                  {s.label}
                  {current === s.no ? (
                    <span className="ml-2 text-[10px] text-primary/80">● 開啟中</span>
                  ) : null}
                </span>
                <span className="text-[11px] text-muted-foreground">{s.hint ?? ANCHOR_HINT[s.anchor]}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
          數字直達・↑↓ 選擇・Enter 進站・Esc 關閉
        </div>
      </div>
    </FocusLockedDialog>
  );
}
