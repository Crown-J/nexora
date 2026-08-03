// apps/nx-ui/src/design/layout/v3/V3Workbench.tsx
//
// v3.0.0 工作檯（＝登入落點首頁）。階段 3 建立；2026-08-03 改成執行長拍板的五區塊。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.2 §3.3
//       docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §3（殼 1）
//
// ⭐ 2026-08-03 執行長重新定義：工作檯＝一天的形狀，從上往下就是一天的順序。
//
//   打卡上班
//   ─ 搜尋框（永遠聚焦）
//   ─ 待處理單據（狀態軸：這張單走到哪了）　│　待處理清單（進度軸：這批活還剩多少）
//   ─ 備忘錄
//   ─ 業績目標（當月；多職務用頁籤切換）
//   ─ 打卡下班 → 產出當日日報與當日評分
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

import { getHomeSummary, type HomeSummary } from '@data/endpoints/nx08/api';
import { openPartQuickSearch } from '@design/components/quick-search/GlobalPartQuickSearch';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { PendingDocsBlock } from './PendingDocsBlock';

type Metric = {
  /** 單別或作業名（例：銷貨單、撿貨） */
  label: string;
  /** 狀態軸＝階段（待出貨）；進度軸＝單位（剩餘項數） */
  stage: string;
  value: number | null;
  href: string;
  /** 非零時給邊框提示：warning=要注意、danger=已經出事 */
  alert?: 'warning' | 'danger';
};

/**
 * 一列。
 * ⛔ 不用灰字（規格 §6：老花看灰字最吃力）——階段也走 foreground、只用字級與粗細分層。
 */
function MetricRow({ m, onGo }: { m: Metric; onGo: (href: string, label: string) => void }) {
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
      onClick={() => onGo(m.href, `${m.label}｜${m.stage}`)}
      // ⛔ 無 transition：規格 §6 動畫全部關掉
      className={`flex items-baseline justify-between gap-3 rounded-lg border-2 bg-card px-4 py-3 text-left hover:bg-primary/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${border}`}
    >
      <span className="min-w-0">
        <span className="nx-body block font-medium">{m.label}</span>
        <span className="nx-hint block">{m.stage}</span>
      </span>
      <span className="nx-num-xl leading-9">{m.value ?? '—'}</span>
    </button>
  );
}

function Block({
  title,
  children,
  note,
}: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="nx-t-sec">{title}</h2>
      {children}
      {note ? <p className="nx-hint mt-1">{note}</p> : null}
    </section>
  );
}

/** 還沒接功能的區塊：⛔ 不放假資料、⛔ 不留空白，直接說它還沒好 */
function ShellNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-border px-4 py-6 text-center">
      <p className="nx-body">{text}</p>
    </div>
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
      {/* 打卡條：一天的第一個動作。⚠️ 本輪只有殼，⛔ 還不會真的打卡 */}
      <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border-2 border-border bg-card px-4 py-3">
        <span className="nx-body">尚未打卡上班</span>
        <span className="nx-hint">打卡功能建置中</span>
      </div>

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
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <PendingDocsBlock onGo={go} />

        <Block
          title="待處理清單"
          note="⚠️ 目前只給得出總項數。要顯示「這張撿貨單已撿 8／20 項」需要新的後端端點，功能期再接。"
        >
          <MetricRow m={{ label: '撿貨', stage: '待撿項數', value: n(s?.warehouse.pickingItems), href: '/dashboard/inventory/picking' }} onGo={go} />
          <MetricRow m={{ label: '包貨', stage: '待包項數', value: n(s?.warehouse.packingItems), href: '/dashboard/inventory/packing' }} onGo={go} />
          <MetricRow m={{ label: '異常回報', stage: '待處理', value: n(s?.mine.openIssues), href: '/dashboard/inventory/issue-report' }} onGo={go} />
        </Block>
      </div>

      <div className="mt-6">
        <Block title="備忘錄" note="誰交代了什麼事要處理，寫在這裡。">
          <ShellNote text="備忘錄建置中——系統目前沒有這個功能。" />
        </Block>
      </div>

      <div className="mt-6">
        <Block
          title="業績目標"
          note="⚠️ 看的是當月累計。當日評分在下班打卡、產出日報時才出現。"
        >
          <ShellNote text="業績目標建置中——每個職務一組五項指標的定義尚未拍板。" />
        </Block>
      </div>

      {/* 下班打卡放最後：下班＝當日結算＝產出日報，動作與結果放在一起 */}
      <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border-2 border-border bg-card px-4 py-3">
        <span className="nx-body">打卡下班　·　產出當日日報與當日評分</span>
        <span className="nx-hint">建置中</span>
      </div>
    </div>
  );
}
