// apps/nx-ui/src/design/layout/v3/V3Workbench.tsx
//
// v3.0.0 工作檯（＝登入落點首頁）。階段 3。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §3.3
//
// 舊的 WorkbenchHome 封存不刪——回退只要把 app/dashboard/page.tsx 換回一行 import。
//
// 規格 §3.3 三條規則，每條都有理由：
//   1. 搜尋框永遠聚焦 —— 客戶隨時來電詢價是常態，進系統就能直接打料號
//   2. 只有三塊、數字要大 —— ⛔ 不放圖表，長輩看數字比看圓餅圖快
//   3. 點數字直接進清單 —— 不必先選日期或條件
//
// 與舊首頁的差異（執行長 2026-08-01：不要看到舊設定）：
//   ⛔ 拿掉「快捷動作」整區 —— 上面標著 F1 查庫存 / F2 報價，兩個鍵位在 v3.0.0 都改了
//      （F1 永久還給瀏覽器、F2 是九宮格），留著等於教錯
//   ⛔ 拿掉數字鍵 1/2/3 直達 —— 規格 §7.3：全系統的全域鍵只有 F2 一個，這是刻意的
//   ⛔ 拿掉「模組入口」七顆 —— 導覽一律走九宮格，⛔ 不留第二套入口
//   ⛔ 拿掉公告區 —— 規格 §3.3 明寫「只有三塊」；公告走九宮格 行政作業 → 公告管理
//
// ⚠️ 規格 §3.3 舉例的 8 個項目，系統目前只做得出 6 個。缺的兩個⛔不放空卡、不造假：
//   · 生日回訪 —— 客戶主檔沒有生日欄位（只有員工檔有），要補欄位才做得出來
//   · 待簽核   —— 全系統沒有簽核單據表，九宮格的「待簽核」也還是未建置
//   兩項都是補做候選、已回報執行長。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { getHomeSummary, type HomeSummary } from '@data/endpoints/nx08/api';
import { openPartQuickSearch } from '@design/components/quick-search/GlobalPartQuickSearch';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

type Metric = {
  label: string;
  value: number | null;
  href: string;
  /** 非零時給邊框提示：warning=要注意、danger=已經出事 */
  alert?: 'warning' | 'danger';
};

/**
 * 一個數字。
 * ⛔ 不用灰字（規格 §6：老花看灰字最吃力）——標籤也走 foreground、只用字級與粗細分層。
 */
function MetricTile({ m, onGo }: { m: Metric; onGo: (href: string, label: string) => void }) {
  const hot = (m.value ?? 0) > 0;
  const border =
    hot && m.alert === 'danger'
      ? 'border-red-500'
      : hot && m.alert === 'warning'
        ? 'border-amber-500'
        : 'border-border';

  return (
    <button
      type="button"
      onClick={() => onGo(m.href, m.label)}
      // ⛔ 無 transition：規格 §6 動畫全部關掉
      className={`flex items-baseline justify-between gap-3 rounded-lg border-2 bg-card px-4 py-3 text-left hover:bg-primary/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${border}`}
    >
      <span className="nx-body font-medium">{m.label}</span>
      {/* ⚠️ 原本 30px 不在 v3.css 收斂後的六種字級裡（14/15/17/20/22/26）——
          自己選數字正是 v3.css 要消滅的行為。改掛 nx-num-xl（26px）。 */}
      <span className="nx-num-xl leading-9">{m.value ?? '—'}</span>
    </button>
  );
}

function Block({
  title,
  metrics,
  note,
  onGo,
}: {
  title: string;
  metrics: Metric[];
  note?: string;
  onGo: (href: string, label: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      {/* ⚠️ 原本 16px——v3.css 已把 16 併進 15（肉眼分不出、卻多一個決定）。
          這是「段落標題」語意，掛 nx-t-sec（17px）。 */}
      <h2 className="nx-t-sec">{title}</h2>
      {metrics.map((m) => (
        <MetricTile key={m.label} m={m} onGo={onGo} />
      ))}
      {/* ⚠️ 原本 13px 直接違反 §6（最小級距 14）；/70 也不是 v3.css 定的 /75 */}
      {note ? <p className="nx-hint mt-1">{note}</p> : null}
    </section>
  );
}

export function V3Workbench() {
  const router = useRouter();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [term, setTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    getHomeSummary()
      .then((s) => alive && setSummary(s))
      .catch(() => alive && setSummary(null));
    return () => {
      alive = false;
    };
  }, []);

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

  const s = summary;
  /** 資料還沒回來顯示「—」而不是 0——0 是「真的沒有」、不該跟「還不知道」長一樣 */
  const n = (v: number | undefined) => (s ? (v ?? 0) : null);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-5">
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

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Block
          title="今天要處理"
          onGo={go}
          metrics={[
            { label: '待出貨', value: n(s?.sales.toShipSo), href: '/dashboard/sale/so' },
            { label: '待撿貨', value: n(s?.warehouse.pickingItems), href: '/dashboard/inventory/picking' },
            { label: '待包貨', value: n(s?.warehouse.packingItems), href: '/dashboard/inventory/packing' },
            { label: '待驗收', value: n(s?.warehouse.inspectingRr), href: '/dashboard/inventory/receiving' },
            {
              label: '缺貨卡住',
              value: n(s?.sales.replenishingItems),
              href: '/dashboard/sale/so',
              alert: 'warning',
            },
          ]}
        />

        <Block
          title="要追蹤的"
          onGo={go}
          metrics={[
            { label: '報價過期', value: n(s?.track.expiredQuotes), href: '/dashboard/sale/qt', alert: 'warning' },
            { label: '久未下單', value: n(s?.track.dormantCustomers), href: '/dashboard/master/partners/customer' },
            { label: '逾期應收', value: n(s?.track.overdueAr), href: '/dashboard/finance/ar', alert: 'danger' },
            { label: '7 日內應付', value: n(s?.track.apDueSoon), href: '/dashboard/finance/ap', alert: 'warning' },
          ]}
          note="久未下單＝曾經下過單、但最近 90 天沒再下的客戶。"
        />

        <Block
          title="我的待辦"
          onGo={go}
          metrics={[
            { label: '異常回報', value: n(s?.mine.openIssues), href: '/dashboard/inventory/issue-report' },
          ]}
          note="⚠️ 待簽核尚未建置——系統目前沒有簽核單據。"
        />
      </div>
    </div>
  );
}
