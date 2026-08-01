// apps/nx-ui/src/design/templates/DocTemplate.tsx
//
// 單據模板（v3.0.0 模板軌 第 2 支）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2.1 §6 §7
//
// 八張單共用：單頭 ＋ 單身表格 ＋ 合計列。
// 單身欄位照真實單據抄（料號／品名／數量／單價／金額／備註），三張單一致。
//
// ⛔ 一頁式：這是一整頁，⛔ 不是彈跳視窗（規格 §2.1）。
//
// 鍵盤（開單是打字工作，⛔ 不能要求碰滑鼠）：
//   · 每一格就是輸入框，直接打——⛔ 不做「先選取再按 Enter 進編輯」那一套，
//     開單的人一天打幾百行，多一次按鍵就是多幾百次
//   · Tab / Shift+Tab   前後移動
//   · ↑ ↓                同一欄上下移動（比對數量、單價時最常用）
//   · 最後一格 Tab       自動新增一列並跳到新列第一格（規格 §7.1）
//   · Ctrl+Delete        刪除目前這一列
//
// ⚠️ 純呈現元件：不算金額、不抓資料。計算與資料由呼叫端負責——
//    因為折扣、稅、贈品的規則每張單不同，寫進模板就等於焊死。

'use client';

import { useCallback, useEffect, useRef } from 'react';

export type DocField = {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  /** tailwind 欄寬，例如 'w-64' */
  widthClass?: string;
};

export type DocItemColumn = {
  key: string;
  label: string;
  /** readonly＝系統算出來的（品名、金額），不可輸入但仍顯示 */
  kind: 'text' | 'number' | 'readonly';
  widthClass?: string;
  align?: 'left' | 'right';
};

export type DocTemplateProps = {
  title: string;
  docNo?: string;
  status?: string;
  /** 單頭欄位 */
  header: DocField[];
  columns: DocItemColumn[];
  /** 每列是 key → 顯示值的物件 */
  rows: Record<string, string>[];
  onCellChange: (rowIndex: number, key: string, value: string) => void;
  onAddRow: () => void;
  onDeleteRow: (rowIndex: number) => void;
  /** 右下合計，例如 小計／稅額／總計 */
  totals?: { label: string; value: string }[];
  /** 右上動作鈕 */
  actions?: React.ReactNode;
};

