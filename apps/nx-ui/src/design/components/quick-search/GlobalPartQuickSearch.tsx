// apps/nx-ui/src/design/components/quick-search/GlobalPartQuickSearch.tsx
// F1 全域 hotkey + 視窗 1（搜尋窗）/ 視窗 2（主視窗）管理（執行長 2026-06-25 視窗 2 任務單）
//
// ⚠️ 執行長 2026-07-11 夜拍板・F1/F2 分流（偉盟單一即時報價的解構）：
//   · F1 = 即時庫存查詢（本檔、原 F2 整組改綁）：純查庫存/庫位/歷史、不綁客戶
//   · F2 = 即時報價查詢（features/nx04/quote/ui/GlobalQuoteSession）：先選客戶一次
//     → 連續查料連續報價 → 產訊息複製。解決「每報一顆要重選一次客戶」。
//
// 流程：
//   1. F1 → 搜尋窗開
//   2. 搜尋窗 Enter selectRow → dispatch `nx-part-selected` event；搜尋窗仍 mounted
//   3. 本元件接 event → setMainPartId、PartMainWindow 開（疊在搜尋窗上）
//   4. 主視窗 Esc/退回搜尋 → setMainPartId(null)、自動回搜尋窗（搜尋條件保留）
//   5. 主視窗 X 全關 → 兩窗都關
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
};

type ContextWarehouseDetail = {
  warehouseId?: string;
  warehouseName?: string;
  label?: string;
};

const DEFAULT_CONTEXT: F2EntryContext = { entry: 'sales' };

/** 嵌入點開窗（採購需求單旁 / 倉管庫存管理）。features 層直接呼叫。*/
export function openPartQuickSearch(ctx?: Partial<F2EntryContext>) {
  window.dispatchEvent(new CustomEvent('nx-part-quick-search-open', { detail: ctx ?? {} }));
}

export function GlobalPartQuickSearch() {
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

  // F1 toggle（原 F2、2026-07-11 夜分流）：若主視窗開、F1 先關主視窗回搜尋窗；
  // 否則 toggle 搜尋窗（銷售為錨、預設 sales）。preventDefault 攔瀏覽器 F1 說明頁。
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        if (mainPartId) {
          // 主視窗開著 F1 → 回搜尋窗
          setMainPartId(null);
        } else if (mounted) {
          closeAll();
        } else {
          open();
        }
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [mounted, mainPartId, open, closeAll]);

  // 嵌入點開窗事件（採購 / 倉管入口、帶情境）
  useEffect(() => {
    const h = (e: Event) => {
      const ce = e as CustomEvent<Partial<F2EntryContext>>;
      open(ce.detail);
    };
    window.addEventListener('nx-part-quick-search-open', h);
    return () => window.removeEventListener('nx-part-quick-search-open', h);
  }, [open]);

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
      <PartQuickSearchModal closing={closing} onClose={closeAll} />
      {mainPartId && (
        <PartMainWindow
          partId={mainPartId}
          entryContext={entryContext}
          onBack={backToSearch}
          onClose={closeAll}
        />
      )}
    </>
  );
}
