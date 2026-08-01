// apps/nx-ui/src/design/templates/ListTemplate.tsx
//
// 清單／查詢模板（v3.0.0 模板軌 第 1 支）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §6 §7
//
// 為什麼先做這支：兩百多頁裡清單頁最大宗（主檔列表＋單據列表＋報表），
// 而且它是「查」與「進單據」的共同入口——業務查客戶、倉管查庫存、會計查帳都從這開始。
//
// 規格落點：
//   · 表頭 14px / 內文 15px（一般 ERP 是 12-13px，對年長使用者太小）
//   · ⛔ 不用灰字當主要內容——老花看灰字最吃力，只有次要說明才用 muted
//   · 預設只顯示 6-8 欄，其餘收進「欄位」面板。⛔ 不靠縮小字級塞更多欄
//   · ⛔ 全程不加 transition／animation
//   · 純鍵盤可完成：↑↓ 移動 · Enter 開啟 · Home/End 首末列 · Tab 可進出表格
//     驗收條件是「整頁拔掉滑鼠做得完」，所以⛔ 不做只有滑鼠能觸發的操作
//
// ⚠️ 這是純呈現元件：不抓資料、不知道 API。資料與事件由呼叫端給。

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Columns3, Search } from 'lucide-react';

export type ListColumn<T> = {
  key: string;
  label: string;
  /** true＝預設收在「欄位」面板裡（規格：預設只留 6-8 欄） */
  defaultHidden?: boolean;
  /** 數字類靠右，比對金額時眼睛才跟得上 */
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
};

export type ListTemplateProps<T> = {
  title: string;
  columns: ListColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** 按 Enter 或雙擊時開啟該筆 */
  onOpen?: (row: T) => void;
  /** 工具列右側（新增、匯出…） */
  actions?: React.ReactNode;
  /** 搜尋框提示字：寫真實的例子，⛔ 不寫「請輸入關鍵字」 */
  searchPlaceholder?: string;
  /** 底部統計文字 */
  footerText?: string;
};

export function ListTemplate<T>({
  title,
  columns,
  rows,
  rowKey,
  onOpen,
  actions,
  searchPlaceholder = '單號／客戶／料號',
  footerText,
}: ListTemplateProps<T>) {
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key)),
  );
  const [colPanel, setColPanel] = useState(false);
  const [sel, setSel] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => columns.filter((c) => !hidden.has(c.key)), [columns, hidden]);

  // 資料變少時游標可能落在不存在的列——渲染時夾住就好。
  // ⛔ 不要在 effect 裡 setState 拉回第一列：那會多一次渲染，
  //    而且篩選後跳回第一列反而不合使用者預期（他多半想停在原處附近）。
  const safeSel = rows.length ? Math.min(sel, rows.length - 1) : 0;

  // ⚠️ 一律用函式式更新算新位置。
  //    用 sel + 1 這種寫法，使用者「按住 ↓ 不放」時連續事件會落在同一批次、
  //    每次都讀到同一個舊值，結果按了十下只走一格。
  const move = useCallback(
    (fn: (prev: number, last: number) => number) => {
      if (!rows.length) return;
      setSel((prev) => Math.max(0, Math.min(rows.length - 1, fn(prev, rows.length - 1))));
    },
    [rows.length],
  );

  // 捲動要等 sel 真的更新完才做，所以放 effect 不放在事件裡
  useEffect(() => {
    bodyRef.current
      ?.querySelector<HTMLElement>(`[data-row="${safeSel}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [safeSel]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move((p) => p + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move((p) => p - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      move(() => 0);
    } else if (e.key === 'End') {
      e.preventDefault();
      move((_p, last) => last);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rows[safeSel]) onOpen?.(rows[safeSel]);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 工具列：標題 · 搜尋 · 欄位 · 動作 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <h1 className="text-lg">{title}</h1>

        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-md border border-border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder={searchPlaceholder}
            aria-label="搜尋"
            className="h-9 w-full bg-transparent text-[15px] outline-none"
          />
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setColPanel((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-[15px] hover:bg-accent"
          >
            <Columns3 className="h-4 w-4" aria-hidden="true" />
            欄位（{shown.length}／{columns.length}）
          </button>

          {colPanel ? (
            <div className="absolute right-0 top-10 z-30 w-56 rounded-lg border border-border bg-card p-2 shadow-lg">
              {columns.map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[15px] hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={!hidden.has(c.key)}
                    onChange={() =>
                      setHidden((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.key)) next.delete(c.key);
                        else next.add(c.key);
                        return next;
                      })
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          ) : null}
        </div>

        {actions}
      </div>

      {/* 表格。tabIndex=0：Tab 進得來，鍵盤才能接手 */}
      <div
        ref={bodyRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="grid"
        aria-label={title}
        className="min-h-0 flex-1 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              {shown.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={[
                    'whitespace-nowrap border-b border-border px-3 py-2 text-[14px] font-medium text-foreground',
                    c.align === 'right' ? 'text-right' : 'text-left',
                  ].join(' ')}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={rowKey(r)}
                data-row={i}
                aria-selected={i === safeSel}
                onClick={() => setSel(i)}
                onDoubleClick={() => onOpen?.(r)}
                className={[
                  'cursor-default border-b border-border/60',
                  i === safeSel ? 'bg-accent' : 'hover:bg-accent/40',
                ].join(' ')}
              >
                {shown.map((c) => (
                  <td
                    key={c.key}
                    className={[
                      'whitespace-nowrap px-3 py-2 text-[15px]',
                      c.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                    ].join(' ')}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={shown.length} className="px-3 py-10 text-center text-[15px] text-muted-foreground">
                  沒有符合的資料
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* 底部：筆數＋鍵盤提示。提示常駐是刻意的——使用者不必先學才會用 */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[14px] text-muted-foreground">
        <span>{footerText ?? `共 ${rows.length} 筆`}</span>
        <span>↑↓ 選擇 · Enter 開啟 · Tab 離開表格</span>
      </div>
    </div>
  );
}
