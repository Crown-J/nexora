// apps/nx-ui/src/design/templates/FlowTemplate.tsx
//
// 流程模板（v3.0.0 模板軌 第 3 支・改版）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2.1 §6 §7
//
// ⭐ 一頁式網站的做法（執行長 2026-08-01 訂正）：
//    所有區塊都在同一頁、垂直排列，按對應鍵自動捲到那一區，滑鼠也可以直接滾輪移動。
//    ⛔ 不是「一次只顯示一步」的分步精靈——那會讓使用者被鎖在當下、看不到全貌。
//
// 為什麼這樣比分步好：
//   · 往下滾就知道還有什麼要填，⛔ 沒有藏起來的內容
//   · 回頭改前面只是往上滾，不必按「上一步」
//   · 哪幾區還沒填，頂部一眼看得到（⛔ 不是走到那步才發現）
//
// 鍵盤：Alt + 1~9 捲到第 N 區。滑鼠：滾輪自由移動。
// 捲動用 smooth 但尊重 prefers-reduced-motion——瞬間跳會讓人失去方向感，
// 這不是裝飾動畫，是幫助理解「我移動了」。

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
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
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
    <div className="flex h-full min-h-0 flex-col">
      {/* 固定頂列：標題 ＋ 各區捷徑 ＋ 送出。捲到哪一區這裡就亮哪一區 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h1 className="text-lg">{title}</h1>

        <nav aria-label="區塊捷徑" className="flex flex-wrap items-center gap-1">
          {sections.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === active ? 'true' : undefined}
              className={[
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[15px]',
                i === active
                  ? 'border border-border bg-card text-foreground'
                  : 'border border-transparent text-muted-foreground hover:bg-accent',
              ].join(' ')}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full border border-border text-[14px]">
                {s.blocked ? (
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border border-border px-4 text-[15px] hover:bg-accent"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-9 rounded-md border border-border bg-card px-5 text-[15px] hover:bg-accent"
          >
            {submitLabel}
          </button>
        </div>
      </div>

      {submitError ? (
        <div className="border-b border-border bg-destructive/10 px-4 py-2 text-[15px] text-destructive">
          {submitError}
        </div>
      ) : null}

      {/* 內容：一頁到底，滾輪自由移動 */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        {sections.map((s, i) => (
          <section
            key={s.key}
            data-idx={i}
            aria-label={s.label}
            className="scroll-mt-2 border-b border-border px-4 py-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-border text-[16px]">
                {i + 1}
              </span>
              <h2 className="text-lg">{s.label}</h2>
              {s.blocked ? (
                <span className="text-[15px] text-destructive">{s.blocked}</span>
              ) : null}
            </div>
            {s.content}
          </section>
        ))}
        {/* 最後留白：最後一區也捲得到頂端，⛔ 不要讓它卡在畫面下緣 */}
        <div className="h-48" aria-hidden="true" />
      </div>

      <div className="border-t border-border px-4 py-2 text-[14px] text-muted-foreground">
        Alt+1~9 跳到對應區塊 · 滑鼠滾輪可自由移動
      </div>
    </div>
  );
}
