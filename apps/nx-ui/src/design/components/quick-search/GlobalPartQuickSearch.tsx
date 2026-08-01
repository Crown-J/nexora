// apps/nx-ui/src/design/components/quick-search/GlobalPartQuickSearch.tsx
// 即時工作檯・站 1（庫存查詢）：視窗 1（搜尋窗）/ 視窗 2（主視窗）管理（執行長 2026-06-25 視窗 2 任務單）
//
// ⚠️ 收殼改版（執行長 2026-07-14 拍板、instant-workbench-keymap-plan.md）：
//   F1 釋出還瀏覽器、本元件改受控：InstantWorkbench 給 open prop 開關、
//   使用者自己關（X/Esc）→ onClosed 通知殼收檯。B 期升級庫存視角（異動/庫位/權限切欄）。
//   歷史：原 F2（2026-06-25）→ F1（07-11 夜 F1/F2 分流）→ 站 1（07-14 收殼）。
//
// 流程：
//   1. 站 1 開 → 搜尋窗開
//   2. 搜尋窗 Enter selectRow → dispatch `nx-part-selected` event；搜尋窗仍 mounted
//   3. 本元件接 event → setMainPartId、PartMainWindow 開（疊在搜尋窗上）
//   4. 主視窗 Esc/退回搜尋 → setMainPartId(null)、自動回搜尋窗（搜尋條件保留）
//   5. 主視窗 X 全關 → 兩窗都關、onClosed 通知殼
//
// F2 改版 Step 5（docs/_team/f2-redesign-handoff.md §1 §4、執行長 2026-06-25 拍板）：
//   一個模板、三種入口、銷售為錨。倉別＝情境決定（棄用全域開關）：
//   · 銷售（F2 主動獨立入口、預設）：即時報價選客戶後 dispatch `nx-f2-context-warehouse`
//     → 帶出客戶預設出貨倉（客戶主檔 defaultWarehouseId）
//   · 採購／倉管（低頻、嵌入點）：openPartQuickSearch({ entry }) 開窗；
//     倉管入口視窗 2 自動展開各倉分布（看自己隸屬倉、本倉 pin 頂）
//   情境活在本層：視窗 2 退回搜尋窗再進不丟、closeAll 才清。
//
// modal-stack 自動管理：主窗在搜尋窗之上、guard 隔離背景、Esc 逐層回退
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { PartMainWindow } from './PartMainWindow';
import { PartQuickSearchModal } from './PartQuickSearchModal';

const CLOSE_ANIMATION_MS = 200;

type PartSelectedDetail = {
  partId: string;
  code?: string;
  name?: string;
};

/** F2 三入口情境（交接 §1：銷售為錨 → 預設 sales）*/
export type F2EntryContext = {
  entry: 'sales' | 'purchase' | 'warehouse';
  /** 情境倉（銷售=客戶預設出貨倉；由 nx-f2-context-warehouse 事件帶入）*/
  warehouseId?: string;
  warehouseName?: string;
  /** 情境倉徽章文字（如「客戶倉」）*/
  label?: string;
  /**
   * 開站時預先填入的搜尋字並自動搜一次。
   * v3.0.0 §3.3：工作檯的搜尋框打完 Enter 帶進來——「進系統就能直接打料號」，
   * ⛔ 不讓使用者在工作檯打一次、進站再打一次。
   */
  initialKeyword?: string;
};

type ContextWarehouseDetail = {
  warehouseId?: string;
  warehouseName?: string;
  label?: string;
};

const DEFAULT_CONTEXT: F2EntryContext = { entry: 'sales' };

/** 嵌入點開窗（採購需求單旁 / 倉管庫存管理）。features 層直接呼叫。
 *  收殼後事件由 InstantWorkbench 接（開檯落站 1 帶情境）、呼叫端 API 不變。*/
export function openPartQuickSearch(ctx?: Partial<F2EntryContext>) {
  window.dispatchEvent(new CustomEvent('nx-part-quick-search-open', { detail: ctx ?? {} }));
}

