// apps/nx-ui/src/features/shared/instant-workbench/InstantWorkbench.tsx
// 即時工作站・調度器（只管「誰現在開著」）
//
// 【2026-08-01 v3.0.0 階段 1 Step 4 變更】
//   · 本檔原本自帶 F2 監聽與啟動器選單（2026-07-14 拍板：F2 → 直排選單 → 數字進站）。
//     F2 已交給九宮格（design/navigation），啟動器選單整個退場——導覽只留一套。
//   · 進站改由九宮格的格子觸發：銷售作業 1 查價查貨、2-5 第三層的「快速開單／即時報價／
//     即時詢價／即時銷退」，外殼發 nx-instant-station-open 事件、本檔監聽。
//   · ⚠️ 五個站仍是浮層。規格 §2.1 要求一頁式、⛔ 不用彈跳視窗，
//     改寫成分頁排在階段 4；Step 4 只做鍵位歸位、功能不損失。
//
// 保留不動的設計要點：
//   · 殼不重包視窗——各站都是現成的自帶 overlay 元件
//   · 站 2 唯一「切走保留 session」：隱藏保活（hidden prop＋FocusLockedDialog suspended）；
//     站 1/站 3 切走即關（站 3 清單本來就存 localStorage）
//   · 站關閉（使用者 X/Esc）→ 全收；站 2 完成/放棄（onClose）→ 整站重生（「下一通」退場）
//   · 切站守衛：有未完成資料的站要先確認才切走
'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  GlobalPartQuickSearch,
  type F2EntryContext,
} from '@design/components/quick-search/GlobalPartQuickSearch';

import { GlobalTransferInquiry } from '@/features/nx04/quote/ui/GlobalTransferInquiry';
import { QuoteWorkspace } from '@/features/nx04/quote/ui/QuoteWorkspace';
import { InstantSalesWorkspace } from '@/features/nx04/sales/ui/InstantSalesWorkspace';
import { InstantSalesReturnWorkspace } from '@/features/nx04/sales-return/ui/InstantSalesReturnWorkspace';

import { stationHasUnsavedData, type InstantStationNo } from './station-registry';

/** 九宮格 → 開站事件（發送端：design/layout/v3/V3Shell.tsx） */
const OPEN_STATION_EVENT = 'nx-instant-station-open';

export function InstantWorkbench() {
  // 目前開著的站（null=沒開）
  const [current, setCurrent] = useState<InstantStationNo | null>(null);
  // 站 2 隱藏保活（切走不丟客戶+報價清單）；epoch=完成/放棄後整站重生 key
  const [quoteMounted, setQuoteMounted] = useState(false);
  const [quoteEpoch, setQuoteEpoch] = useState(0);
  // 站 1 開站情境（nx-part-quick-search-open 嵌入點事件帶入、殼轉交）
  const [station1Ctx, setStation1Ctx] = useState<Partial<F2EntryContext> | undefined>(undefined);

  const enterStation = useCallback(
    (no: InstantStationNo) => {
      // 切站守衛（執行長 2026-07-19）：「切走即關」的站有未完成資料 → 先確認
      //（站 2 切走保活不會註冊；取消 → 留在原站不動）
      if (current !== null && current !== no && stationHasUnsavedData(current)) {
        if (!window.confirm('目前站內還有未完成的資料、切站會清空——確定切換？')) return;
      }
      if (no === 2) setQuoteMounted(true);
      setCurrent(no);
    },
    [current],
  );

  // 九宮格選到「開站」型的格子 → 外殼發事件 → 這裡進站
  useEffect(() => {
    const h = (e: Event) => {
      const no = (e as CustomEvent<{ no?: number }>).detail?.no;
      if (no && no >= 1 && no <= 6) enterStation(no as InstantStationNo);
    };
    window.addEventListener(OPEN_STATION_EVENT, h);
    return () => window.removeEventListener(OPEN_STATION_EVENT, h);
  }, [enterStation]);

  // 嵌入點開站 1（採購/倉管入口 openPartQuickSearch()、帶情境直達不走選單）
  useEffect(() => {
    const h = (e: Event) => {
      setStation1Ctx((e as CustomEvent<Partial<F2EntryContext>>).detail ?? {});
      enterStation(1);
    };
    window.addEventListener('nx-part-quick-search-open', h);
    return () => window.removeEventListener('nx-part-quick-search-open', h);
  }, [enterStation]);

  // 站自己關（使用者 X/Esc）→ 全收（要再進站走 F2 九宮格）
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

      {/* 站 5 即時銷退（業務發起退貨開單精靈、執行長 2026-07-19；切走即關、守衛同站 4） */}
      <InstantSalesReturnWorkspace open={current === 5} onClosed={stationClosed} />
    </>
  );
}
