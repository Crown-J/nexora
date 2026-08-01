// apps/nx-ui/src/design/templates/WorkbenchTemplate.tsx
//
// 工作檯模板（v3.0.0 模板軌 第 4 支）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §3.3 §6
//
// 工作檯＝首頁＝登入落點。內容依角色組成。
//
// 三條規則（規格 §3.3）：
//   1. 搜尋框永遠聚焦——客戶隨時來詢價是常態，進系統就能直接打料號
//   2. 只有三塊、數字要大——⛔ 不放圖表，長輩看數字比看圓餅圖快
//   3. 點數字直接進清單——⛔ 不必先選日期或條件
//
// ⭐ 這頁的目的是「今天要做的事自己送上門」，使用者⛔ 不必學會找功能。
//    這也是九宮格能收起來的前提：日常 90% 都在這一頁解決。

'use client';

import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export type WorkbenchItem = {
  key: string;
  label: string;
  count: number;
  /** warn＝需要注意（逾期、卡住），數字會加重顯示 */
  tone?: 'normal' | 'warn';
  onClick?: () => void;
};

export type WorkbenchCard = {
  key: string;
  title: string;
  items: WorkbenchItem[];
};

export type WorkbenchTemplateProps = {
  /** 通常是「早安，OOO」或角色名 */
  greeting?: string;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  cards: WorkbenchCard[];
};

export function WorkbenchTemplate({
  greeting,
  searchPlaceholder = '料號／品名／車型',
  onSearch,
  cards,
}: WorkbenchTemplateProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // 進頁面游標就在搜尋框——業務接到電話可以直接打，⛔ 不必先用滑鼠點一下
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      {greeting ? <h1 className="mb-4 text-xl">{greeting}</h1> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch?.(searchRef.current?.value ?? '');
        }}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-4"
      >
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          placeholder={searchPlaceholder}
          aria-label="查價查貨"
          className="h-12 w-full bg-transparent text-[17px] outline-none"
        />
      </form>

      {/* 三塊。⛔ 不放圖表——長輩看數字比看圓餅圖快 */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <section
            key={c.key}
            aria-label={c.title}
            className="rounded-lg border border-border bg-card p-4"
          >
            <h2 className="text-[16px] text-muted-foreground">{c.title}</h2>
            <ul className="mt-2">
              {c.items.map((it) => (
                <li key={it.key}>
                  <button
                    type="button"
                    onClick={it.onClick}
                    className="flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-2.5 text-left hover:bg-accent"
                  >
                    <span className="text-[16px]">{it.label}</span>
                    {/* 數字放大到 24px：這是整頁最該被看到的東西 */}
                    <span
                      className={[
                        'text-[24px] tabular-nums',
                        it.tone === 'warn' ? 'text-destructive' : 'text-foreground',
                      ].join(' ')}
                    >
                      {it.count}
                    </span>
                  </button>
                </li>
              ))}
              {!c.items.length ? (
                <li className="px-2 py-6 text-center text-[15px] text-muted-foreground">
                  今天沒有待辦
                </li>
              ) : null}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