export function GlobalPartQuickSearch({
  open: stationOpen,
  entryCtx,
  onClosed,
}: {
  /** 殼控開關（InstantWorkbench 站 1）*/
  open: boolean;
  /** 開站情境（嵌入點事件帶的 entry/倉別、殼轉交）*/
  entryCtx?: Partial<F2EntryContext>;
  /** 使用者自己關（X / Esc 鏈）→ 通知殼收檯 */
  onClosed?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  // 視窗 2：主視窗的 partId（null = 主視窗未開）
  const [mainPartId, setMainPartId] = useState<string | null>(null);
  const [entryContext, setEntryContext] = useState<F2EntryContext>(DEFAULT_CONTEXT);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback((ctx?: Partial<F2EntryContext>) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setEntryContext({ ...DEFAULT_CONTEXT, ...ctx });
    setClosing(false);
    setMounted(true);
  }, []);

  const closeAll = useCallback(() => {
    if (!mounted || closing) return;
    setMainPartId(null);
    setEntryContext(DEFAULT_CONTEXT);
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setMounted(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, CLOSE_ANIMATION_MS);
  }, [mounted, closing]);

  // 殼控開關（收殼 2026-07-14）：open prop 驅動。F1 監聽已釋出還瀏覽器、
  // nx-part-quick-search-open 事件改由 InstantWorkbench 接（開檯落站 1）。
  // 走 ref 避免 open/closeAll 身分變動重跑（重跑 open() 會把事件累積的情境倉洗掉）。
  const openFnRef = useRef(open);
  const closeAllRef = useRef(closeAll);
  const entryCtxRef = useRef(entryCtx);
  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    // latest-ref（effect 同步、react-hooks/refs 規範寫法）
    openFnRef.current = open;
    closeAllRef.current = closeAll;
    entryCtxRef.current = entryCtx;
    onClosedRef.current = onClosed;
  }, [open, closeAll, entryCtx, onClosed]);
  useEffect(() => {
    if (stationOpen) openFnRef.current(entryCtxRef.current);
    else closeAllRef.current();
  }, [stationOpen]);

  // 使用者自己關（主視窗 X / 搜尋窗 Esc 鏈）：關窗 + 通知殼收檯
  const userClose = useCallback(() => {
    closeAllRef.current();
    onClosedRef.current?.();
  }, []);

  // 情境倉事件（銷售錨定：即時報價選客戶 → 客戶預設出貨倉）。
  // 掛本層而非視窗 2：視窗 2 退回搜尋窗再進、情境不丟。
  useEffect(() => {
    if (!mounted) return;
    const h = (e: Event) => {
      const ce = e as CustomEvent<ContextWarehouseDetail>;
      const { warehouseId, warehouseName, label } = ce.detail ?? {};
      if (!warehouseId) return;
      setEntryContext((prev) => ({ ...prev, warehouseId, warehouseName, label }));
    };
    window.addEventListener('nx-f2-context-warehouse', h);
    return () => window.removeEventListener('nx-f2-context-warehouse', h);
  }, [mounted]);

  // 接搜尋窗的 nx-part-selected event → 開主視窗
  useEffect(() => {
    if (!mounted) return;
    const h = (e: Event) => {
      const ce = e as CustomEvent<PartSelectedDetail>;
      const id = ce.detail?.partId;
      if (typeof id === 'string' && id) {
        setMainPartId(id);
      }
    };
    window.addEventListener('nx-part-selected', h);
    return () => window.removeEventListener('nx-part-selected', h);
  }, [mounted]);

  // 主視窗退回搜尋窗（保留搜尋窗 state）
  const backToSearch = useCallback(() => {
    setMainPartId(null);
  }, []);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  if (!mounted) return null;
  return (
    <>
      {/* key：帶著不同搜尋字重開站要重新 mount，否則 initialPartNo 只在第一次生效 */}
      <PartQuickSearchModal
        key={entryContext.initialKeyword ?? ''}
        closing={closing}
        onClose={userClose}
        initialPartNo={entryContext.initialKeyword}
      />
      {mainPartId && (
        <PartMainWindow
          partId={mainPartId}
          entryContext={entryContext}
          onBack={backToSearch}
          onClose={userClose}
          // Alt+D 加入調貨詢價清單（調貨詢價軌 2026-07-12 接通、執行長拍板 a 案）：
          // design 層不 import nx04、dispatch 事件由 GlobalTransferInquiry（F5）接
          onTransferMarked={(rows) =>
            window.dispatchEvent(
              new CustomEvent('nx-transfer-add', {
                // 缺貨待辦重設計（2026-07-13）：待辦每筆帶客戶+數量；F1 通用查詢無客戶情境 → null、量預設 1
                detail: {
                  items: rows.map((r) => ({
                    customerId: null,
                    customerCode: null,
                    customerName: null,
                    partId: r.id,
                    code: r.code,
                    name: r.name,
                    qty: 1,
                  })),
                },
              }),
            )
          }
        />
      )}
    </>
  );
}
