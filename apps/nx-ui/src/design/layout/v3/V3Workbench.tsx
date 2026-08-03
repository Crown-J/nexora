// apps/nx-ui/src/design/layout/v3/V3Workbench.tsx
//
// v3.0.0 工作檯（＝登入落點首頁）。階段 3 建立；2026-08-03 改成執行長拍板的五區塊。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.2 §3.3
//       docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §3（殼 1）
//
// ⭐ 2026-08-03 執行長定的五區塊，版面收成「積木拼圖」：
//
//   ┌────────┬──────────────────────────────────┐
//   │ 出勤   │ 搜尋框（永遠聚焦）                 │
//   │ 業績   ├────────────────┬─────────────────┤
//   │ 備忘   │ 待處理單據      │ 待處理清單       │
//   └────────┴────────────────┴─────────────────┘
//
// ⭐ 左欄窄積木＝一眼掃過就好的東西；右欄寬積木＝要動手處理的東西。
//    左欄靠最左，與固定在左上角的小行星同一側，滑鼠不必跨螢幕。
//
// ⭐ 兩個軸不一樣，所以分兩塊：單據問「卡在哪」、清單問「還剩多久做完」。
// ⭐ 有幾塊排幾塊：業務只會有單據那半、倉管只會有清單那半，單獨一塊時佔滿整行，
//    ⛔ 不留空白格（版型⛔ 不得寫死五格）。
//
// ⚠️ 本輪＝執行長指示「先把殼畫好、功能一步步放入」，所以：
//    · 打卡上／下班：後端已有 checkin / checkout 兩支 API，⛔ 本輪不接
//      （未打卡就擋住工作的攔截設計會妨礙測試，等功能期再開）
//    · 備忘錄：系統目前完全沒有這個東西，⛔ 只有殼
//    · 業績目標：當月五項；每個職務一組的定義尚未拍板，⛔ 只有殼
//      ⚠️ 多職務頁籤要等「職務」欄位送到前端才做得出來（目前 /auth/me 不回職務）
//    · 「久未下單」拿掉——它沒有下一步動作，是名單不是待辦，歸報表（執行長 2026-08-03 分析）
//
// ⛔ 不放圖表、⛔ 不做自訂儀表板、⛔ 不用灰字、⛔ 禁動畫（規格 §6）。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { openPartQuickSearch } from '@design/components/quick-search/GlobalPartQuickSearch';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { PendingDocsBlock } from './PendingDocsBlock';
import { PendingTasksBlock } from './PendingTasksBlock';

export function V3Workbench() {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // ⚠️ 原本在這裡打 getHomeSummary 拿一整包統計數字。
  //    改成單據／清單兩塊各自去撈自己的單之後，那包數字沒有人用了，整段移除
  //    ——首頁少一次 API 呼叫。⛔ 端點本身沒刪，別的地方還在用。

  // 規則 1：搜尋框永遠聚焦。
  // ⚠️ 不只是開頁聚焦——設計約束表寫「雙螢幕切走再切回要能立刻定位」，
  //    所以視窗重新取得焦點時也搶回來（除非使用者正在別的輸入框裡打字）。
  useEffect(() => {
    searchRef.current?.focus();
    const refocus = () => {
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      searchRef.current?.focus();
    };
    window.addEventListener('focus', refocus);
    return () => window.removeEventListener('focus', refocus);
  }, []);

  const go = useCallback(
    (href: string, label: string) => tryNavigate(() => router.push(href), `工作檯：${label}`),
    [router],
  );

  /** Enter → 開查價查貨站、把打好的字一起帶進去（⛔ 不讓使用者重打一次） */
  const submit = useCallback(() => {
    const kw = term.trim();
    if (!kw) return;
    openPartQuickSearch({ entry: 'sales', initialKeyword: kw });
  }, [term]);

  return (
    // ⭐ 積木拼圖（執行長 2026-08-03）：左欄是窄積木（打卡／業績／備忘），
    //    右欄是寬積木（搜尋＋兩張清單）。左欄放的都是「一眼掃過就好」的東西，
    //    右欄放的是「要動手處理」的東西。
    //    ⛔ 左欄留在最左邊，讓小行星（固定左上角）與它同一側，滑鼠不用跨螢幕。
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-5 pl-20 lg:flex-row">
      {/* ── 左欄：窄積木 ── */}
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-64">
        {/* 打卡：一天的第一個與最後一個動作，兩顆放一起。⚠️ 本輪只有殼 */}
        <section className="rounded-lg border border-border bg-card/80 p-4 backdrop-blur">
          <h2 className="nx-t-sec">出勤</h2>
          <p className="nx-hint mt-1">尚未打卡上班</p>
          <div className="mt-3 flex flex-col gap-2">
            <span className="rounded-md border border-primary/50 px-3 py-2 text-center text-base">
              打卡上班
            </span>
            <span className="rounded-md border border-border px-3 py-2 text-center text-base">
              打卡下班
            </span>
          </div>
          {/* 下班＝當日結算＝產出日報，講清楚它不只是記出勤 */}
          <p className="nx-hint mt-3">下班打卡會產出當日日報與當日評分。功能建置中。</p>
        </section>

        <section className="rounded-lg border border-border bg-card/80 p-4 backdrop-blur">
          <h2 className="nx-t-sec">業績目標</h2>
          <p className="nx-hint mt-1">當月累計</p>
          <div className="mt-3 rounded-md border border-dashed border-border px-3 py-6 text-center">
            <p className="nx-body">建置中</p>
          </div>
          <p className="nx-hint mt-3">每個職務一組五項指標，定義尚未拍板。</p>
        </section>

        <section className="rounded-lg border border-border bg-card/80 p-4 backdrop-blur">
          <h2 className="nx-t-sec">備忘錄</h2>
          <p className="nx-hint mt-1">誰交代了什麼事要處理</p>
          <div className="mt-3 rounded-md border border-dashed border-border px-3 py-6 text-center">
            <p className="nx-body">建置中</p>
          </div>
        </section>
      </aside>

      {/* ── 右欄：寬積木 ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {/* 搜尋框：游標預設就在這 */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground" />
          <input
            ref={searchRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="料號／品名／車型"
            aria-label="查價查貨"
            // 一段的主要輸入框＝整頁最大的目標。⚠️ 這裡刻意留 border-2 與 bg-card：
            // 搜尋框永遠是聚焦狀態，⛔ 不該套 nx-field-lg 的「未輸入退成灰底」
            className="nx-field-lg h-14 border-2 bg-card pl-12"
          />
        </div>

        {/* 狀態軸與進度軸並排：一個問卡在哪、一個問還剩多久 */}
        <div className="grid gap-6 xl:grid-cols-2">
          <PendingDocsBlock onGo={go} />
          <PendingTasksBlock onGo={go} />
        </div>
      </div>
    </div>
  );
}