export function DocTemplate({
  title,
  docNo,
  status,
  header,
  columns,
  rows,
  onCellChange,
  onAddRow,
  onDeleteRow,
  totals,
  actions,
}: DocTemplateProps) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  /**
   * 待聚焦的格子。
   * ⚠️ 新增／刪除列之後不能立刻聚焦——那一列還沒被畫出來，
   *    requestAnimationFrame 也不保證跑在 React 提交之後。
   *    所以改成記下來，等 rows 真的變了、DOM 有那一格了才聚焦。
   * 用 ref 不用 state：這只是「待辦事項」，不需要觸發渲染。
   */
  const pendingFocus = useRef<{ row: number; key: string } | null>(null);

  /** 可輸入的欄（readonly 欄不進 Tab 動線，跳過它才不會卡） */
  const editable = columns.filter((c) => c.kind !== 'readonly');

  const focusCell = useCallback((row: number, key: string) => {
    bodyRef.current
      ?.querySelector<HTMLInputElement>(`input[data-row="${row}"][data-key="${key}"]`)
      ?.focus();
  }, []);

  useEffect(() => {
    const p = pendingFocus.current;
    if (!p) return;
    const el = bodyRef.current?.querySelector<HTMLInputElement>(
      `input[data-row="${p.row}"][data-key="${p.key}"]`,
    );
    // 找不到就先留著，下次 rows 變動再試——⛔ 不要沒聚焦到就把意圖丟掉
    if (el) {
      el.focus();
      pendingFocus.current = null;
    }
  }, [rows]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, key: string) => {
      const colIndex = editable.findIndex((c) => c.key === key);
      const lastCol = colIndex === editable.length - 1;
      const lastRow = rowIndex === rows.length - 1;

      if (e.key === 'Tab' && !e.shiftKey && lastCol && lastRow) {
        // 最後一格再按 Tab＝新增一列（規格 §7.1）。打完一行直接接著打下一行，手不離鍵盤。
        e.preventDefault();
        onAddRow();
        pendingFocus.current = { row: rows.length, key: editable[0].key };
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const next = rowIndex + (e.key === 'ArrowDown' ? 1 : -1);
        if (next < 0 || next >= rows.length) return;
        e.preventDefault();
        focusCell(next, key);
        return;
      }

      if (e.key === 'Delete' && e.ctrlKey) {
        e.preventDefault();
        if (rows.length <= 1) return;
        onDeleteRow(rowIndex);
        pendingFocus.current = { row: Math.max(0, rowIndex - 1), key: editable[0].key };
      }
    },
    [editable, rows.length, onAddRow, onDeleteRow, focusCell],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 標題列 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <h1 className="text-lg">{title}</h1>
        {docNo ? <span className="font-mono text-[15px]">{docNo}</span> : null}
        {status ? (
          <span className="rounded border border-border px-2 py-0.5 text-[14px]">{status}</span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>

      {/* 單頭 */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 border-b border-border px-4 py-3">
        {header.map((f) => (
          <label key={f.label} className="flex items-center gap-2">
            <span className="text-[15px] text-muted-foreground">{f.label}</span>
            <input
              value={f.value}
              readOnly={f.readOnly}
              onChange={(e) => f.onChange?.(e.target.value)}
              className={[
                'h-9 rounded-md border border-border bg-background px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-primary',
                f.widthClass ?? 'w-44',
                f.readOnly ? 'text-muted-foreground' : '',
              ].join(' ')}
            />
          </label>
        ))}
      </div>

      {/* 單身 */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th scope="col" className="w-12 border-b border-border px-2 py-2 text-left text-[14px] font-medium">
                #
              </th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={[
                    'border-b border-border px-2 py-2 text-[14px] font-medium',
                    c.widthClass ?? '',
                    c.align === 'right' ? 'text-right' : 'text-left',
                  ].join(' ')}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/60">
                <td className="px-2 py-1 text-[15px] text-muted-foreground tabular-nums">{i + 1}</td>
                {columns.map((c) => (
                  <td key={c.key} className="px-1 py-1">
                    {c.kind === 'readonly' ? (
                      <span
                        className={[
                          'block px-2 py-1.5 text-[15px]',
                          c.align === 'right' ? 'text-right tabular-nums' : '',
                        ].join(' ')}
                      >
                        {r[c.key] ?? ''}
                      </span>
                    ) : (
                      <input
                        data-row={i}
                        data-key={c.key}
                        value={r[c.key] ?? ''}
                        inputMode={c.kind === 'number' ? 'decimal' : undefined}
                        onChange={(e) => onCellChange(i, c.key, e.target.value)}
                        onKeyDown={(e) => onKeyDown(e, i, c.key)}
                        aria-label={`第 ${i + 1} 列 ${c.label}`}
                        className={[
                          'h-9 w-full rounded border border-transparent bg-transparent px-2 text-[15px] outline-none hover:border-border focus:border-primary focus-visible:ring-2 focus-visible:ring-primary',
                          c.align === 'right' ? 'text-right tabular-nums' : '',
                        ].join(' ')}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 合計＋鍵盤提示。提示常駐是刻意的——不必先學才會用 */}
      <div className="flex flex-wrap items-center gap-6 border-t border-border px-4 py-2">
        <span className="text-[14px] text-muted-foreground">
          Tab 下一格 · ↑↓ 同欄上下 · 最後一格 Tab 新增一列 · Ctrl+Delete 刪除列
        </span>
        <div className="ml-auto flex items-center gap-6">
          {totals?.map((t) => (
            <span key={t.label} className="text-[15px]">
              <span className="text-muted-foreground">{t.label}</span>{' '}
              <span className="tabular-nums">{t.value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
