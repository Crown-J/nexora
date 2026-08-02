// apps/nx-ui/src/design/templates/FlowTemplate.tsx
//
// 流程模板（v3.0.0 模板軌 第 3 支・改版）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2.1 §6 §7
//
// ⭐ 一頁式網站的做法（執行長 2026-08-01 訂正）：
//    所有區塊都在同一頁、垂直排列，按對應鍵自動捲到那一區，滑鼠也可以直接滾輪移動。
//    ⛔ 不是「一次只顯示一步」的分步精靈——那會讓使用者被鎖在當下、看不到全貌。
//
// ⭐ 流程軌在**左側**（執行長 2026-08-01 再訂正）：
//    舊的浮層工作站左邊就是一條階段軌，使用者已經認得那個形狀。
//    改成一頁式時形狀要留著，只是不再是彈窗——所以流程軌從頂部搬到左欄常駐。
//    左欄同時是「我在哪一段」的指示器：捲到哪一區，左邊就亮哪一格。
//
// 為什麼這樣比分步好：
//   · 往下滾就知道還有什麼要填，⛔ 沒有藏起來的內容
//   · 回頭改前面只是往上滾，不必按「上一步」
//   · 哪幾區還沒填，左欄一眼看得到（⛔ 不是走到那步才發現）
//
// 鍵盤：Alt + 1~9 捲到第 N 區。滑鼠：滾輪自由移動。
//
// ⚠️ 以下這段是 2026-08-01 的決定，2026-08-02 已被修正（保留原文以免又繞回來）：
//    當時把規格 §6 讀成「動畫全禁」而做成瞬間定位，執行長 2026-08-02 指出跳段需要
//    上下滑動的過渡才看得出方向；§6 原文是「全部關掉**或縮到最短**」，短過渡本來就在規格內。
//    現行做法＝自己用 requestAnimationFrame 跑 260ms（見 goTo），
//    ⛔ 仍然不用 behavior:'smooth'——下面第 2 點的靜默失效問題依舊成立。
//
// ⚠️（2026-08-01 原文）捲動用 behavior:'auto'（瞬間定位），⛔ 不用 smooth。兩個理由：
//   1. 規格 §6 明寫動畫全部關掉——smooth 捲動就是動畫
//   2. ⭐ 實測發現 smooth 在部分瀏覽器環境**靜默失效**（scrollTop 完全不動），
//      整個 Alt+數字 跳段等於失靈而且不會報錯。auto 在哪裡都會動。
//   左欄的高亮已經負責「我現在在哪一段」，不需要靠捲動過程來表達。
//
// ⭐ 2026-08-02 改版：每一段是一張佔滿畫面的卡片（執行長拍板、對照 Formspree 表單庫）
//    · 目標＝「看起來像獨立頁面，實際上是同一頁往下捲」。
//      段落改成 min-h-full 的卡片，捲到哪一段畫面上就只有那一張卡、前後被切在畫面外。
//    · 捲動吸附（snap）讓滾輪停在卡片開頭，⛔ 不會停在兩張卡中間——
//      這樣滑鼠捲出來的感覺與 Alt+跳段一致（都是「翻一頁」）。
//    ⚠️ 吸附刻意用 proximity ⛔ 不用 mandatory：
//       「報價」那種段落有明細表格、一定超過一個畫面高，mandatory 會讓使用者
//       在長段落中間捲不動（一放手就被彈回段首）。proximity 只在接近邊界時才吸。
//    ⚠️ 原本墊在最後的 h-48 空白已移除：段落現在自己就有一個畫面高，
//       最後一段捲得到頂，那塊空白反而變成吸附會停下來的死區。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';

/** 區塊內容可以拿到的能力（讓區塊自己決定什麼時候把人帶到下一段） */
export type FlowApi = {
  /** 跳到第 i 段（0 起算）：捲過去＋聚焦該段第一個輸入欄＋左欄標定 */
  goTo: (i: number) => void;
};

