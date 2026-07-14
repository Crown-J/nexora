// apps/nx-ui/src/features/shared/instant-workbench/InstantWorkbench.tsx
// F2 即時工作檯・殼＝調度器（執行長 2026-07-14 拍板、docs/_team/instant-workbench-keymap-plan.md §3）
//
// 設計要點：
//   · 殼不重包視窗——三站都是現成的自帶 overlay 元件、殼只管「誰現在可見」＋分頁列
//   · F2 開檯（回上次的站）；開著再按 F2 = no-op（站 2「只開不關」拍板沿用、誤觸不能丟）
//   · 裸數字 1~N 切站（焦點守衛：輸入框內讓打字——料號全是數字）；
//     Alt+數字「不」歸殼：站 2/站 3 內部 Alt+1~5 切五階段是既有拍板、殼不搶
//   · 鍵盤監聽掛 window capture：搶在 modal-stack 的 document capture guard 之前、
//     不然工作檯開著時（stack 有層）殼的鍵會被 guard 吃掉
//   · 站 2 唯一「切走保留 session」：隱藏保活（hidden prop＋FocusLockedDialog suspended）；
//     站 1/站 3 切走即關（＝改版前 toggle 關窗的既有行為、站 3 清單本來就存 localStorage）
//   · 站關閉（使用者 X/Esc）→ 殼收檯；站 2 完成/放棄（onClose）→ 整站重生（「下一通」退場）
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  GlobalPartQuickSearch,
  type F2EntryContext,
} from '@design/components/quick-search/GlobalPartQuickSearch';

import { GlobalTransferInquiry } from '@/features/nx04/quote/ui/GlobalTransferInquiry';
import { QuoteWorkspace } from '@/features/nx04/quote/ui/QuoteWorkspace';

import { LIVE_STATIONS, type InstantStationNo } from './station-registry';

/** 焦點守衛：輸入情境讓原生（料號/數量全是數字、裸數字不能搶打字） */
function isEditableTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && !!t.closest('input,textarea,select,[contenteditable="true"]');
}

export function InstantWorkbench() {
  const [open, setOpen] = useState(false);
  // 預設站 2（即時報價）：F2=報價的既有肌肉記憶不搬家
  const [active, setActive] = useState<InstantStationNo>(2);
  // 站 2 隱藏保活（切走不丟客戶+報價清單）；epoch=完成/放棄後整站重生 key
  const [quoteMounted, setQuoteMounted] = useState(false);
  const [quoteEpoch, setQuoteEpoch] = useState(0);
  // 站 1 開站情境（nx-part-quick-search-open 嵌入點事件帶入、殼轉交）
  const [station1Ctx, setStation1Ctx] = useState<Partial<F2EntryContext> | undefined>(undefined);

  // latest-ref（effect 同步、react-hooks/refs 規範寫法）：給 window 監聽讀最新值
  const openRef = useRef(open);
  const activeRef = useRef(active);
  useEffect(() => {
    openRef.current = open;
    activeRef.current = active;
  }, [open, active]);

  const switchTo = useCallback((no: InstantStationNo) => {
    if (no === 2) setQuoteMounted(true);
    setActive(no);
    setOpen(true);
  }, []);

  // F2 開檯（window capture：比照原 F5 範式、modal 開著也叫得出來）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'F2' || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (!openRef.current) switchTo(activeRef.current); // 回上次的站
      // 開著再按 F2 = no-op（站 2 只開不關拍板沿用）
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [switchTo]);

  // 裸數字切站（檯開著時；焦點守衛；只認 registry 裡 live 的站號）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!openRef.current) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const no = Number(e.key) as InstantStationNo;
      if (!LIVE_STATIONS.some((s) => s.no === no)) return;
      if (isEditableTarget(e.target)) return;
      if (no === activeRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      switchTo(no);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [switchTo]);

  // 嵌入點開站 1（採購/倉管入口 openPartQuickSearch()、原 GlobalPartQuickSearch 自聽、收殼後歸殼）
  useEffect(() => {
    const h = (e: Event) => {
      setStation1Ctx((e as CustomEvent<Partial<F2EntryContext>>).detail ?? {});
      switchTo(1);
    };
    window.addEventListener('nx-part-quick-search-open', h);
    return () => window.removeEventListener('nx-part-quick-search-open', h);
  }, [switchTo]);

  // 站自己關（使用者 X/Esc）→ 收檯；站 2 保活不動（F2 再開還在）
  const closeWorkbench = useCallback(() => setOpen(false), []);
  // 站 2 完成/放棄（QuoteWorkspace onClose：存檔後「下一通」退場 / guarded 確認放棄）→ 整站重生
  const quoteClosed = useCallback(() => {
    setQuoteMounted(false);
    setQuoteEpoch((n) => n + 1);
    setOpen(false);
  }, []);

  const station2Visible = open && active === 2;

  return (
    <>
      {/* 分頁列（z 高於 modal 層；只列 live 站——planned 不渲染、執行長拍板不擺灰分頁） */}
      {open ? (
        <div className="fixed left-1/2 top-1.5 z-[2000] flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-popover/95 px-2 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          {LIVE_STATIONS.map((s) => (
            <button
              key={s.no}
              type="button"
              onClick={() => switchTo(s.no)}
              className={
                active === s.no
                  ? 'flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[12px] font-bold text-primary'
                  : 'flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] text-muted-foreground hover:text-foreground'
              }
            >
              <kbd className="rounded border border-border/60 bg-background/60 px-1 font-mono text-[10px] leading-4">
                {s.no}
              </kbd>
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* 站 1 庫存查詢（受控；切走即關＝原 F1 toggle 行為；B 期升級庫存視角） */}
      <GlobalPartQuickSearch
        open={open && active === 1}
        entryCtx={station1Ctx}
        onClosed={closeWorkbench}
      />

      {/* 站 2 即時報價（隱藏保活：切站不丟 session；hidden 時鍵盤閘門＋modal layer suspend） */}
      {quoteMounted ? (
        <div className={station2Visible ? undefined : 'hidden'}>
          <QuoteWorkspace key={quoteEpoch} hidden={!station2Visible} onClose={quoteClosed} />
        </div>
      ) : null}

      {/* 站 3 調貨詢價（wrapper 常駐：nx-transfer-add 清單事件＋回饋 chip 不論開關都收） */}
      <GlobalTransferInquiry open={open && active === 3} onClosed={closeWorkbench} />
    </>
  );
}
