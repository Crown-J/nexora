// apps/nx-ui/src/design/layout/v3/DocListBlock.tsx
//
// 工作檯共用區塊：單別頁籤 ＋ 單號／客戶／狀態三欄 ＋ 欄位排序 ＋ 區域內捲動
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §3（殼 1）
//
// 「待處理單據」與「待處理清單」共用這一支（執行長 2026-08-03：兩塊同樣的方式）。
// 兩塊的差別只在頁籤裝什麼單，⛔ 不是兩套版型。
//
// ⭐ 全部顯示、⛔ 不截斷：超出高度就在區塊內捲動（執行長 2026-08-03）。
//    表頭釘住不動，捲到第 40 筆還看得到自己在看哪一欄。

'use client';

import { useEffect, useMemo, useState } from 'react';

/** 一列＝一張單。⛔ 三欄固定：單號／客戶／狀態 */
export type DocRow = {
  id: string;
  docNo: string;
  partnerName: string;
  statusLabel: string;
  href: string;
};

export type DocTab = {
  key: string;
  label: string;
  load: () => Promise<DocRow[]>;
};

type SortCol = 'docNo' | 'partnerName' | 'statusLabel';
type SortDir = 'asc' | 'desc';

/** 排序：中文用 localeCompare（⛔ 不然「陳」會排在「A」前面這種怪事） */
function sortRows(rows: DocRow[], col: SortCol, dir: SortDir): DocRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * a[col].localeCompare(b[col], 'zh-Hant'));
}

function SortHeader({
  label,
  col,
  width,
  align,
  sort,
  onSort,
}: {
  label: string;
  col: SortCol;
  width: string;
  align?: 'right';
  sort: { col: SortCol; dir: SortDir };
  onSort: (c: SortCol) => void;
}) {
  const on = sort.col === col;
  // ⛔ 不用純圖示：長輩看不出小三角是什麼，直接把方向寫成字
  const mark = on ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      aria-label={`依${label}排序`}
      className={`${width} ${align === 'right' ? 'text-right' : 'text-left'} hover:bg-primary/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
    >
      <span className={on ? 'nx-hint font-bold' : 'nx-hint'}>
        {label}
        {mark}
      </span>
    </button>
  );
}

export function DocListBlock({
  title,
  tabs,
  note,
  onGo,
  middleLabel = '客戶',
}: {
  title: string;
  tabs: DocTab[];
  note?: string;
  /** 由工作檯提供：走 tryNavigate，⛔ 不直接 router.push（要過未存檔守衛） */
  onGo: (href: string, label: string) => void;
  /**
   * 中間欄的欄名。單據都是對客戶／供應商開的所以叫「客戶」；
   * ⚠️ 倉庫作業的單（盤點、調撥）本質上沒有客戶，那邊改叫「對象」比較誠實。
   */
  middleLabel?: string;
}) {
  const [active, setActive] = useState(tabs[0].key);
  /** null＝還沒回來（顯示載入中），[]＝真的沒有。⛔ 兩者不可長一樣 */
  const [rows, setRows] = useState<Record<string, DocRow[] | null>>({});
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'docNo', dir: 'desc' });

  useEffect(() => {
    let alive = true;
    for (const t of tabs) {
      t.load()
        .then((list) => alive && setRows((prev) => ({ ...prev, [t.key]: list })))
        .catch(() => alive && setRows((prev) => ({ ...prev, [t.key]: [] })));
    }
    return () => {
      alive = false;
    };
    // tabs 是模組層常數、不會變；⛔ 不放進相依否則每次 render 重打 API
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const raw = rows[active] ?? null;
  const list = useMemo(() => (raw ? sortRows(raw, sort.col, sort.dir) : null), [raw, sort]);

  /** 同一欄再按一次＝反向；換一欄＝從遞增開始 */
  const onSort = (c: SortCol) =>
    setSort((s) => (s.col === c ? { col: c, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col: c, dir: 'asc' }));

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h2 className="nx-t-sec">{title}</h2>

      {/* 頁籤：單別分組。⚠️ 這是區塊內的頁籤，⛔ 不是 2026-08-01 拍板拿掉的那條全站分頁列 */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const n = rows[t.key];
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={[
                'rounded-lg border-2 px-4 py-2 text-left',
                on ? 'border-primary bg-primary/[0.08]' : 'border-border bg-card hover:bg-primary/[0.06]',
              ].join(' ')}
            >
              <span className="nx-body font-medium">{t.label}</span>
              <span className="nx-body ml-2 font-medium">{n ? n.length : '—'}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border-2 border-border bg-card">
        {/* 表頭釘住：捲動時還看得到欄位與排序方向 */}
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-t-md border-b border-border bg-card px-4 py-2">
          <SortHeader label="單號" col="docNo" width="w-[34%]" sort={sort} onSort={onSort} />
          <SortHeader label={middleLabel} col="partnerName" width="flex-1" sort={sort} onSort={onSort} />
          <SortHeader label="狀態" col="statusLabel" width="w-[22%]" align="right" sort={sort} onSort={onSort} />
        </div>

        {/* ⭐ 全部顯示、⛔ 不截斷；超過就在這個框裡捲 */}
        <div className="max-h-[420px] overflow-y-auto">
          {list === null ? (
            <p className="nx-body px-4 py-6 text-center">載入中…</p>
          ) : list.length === 0 ? (
            <p className="nx-body px-4 py-6 text-center">目前沒有未完成的。</p>
          ) : (
            list.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onGo(r.href, r.docNo)}
                // ⛔ 無 transition：規格 §6 動畫全部關掉
                className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left last:border-b-0 hover:bg-primary/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="nx-mono w-[34%] truncate">{r.docNo}</span>
                <span className="nx-body flex-1 truncate">{r.partnerName}</span>
                <span className="nx-body w-[22%] truncate text-right font-medium">{r.statusLabel}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {note ? <p className="nx-hint">{note}</p> : null}
    </section>
  );
}