export type FlowSection = {
  key: string;
  label: string;
  content: React.ReactNode;
  /** 未完成的理由；有值＝這一區還沒好，頂部會標記、送出時會擋 */
  blocked?: string;
};

export type FlowTemplateProps = {
  title: string;
  sections: FlowSection[];
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel?: string;
  /**
   * 把 goTo 交給外面（掛載後填入）。
   * ⭐ 用途：某一段做完了要自己把人帶到下一段——例如選完客戶按 Enter 進「搜尋」，
   *    ⛔ 不必逼使用者再按一次 Alt+2。
   * ⚠️ 只能在事件處理器裡呼叫（render 期間讀 ref 會違反 react-hooks/refs）。
   */
  apiRef?: React.MutableRefObject<FlowApi | null>;
};

export function FlowTemplate({
  title,
  sections,
  onSubmit,
  onCancel,
  submitLabel = '送出',
  apiRef,
}: FlowTemplateProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** 中斷進行中的跳段動畫（連按兩次要能收掉前一個，⛔ 不然兩個動畫會互搶 scrollTop） */
  const cancelAnimRef = useRef<(() => void) | null>(null);
  /** 跳段動畫進行中？⚠️ 用 ref 不用 state——它每格都要被讀，變成 state 會逼整頁重畫 */
  const animatingRef = useRef(false);

  const goTo = useCallback((i: number) => {
    const root = scrollRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-idx="${i}"]`);
    if (!root || !el) return;

    // ⭐ 跳段當下就把左欄標到這一段（執行長 2026-08-01 回報）：
    //    原本只捲動、目前段位完全靠 IntersectionObserver 事後回填，
    //    結果按了 Alt+1 跳到「對象」，左欄還停在「檢查庫存」——使用者以為沒跳成功。
    //    ⛔ 不能等觀察器：它的回呼時機不保證，而且捲到頂時可能不觸發。
    //    觀察器保留給「使用者自己用滾輪捲」的情況。
    setActive(i);

    // ⭐ 跳過去就要能直接打字（執行長 2026-08-01）：
    //    只捲不聚焦，使用者還得再拿滑鼠點一下欄位，等於鍵盤流程斷在這裡。
    //    ⛔ 只找輸入類元素，不含 button——聚焦到按鈕上會讓 Enter 變成誤觸送出。
    const focusField = () => {
      /*
        ⭐ data-flow-focus ＝ 這一段自己指定「跳過來該聚焦哪裡」（2026-08-02）。
           有些段落根本沒有輸入框——例如「檢查庫存」是一份用 ↑↓ 與空白鍵操作的清單。
           沒有這個約定的話跳過去焦點會留在上一段，⛔ 鍵盤流程就斷在那裡。
           ⚠️ 標記的元素自己要能接焦點（tabIndex），⛔ 否則 focus() 沒有作用。
      */
      const field =
        el.querySelector<HTMLElement>('[data-flow-focus]') ??
        el.querySelector<HTMLElement>(
          'input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), select:not([disabled])',
        );
      if (!field) return;
      // ⚠️ preventScroll 是必要的：focus() 預設會把元素捲進畫面，
      //    那一下會跟我們自己算的捲動位置打架（尤其欄位在段落中段時會多跳一次）。
      field.focus({ preventScroll: true });
      // ⭐ 連內容一起反白（執行長 2026-08-01 回報）：
      //    只有游標進去，長輩看不出焦點跑到哪裡了。整段選起來是最明顯的訊號，
      //    而且直接打字就會覆蓋掉舊值——省一次全選刪除。
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.select();
      }
    };

    const from = root.scrollTop;
    const max = root.scrollHeight - root.clientHeight;
    // 目標位置＝這一段的頂端對齊容器頂端。⛔ 不用 offsetTop（要看 offsetParent 是誰，會被中間的定位元素拐走）
    const to = Math.max(
      0,
      Math.min(max, from + (el.getBoundingClientRect().top - root.getBoundingClientRect().top)),
    );

    cancelAnimRef.current?.();

    /**
     * ⭐ 上下滑動的過渡（執行長 2026-08-02）：
     *    卡片式版面之後，跳段等於「翻一頁」——瞬間切換看起來像整個畫面被抽換掉，
     *    使用者分不出是往上還往下。滑過去那一下就是在講「你往下移動了一段」。
     *
     * ⚠️ 規格 §6 寫的是「動畫全部關掉**或縮到最短**」——⛔ 不是全禁。
     *    長度 2026-08-02 由 180ms 調到 260ms：180 太短，配上 ease-out 的急起步
     *    看起來是「彈一下」而不是「滑過去」（執行長回報）。⛔ 不要再加長，260 已經是上限感。
     *
     * ⛔ 不用 scrollTo({behavior:'smooth'})，兩個理由：
     *    1. 時間長度由瀏覽器決定，我們控不了「縮到最短」這條規格
     *    2. 實測它在部分環境（含我們的預覽窗格）靜默失效、scrollTop 完全不動且不報錯
     *    自己用 requestAnimationFrame 逐格寫 scrollTop，哪裡都會動、長度也是我們說了算。
     */
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dist = to - from;

    if (reduce || Math.abs(dist) < 2) {
      root.scrollTop = to;
      focusField();
      return;
    }

    const DURATION = 260;
    let raf = 0;
    let watchdog = 0;
    let done = false;

    /**
     * ⚠️ 動畫期間關掉捲動吸附（2026-08-02 執行長回報「有點像卡了一下」的元凶之一）：
     *    我們每一格都在寫 scrollTop，瀏覽器的吸附同時也想把捲動位置拉到吸附點，
     *    兩邊互相修正就會抖。⛔ 不能整段關掉吸附——那是滑鼠捲動要用的，
     *    所以只在動畫這 260ms 內關，收尾時還原。
     */
    const snapBefore = root.style.scrollSnapType;
    root.style.scrollSnapType = 'none';

    // ⭐ 動畫期間不讓 scroll 事件回頭改「目前段位」（見下方 syncActive 的說明）
    animatingRef.current = true;

    /** 收尾：對齊到定位＋聚焦。⛔ 只能跑一次（動畫跑完與保險逾時都會呼叫它） */
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(watchdog);
      cancelAnimRef.current = null;
      root.scrollTop = to; // 收尾對齊，⛔ 不留 0.4px 的殘差讓吸附再修一次
      root.style.scrollSnapType = snapBefore;
      animatingRef.current = false;
      focusField();
    };

    /*
     * ⚠️ 起算時間用 performance.now()，⛔ 不要等第一個 rAF 的 ts：
     *    那樣第一格的進度是 0，等於畫面「先停一格再開始動」——
     *    執行長回報的「卡了一下」有一部分就是這一格。
     */
    const startTs = performance.now();
    const step = () => {
      if (done) return;
      const p = Math.min(1, (performance.now() - startTs) / DURATION);
      /*
       * ease-in-out：兩頭慢、中間快。
       * ⚠️ 原本用 ease-out（起步最快），從靜止瞬間衝出去看起來就是「彈一下」。
       *    ⛔ 不用回彈類曲線——那會讓人以為捲過頭了。
       */
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      root.scrollTop = from + dist * e;
      if (p < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      finish();
    };

    raf = requestAnimationFrame(step);

    /**
     * ⚠️ 保險絲（2026-08-02 實測踩到）：requestAnimationFrame 在「畫面沒有在合成」的環境
     *    ⛔ 一次都不會被呼叫，而且不報錯——背景分頁、省電模式、我們的預覽窗格都是。
     *    只靠 rAF 的話那些情況下 scrollTop 永遠不會被寫，等於整個跳段失效
     *    （左欄跳到第 4 段、畫面停在第 1 段——比沒有動畫還糟）。
     *    setTimeout 在那些環境仍會觸發，所以拿它當保底：時間到了就直接定位。
     *    ⛔ 這條不能拿掉：動畫是加分，能不能跳到那一段是底線。
     */
    watchdog = window.setTimeout(finish, DURATION + 120);

    cancelAnimRef.current = () => {
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(watchdog);
    };
  }, []);

  // 卸載時收掉未跑完的動畫（⛔ 不然元件沒了還在寫 scrollTop）
  useEffect(
    () => () => {
      cancelAnimRef.current?.();
    },
    [],
  );

  // Alt + 數字：捲到對應區
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key >= '1' && e.key <= '9') {
        const i = Number(e.key) - 1;
        if (i < sections.length) {
          e.preventDefault();
          goTo(i);
        }
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [sections.length, goTo]);

  // 把 goTo 交給外面用（⛔ 在 effect 裡填、不在 render 期間碰 ref）
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = { goTo };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, goTo]);

  /**
   * 使用者自己捲的時候，左欄跟著標到「目前在看的那一段」。
   *
   * ⭐ 2026-08-01 執行長回報「左欄順序會亂跳」，根因在這裡，已從 IntersectionObserver 換掉：
   *    IO 的回呼**只帶進出狀態有變的區塊**，舊寫法卻在那一小堆裡挑最上面的當作目前段。
   *    捲到「搜尋」時，「檢查庫存」剛好進入偵測範圍（有變）、「搜尋」早就在畫面上（沒變）
   *    → entries 只有檢查庫存 → 左欄就標成檢查庫存。畫面在搜尋、左欄指檢查庫存。
   *
   * ⛔ 不修 IO 的判斷式而是整個換掉，兩個理由：
   *    1. 用捲動位置直接算是確定性的——同樣的捲動位置永遠得到同樣的段，⛔ 不依賴回呼時機
   *    2. IO 需要瀏覽器合成畫面才會觸發，某些環境（含我們的預覽窗格）完全不觸發、且不報錯，
   *       等於這段邏輯無法驗證。scroll 事件到處都會動。
   */
  const syncActive = useCallback(() => {
    const root = scrollRef.current;
    if (!root) return;
    /*
     * ⭐ 動畫期間直接不算（2026-08-02 執行長回報「左側切換狀態也會閃了一下」的根因）：
     *    跳段動畫每一格都在寫 scrollTop，每一次都會觸發 scroll 事件 → 這支就把
     *    「目前段位」算成中間經過的那幾段 → 左欄在 260ms 內被刷成 2、3、4 才停在 4。
     *    看起來就是閃一下。
     *    ⛔ 不能改成「只在動畫結束才算」——使用者自己用滾輪捲的時候還是要即時跟。
     *    goTo 一開始就已經把左欄標到目的地了，動畫期間本來就沒有東西要算。
     *
     * ⚠️ 這同時也是「卡了一下」的主因：每一格 setState 就是整頁重畫一次，
     *    260ms 內十幾次重畫（而且這一頁有表格與清單）——幀直接掉光。
     */
    if (animatingRef.current) return;
    const rootTop = root.getBoundingClientRect().top;
    // 判定線＝容器頂端下方 80px：跨過這條線的最後一段，就是「現在在看的」
    const LINE = 80;
    let idx = 0;
    root.querySelectorAll<HTMLElement>('[data-idx]').forEach((el) => {
      if (el.getBoundingClientRect().top - rootTop <= LINE) {
        idx = Number(el.getAttribute('data-idx'));
      }
    });
    setActive(idx);
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    // ⛔ 這裡不主動呼叫一次 syncActive——那會在 effect 同步路徑上 setState；
    //    初值 0 本來就對（一進來就在第一段）。
    root.addEventListener('scroll', syncActive, { passive: true });
    return () => root.removeEventListener('scroll', syncActive);
  }, [syncActive]);

  function submit() {
    const bad = sections.findIndex((s) => s.blocked);
    if (bad >= 0) {
      // ⛔ 不要只說「有欄位沒填」——直接講是哪一區、哪件事，並且帶他過去
      setSubmitError(`${sections[bad].label}：${sections[bad].blocked}`);
      goTo(bad);
      return;
    }
    setSubmitError(null);
    onSubmit();
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ───── 左側流程軌：常駐、捲到哪一區就亮哪一格（形狀沿用舊浮層工作站）───── */}
      <nav
        aria-label="流程"
        className="flex w-[200px] shrink-0 flex-col border-r border-border bg-card"
      >
        <div className="nx-t-sec border-b border-border px-4 py-3">{title}</div>

        <ol className="min-h-0 flex-1 overflow-auto p-2">
          {sections.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === active ? 'step' : undefined}
                // ⛔ 無 transition（規格 §6 動畫全關）
                className={[
                  'mb-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left text-[15px]',
                  i === active
                    ? 'border-2 border-primary bg-primary/10 font-bold text-foreground'
                    : 'border-2 border-transparent text-foreground hover:bg-foreground/[0.05]',
                ].join(' ')}
              >
                {/* 圈號＝階段序號，⛔ 不用打勾/驚嘆號當主標記——序號才是使用者記得的東西 */}
                <span
                  className={[
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[15px] font-bold tabular-nums',
                    i === active
                      ? 'bg-primary text-primary-foreground'
                      : 'border-2 border-border text-foreground',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">{s.label}</span>
                {s.blocked ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" aria-label="尚未完成" />
                ) : (
                  <Check className="h-4 w-4 shrink-0 text-foreground/40" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ol>

        <div className="nx-hint border-t border-border px-3 py-2">
          Alt+1~9 跳段
          <br />
          滑鼠滾輪可自由移動
        </div>
      </nav>

      {/* ───── 右側內容：一頁到底，每段一張佔滿畫面的卡片 ───── */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {submitError ? (
          <div className="border-b-2 border-red-500 bg-red-500/10 px-4 py-2.5 text-[15px] font-medium text-foreground">
            {submitError}
          </div>
        ) : null}

        <div ref={scrollRef} className="min-h-0 flex-1 snap-y snap-proximity overflow-auto">
          {sections.map((s, i) => (
            /*
              ⭐ min-h-full ＝ 這一段至少佔滿一個畫面 → 看起來像獨立頁面。
                 內容多的段落（例如報價的明細表）自己長高，⛔ 不裁切、⛔ 不做段內捲動。
              ⚠️ min-h-full 是相對捲動容器的高度，所以容器必須有確定高度——
                 靠的是外面那層 min-h-0 flex-1。⛔ 拿掉 min-h-0 這裡會整個垮掉。
            */
            <section
              key={s.key}
              data-idx={i}
              aria-label={s.label}
              className="flex min-h-full snap-start flex-col p-4"
            >
              <div className="nx-card flex flex-1 flex-col">
                <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-border text-[15px] font-bold tabular-nums text-foreground">
                    {i + 1}
                  </span>
                  <h2 className="nx-t-sec">{s.label}</h2>
                  {s.blocked ? (
                    <span className="text-[15px] font-medium text-amber-600">{s.blocked}</span>
                  ) : null}
                  {/* 每張卡自報鍵位：⛔ 不要逼使用者記「這是第幾段」才按得出 Alt+N */}
                  <span className="nx-hint ml-auto shrink-0">Alt+{i + 1}</span>
                </div>
                {s.content}
              </div>
            </section>
          ))}
        </div>

        {/* 送出列固定在底部——⛔ 不要讓使用者為了按送出還要捲到最下面 */}
        <div className="flex items-center gap-2 border-t border-border bg-card px-4 py-2.5">
          <button type="button" onClick={onCancel} className="nx-btn">
            取消
          </button>
          <button type="button" onClick={submit} className="nx-btn-primary ml-auto px-6">
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
