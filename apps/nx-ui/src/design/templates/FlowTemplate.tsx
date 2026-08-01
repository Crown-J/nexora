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
// ⚠️ 捲動用 behavior:'auto'（瞬間定位），⛔ 不用 smooth。兩個理由：
//   1. 規格 §6 明寫動畫全部關掉——smooth 捲動就是動畫
//   2. ⭐ 實測發現 smooth 在部分瀏覽器環境**靜默失效**（scrollTop 完全不動），
//      整個 Alt+數字 跳段等於失靈而且不會報錯。auto 在哪裡都會動。
//   左欄的高亮已經負責「我現在在哪一段」，不需要靠捲動過程來表達。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';

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
};

export function FlowTemplate({
  title,
  sections,
  onSubmit,
  onCancel,
  submitLabel = '送出',
}: FlowTemplateProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const goTo = useCallback((i: number) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-idx="${i}"]`);
    if (!el) return;
    // ⛔ 不用 smooth：規格 §6 動畫全關，且實測 smooth 會在某些環境靜默失效（見檔頭）
    el.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, []);

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

  // 捲到哪一區，頂部就標哪一區（外部事件回呼，不是 effect body 裡直接改 state）
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first) setActive(Number(first.target.getAttribute('data-idx')));
      },
      { root, rootMargin: '0px 0px -60% 0px', threshold: 0 },
    );
    root.querySelectorAll('[data-idx]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections.length]);

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
        <div className="border-b border-border px-4 py-3 text-[17px] font-bold text-foreground">
          {title}
        </div>

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

        <div className="border-t border-border px-3 py-2 text-[13px] text-foreground/70">
          Alt+1~9 跳段
          <br />
          滑鼠滾輪可自由移動
        </div>
      </nav>

      {/* ───── 右側內容：一頁到底 ───── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {submitError ? (
          <div className="border-b-2 border-red-500 bg-red-500/10 px-4 py-2.5 text-[15px] font-medium text-foreground">
            {submitError}
          </div>
        ) : null}

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
          {sections.map((s, i) => (
            <section
              key={s.key}
              data-idx={i}
              aria-label={s.label}
              className="scroll-mt-2 border-b border-border px-5 py-5"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-border text-[16px] font-bold tabular-nums text-foreground">
                  {i + 1}
                </span>
                <h2 className="text-[17px] font-bold text-foreground">{s.label}</h2>
                {s.blocked ? (
                  <span className="text-[15px] font-medium text-amber-600">{s.blocked}</span>
                ) : null}
              </div>
              {s.content}
            </section>
          ))}
          {/* 最後留白：最後一區也捲得到頂端，⛔ 不要讓它卡在畫面下緣 */}
          <div className="h-48" aria-hidden="true" />
        </div>

        {/* 送出列固定在底部——⛔ 不要讓使用者為了按送出還要捲到最下面 */}
        <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-md border-2 border-border px-4 text-[15px] text-foreground hover:bg-accent"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            className="ml-auto h-11 rounded-md border-2 border-primary bg-primary/10 px-6 text-[16px] font-bold text-foreground hover:bg-primary/20"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
