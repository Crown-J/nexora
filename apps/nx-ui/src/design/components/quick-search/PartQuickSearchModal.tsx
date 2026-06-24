// apps/nx-ui/src/design/components/quick-search/PartQuickSearchModal.tsx
// 料號即時搜尋（執行長 2026-06-24 F2 視窗 1 重做、第四版）
//
// 範圍：本次只做視窗 1（搜尋窗）。Enter 選定後印 partId + 觸發 window event
// `nx-part-selected`、給未來視窗 2 hook、本次不做視窗 2~6。
//
// 與第三版差異：
//   · 單欄結構（移除右側明細 / 4 tabs / 圖片 / 歷史紀錄；那些屬視窗 2~6）
//   · 5 欄搜尋列：料號(大、預設焦點) / 品名(F4) / 廠牌 / 族群 / □含停用品
//   · 結果以「主件→替代品」群組樹呈現（通用件群組）、命中高亮
//   · 全鍵盤紀律新版（Esc 兩段式、空白雙意、focus 全選、PgUp/PgDn/Home/End、debounce 250ms 自動焦點）
//
// 排版：
// ┌─────────────────────────────────────────────────────────────────┐
// │ Header: 🔍 料號即時搜尋               [F2·QUICK SEARCH]   [✕]  │
// ├─────────────────────────────────────────────────────────────────┤
// │ 搜尋列：料號(2fr) | 品名 F4 | 廠牌 | 族群 | ☐含停用品          │
// ├─────────────────────────────────────────────────────────────────┤
// │ 結果（單欄、主件群組頭 + 替代品縮排掛底下、字級放大）          │
// ├─────────────────────────────────────────────────────────────────┤
// │ Footer: 鍵盤操作提示常駐                                       │
// └─────────────────────────────────────────────────────────────────┘
//
// 全鍵盤行為：
//   · 欄位切換: Tab / Shift+Tab
//   · focus 落入有字: 自動全選反白（打字=覆蓋、→鍵取消反白接續編輯）
//   · 純輸入欄（料號 / 品名）: 空白=空格（料號要能打「03L 115 561」）
//   · 品名欄 F4 = 注音查詢（PhoneticPicker 內建）
//   · 下拉欄（廠牌 / 族群）: 空欄+空白→開選單；有字+空白→吞掉；直接打字篩選
//     - 選單內 ↑↓ 選、Enter 定（沿用 Combobox）
//   · 結果列表: ↑↓ 切筆 / PgUp PgDn 翻頁 / Home End 頭尾 / Enter 選定 / Esc 關
//   · Esc 兩段式: 內層 input 開著的下拉 → 先關下拉；下拉關著或在結果區 → 關 modal
//   · 打完字稍停（debounce 250ms）→ 自動搜尋 + 焦點落結果第一筆（前提：焦點仍在剛打的 input）
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, PackageSearch, X } from 'lucide-react';

import {
  getPartSearchMasterOptions,
  quickSearchParts,
} from '@data/endpoints/nx01/part-search/api/part-search';
import type {
  PartSearchCompatGroup,
  PartSearchQuery,
  PartSearchResult,
  PartSearchRow,
} from '@data/types/nx01/part-search';
import { cn } from '@design/utils/cn';

import { Combobox } from './Combobox';
import { PhoneticPicker } from './PhoneticPicker';

type Props = {
  closing?: boolean;
  onClose: () => void;
};

type BrandOpt = { id: string; code: string; name: string };
type PartGroupOpt = { id: string; code: string; name: string };

const PAGE_SIZE = 100;
const SUGGESTION_LIMIT = 8;
const SEARCH_DEBOUNCE_MS = 250;
const RESULT_PAGE_SIZE = 8; // PgUp/PgDn 每頁跳幾筆

/** 扁平 row 給↑↓ navigation 用：群組頭 + 替代品依序排、最後接 ungrouped */
type FlatResultRow =
  | { kind: 'group-primary'; groupId: string; member: PartSearchRow & { role?: number; isMatch?: boolean } }
  | { kind: 'group-alt'; groupId: string; member: PartSearchRow & { role?: number; isMatch?: boolean } }
  | { kind: 'ungrouped'; member: PartSearchRow };

export function PartQuickSearchModal({ closing = false, onClose }: Props) {
  // 四欄條件 + 含停用旗標
  const [partNo, setPartNo] = useState('');
  const [keyword, setKeyword] = useState('');
  const [brandQuery, setBrandQuery] = useState('');
  const [partGroupQuery, setPartGroupQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // 結果
  const [result, setResult] = useState<PartSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // 廠牌 / 族群 cache（給 Combobox 聯想 filter 用）
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [partGroups, setPartGroups] = useState<PartGroupOpt[]>([]);

  // 欄位 refs
  const partNoInputRef = useRef<HTMLInputElement>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const partGroupInputRef = useRef<HTMLInputElement>(null);
  const resultListRef = useRef<HTMLDivElement>(null);

  // 串接視窗 2 用：reqId 防 race condition
  const reqIdRef = useRef(0);

  // 焦點管理：debounce 自動跳結果區時、確認當下焦點仍在 input（避免使用者 Tab 走後被搶回）
  const FILTER_REFS = useMemo(
    () => [partNoInputRef, keywordInputRef, brandInputRef, partGroupInputRef],
    [],
  );

  // mount: reset + 預設焦點落料號欄 + lazy load 主檔
  useEffect(() => {
    setPartNo('');
    setKeyword('');
    setBrandQuery('');
    setPartGroupQuery('');
    setIncludeInactive(false);
    setResult(null);
    setError(null);
    setFocusedIndex(0);
    // 預設焦點：料號欄（執行長 2026-06-24 規格：開窗游標自動停料號欄）
    setTimeout(() => partNoInputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const opts = await getPartSearchMasterOptions();
        setBrands(opts.brands);
        setPartGroups(opts.partGroups);
      } catch {
        // 撈不到不擋、Combobox 聯想就空、純文字搜尋仍可用
      }
    })();
  }, []);

  // 扁平化 result 給↑↓ 用
  const flatRows = useMemo<FlatResultRow[]>(() => {
    if (!result) return [];
    const acc: FlatResultRow[] = [];
    for (const g of result.groups ?? []) {
      if (g.primary) {
        acc.push({ kind: 'group-primary', groupId: g.groupId, member: g.primary });
      }
      for (const a of g.alts) {
        acc.push({ kind: 'group-alt', groupId: g.groupId, member: a });
      }
    }
    for (const u of result.ungrouped ?? []) {
      acc.push({ kind: 'ungrouped', member: u });
    }
    return acc;
  }, [result]);

  // 主搜尋
  const runSearch = useCallback(
    async (opts: { focusResultAfter: boolean }) => {
      const q: PartSearchQuery = {
        partNo: partNo.trim() || undefined,
        keyword: keyword.trim() || undefined,
        brandQuery: brandQuery.trim() || undefined,
        partGroupQuery: partGroupQuery.trim() || undefined,
        includeInactive,
        groupByCompat: true,
        page: 1,
        pageSize: PAGE_SIZE,
      };
      const hasAny = Boolean(q.partNo || q.keyword || q.brandQuery || q.partGroupQuery);
      if (!hasAny) {
        // 全空 = 清結果、不搜
        setResult(null);
        setError(null);
        setLoading(false);
        return;
      }
      const myReqId = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const res = await quickSearchParts(q);
        if (reqIdRef.current !== myReqId) return;
        setResult(res);
        setFocusedIndex(0);
        // 自動把焦點落到結果第一筆（前提：當下焦點仍在剛打字的 input、沒 Tab 走）
        if (opts.focusResultAfter) {
          const stillInFilter =
            document.activeElement instanceof HTMLInputElement &&
            FILTER_REFS.some((ref) => ref.current === document.activeElement);
          if (stillInFilter) {
            // 用 rAF 確保 DOM render 完
            requestAnimationFrame(() => {
              const el = document.querySelector('[data-pqs-row="0"]') as HTMLElement | null;
              el?.focus();
            });
          }
        }
      } catch (e) {
        if (reqIdRef.current !== myReqId) return;
        setError(e instanceof Error ? e.message : '搜尋失敗');
      } finally {
        if (reqIdRef.current === myReqId) setLoading(false);
      }
    },
    [partNo, keyword, brandQuery, partGroupQuery, includeInactive, FILTER_REFS],
  );

  // 自動 debounce 搜尋：打完字稍停 → 搜尋 + 自動焦點到第一筆
  useEffect(() => {
    const handle = setTimeout(() => {
      void runSearch({ focusResultAfter: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [partNo, keyword, brandQuery, partGroupQuery, includeInactive, runSearch]);

  // Combobox fetchSuggestions（用 cache 過濾）
  const fetchBrandSuggestions = useCallback(
    async (q: string): Promise<BrandOpt[]> => {
      const lower = q.toLowerCase();
      if (!lower) return brands.slice(0, SUGGESTION_LIMIT);
      return brands
        .filter(
          (b) => b.code.toLowerCase().includes(lower) || b.name.toLowerCase().includes(lower),
        )
        .slice(0, SUGGESTION_LIMIT);
    },
    [brands],
  );

  const fetchPartGroupSuggestions = useCallback(
    async (q: string): Promise<PartGroupOpt[]> => {
      const lower = q.toLowerCase();
      if (!lower) return partGroups.slice(0, SUGGESTION_LIMIT);
      return partGroups
        .filter(
          (g) => g.code.toLowerCase().includes(lower) || g.name.toLowerCase().includes(lower),
        )
        .slice(0, SUGGESTION_LIMIT);
    },
    [partGroups],
  );

  // 各欄 onSubmit（Combobox / PhoneticPicker Enter 時觸發、非選聯想項）
  // 規格：Tab 跳下一欄、Enter 跑搜尋。為了單欄式工作流、Enter 也跑搜尋。
  const submitField = useCallback(() => {
    void runSearch({ focusResultAfter: true });
  }, [runSearch]);

  // 確定選擇一筆 → 印 partId + 觸發 window event 給未來視窗 2、關 modal
  const selectRow = useCallback(
    (row: PartSearchRow) => {
      console.log('[F2-V4] 選定料號 partId=%s code=%s name=%s', row.id, row.code, row.name);
      window.dispatchEvent(
        new CustomEvent('nx-part-selected', {
          detail: { partId: row.id, code: row.code, name: row.name },
        }),
      );
      onClose();
    },
    [onClose],
  );

  // 結果區鍵盤：↑↓ / PgUp PgDn / Home End / Enter / Esc
  const handleResultKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.nativeEvent.isComposing) return;
      const total = flatRows.length;
      if (total === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(total - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(total - 1, i + RESULT_PAGE_SIZE));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(0, i - RESULT_PAGE_SIZE));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(total - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = flatRows[focusedIndex];
        if (r) selectRow(r.member);
      } else if (e.key === 'Escape') {
        // 結果區無下拉選單可關 → 直接關 modal
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [flatRows, focusedIndex, onClose, selectRow],
  );

  // 切 focused row → scroll into view + DOM focus
  useEffect(() => {
    const el = document.querySelector(
      `[data-pqs-row="${focusedIndex}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: 'nearest' });
    // 若焦點目前在「結果區某個 row button」上、切換到新的 row、要把焦點轉過去
    const active = document.activeElement;
    const activeIsResultRow =
      active instanceof HTMLElement && active.hasAttribute('data-pqs-row');
    if (activeIsResultRow) el.focus();
  }, [focusedIndex]);

  // Modal 全域 Esc（最外層保險：所有內層元件沒攔截才執行）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === 'Escape') {
        // 內層的 Combobox / PhoneticPicker 已 stopPropagation 處理下拉開的情況、
        // 這裡只在他們沒攔住時關 modal
        e.preventDefault();
        onClose();
      }
    };
    // capture=false → 內層攔下後不會走到這裡（Combobox 用了 stopPropagation）
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm',
        closing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200',
      )}
    >
      <div
        className={cn(
          'flex flex-col rounded-2xl border border-border/40 bg-card/85 text-foreground shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl',
          closing
            ? 'animate-out fade-out zoom-out-95 duration-200'
            : 'animate-in fade-in zoom-in-95 duration-200',
        )}
        style={{
          width: 'min(1100px, 96vw)',
          height: 'min(720px, 92vh)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-3.5">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <PackageSearch className="size-5 text-[#E8A020]" />
          <h2 className="text-base font-bold tracking-wide text-foreground">料號即時搜尋</h2>
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            F2 · QUICK SEARCH
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 rounded-md border border-border/40 bg-background/40 p-1.5 text-muted-foreground hover:bg-card/60 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 搜尋列（5 欄：料號 2fr / 品名 / 廠牌 / 族群 / 含停用品）*/}
        <div className="grid items-end gap-3 border-b border-border/40 bg-card/60 px-6 py-4"
             style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto' }}>
          {/* 料號欄：純 input、空白=空格、首焦點、字級加大 */}
          <PartNoInput
            value={partNo}
            onChange={setPartNo}
            inputRef={partNoInputRef}
            onSubmit={submitField}
          />
          <PhoneticPicker
            label="品名（F4 注音）"
            value={keyword}
            onChange={setKeyword}
            placeholder="直接打中文或按 F4 注音查"
            inputRef={keywordInputRef}
            onSelectName={(name) => setKeyword(name)}
            onSubmit={submitField}
          />
          <Combobox<BrandOpt>
            label="廠牌"
            value={brandQuery}
            onChange={setBrandQuery}
            placeholder="空白=展開、或打字篩選"
            inputRef={brandInputRef}
            fetchSuggestions={fetchBrandSuggestions}
            getKey={(b) => b.id}
            getLabel={(b) => `${b.code} · ${b.name}`}
            onSelect={(b) => setBrandQuery(b.name)}
            onSubmit={submitField}
          />
          <Combobox<PartGroupOpt>
            label="族群"
            value={partGroupQuery}
            onChange={setPartGroupQuery}
            placeholder="空白=展開、或打字篩選"
            inputRef={partGroupInputRef}
            fetchSuggestions={fetchPartGroupSuggestions}
            getKey={(g) => g.id}
            getLabel={(g) => `${g.code} · ${g.name}`}
            onSelect={(g) => setPartGroupQuery(g.name)}
            onSubmit={submitField}
          />
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="size-4 accent-[#E8A020]"
            />
            含停用品
          </label>
        </div>

        {/* 結果區 */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <ResultsHeader
            result={result}
            loading={loading}
            error={error}
            hasAnyInput={Boolean(partNo || keyword || brandQuery || partGroupQuery)}
          />
          <div ref={resultListRef} className="h-full overflow-auto pb-2 pt-1">
            {flatRows.length === 0 ? null : (
              <ul className="divide-y divide-border/20">
                {flatRows.map((row, idx) => (
                  <li key={`${row.kind}-${row.member.id}-${idx}`}>
                    <ResultRow
                      row={row}
                      index={idx}
                      isFocused={idx === focusedIndex}
                      onFocusIndex={setFocusedIndex}
                      onKeyDown={handleResultKey}
                      onSelect={selectRow}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {loading ? (
            <div className="pointer-events-none absolute right-4 top-3 flex items-center gap-2 rounded-md border border-[#E8A020]/40 bg-background/60 px-3 py-1.5 text-xs text-[#E8A020] shadow-lg">
              <Loader2 className="size-3.5 animate-spin" />
              搜尋中…
            </div>
          ) : null}
        </div>

        {/* Footer 鍵盤提示 */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-border/40 bg-background/40 px-6 py-2.5 text-[11px] text-muted-foreground/80">
          <span>
            <Kbd>Tab</Kbd>/<Kbd>Shift+Tab</Kbd> 切欄 ·{' '}
            <Kbd>↑↓</Kbd>/<Kbd>PgUp</Kbd>/<Kbd>PgDn</Kbd>/<Kbd>Home</Kbd>/<Kbd>End</Kbd> 切筆 ·{' '}
            <Kbd>Enter</Kbd> 選定 · <Kbd>Esc</Kbd> 關（兩段式） · 品名 <Kbd>F4</Kbd> 注音 ·
            廠牌/族群空欄 <Kbd>Space</Kbd> 展開
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/40">
            NEXORA · Part Quick Search · 視窗 1
          </span>
        </div>
      </div>
    </div>
  );
}

/** 料號純輸入欄：focus 全選、空白=正常空格、Enter=搜尋（字級放大）*/
function PartNoInput({
  value,
  onChange,
  inputRef,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
}) {
  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      }
      // Esc 不攔、讓外層 modal 關
      // 空白不攔、純輸入欄 = 正常空格（例：「03L 115 561」）
    },
    [onSubmit],
  );
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
        料號（最大欄、預設焦點）
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        onFocus={(e) => {
          // 焦點落入有字 → 自動全選反白（執行長 2026-06-24 F2 視窗 1 規格）
          if (value) e.currentTarget.select();
        }}
        placeholder="可打 VAG-03H / 03L 115 561 / 03L*115 / 後 6 碼"
        autoComplete="off"
        className="h-12 rounded-md border border-[#E8A020]/40 bg-background/60 px-3 font-mono text-base tracking-wide text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-[#E8A020]"
      />
    </div>
  );
}

/** 結果區 header（result 描述行 + error）*/
function ResultsHeader({
  result,
  loading,
  error,
  hasAnyInput,
}: {
  result: PartSearchResult | null;
  loading: boolean;
  error: string | null;
  hasAnyInput: boolean;
}) {
  const groupCount = result?.groups?.length ?? 0;
  const ungroupedCount = result?.ungrouped?.length ?? 0;
  return (
    <div className="flex items-center justify-between border-b border-border/30 bg-background/40 px-6 py-2 text-[12px] text-muted-foreground">
      {error ? (
        <span className="text-[#E26060]">⚠ {error}</span>
      ) : !hasAnyInput ? (
        <span>輸入任一條件、稍停 0.25 秒自動搜尋；按 <Kbd>F4</Kbd>（品名欄）打注音碼</span>
      ) : !result ? (
        loading ? <span className="text-[#E8A020]">搜尋中…</span> : <span>—</span>
      ) : (
        <span>
          找到{' '}
          <span className={cn('font-mono font-semibold', result.total === 0 ? 'text-[#E26060]' : 'text-[#E8A020]')}>
            {result.total.toLocaleString()}
          </span>{' '}
          筆（群組 <span className="font-mono">{groupCount}</span> · 散件{' '}
          <span className="font-mono">{ungroupedCount}</span>）
          {result.limitReached ? (
            <span className="ml-2 text-[#E26060]">⚠ 已達上限 500、請縮小條件</span>
          ) : null}
        </span>
      )}
      <span className="font-mono text-[10px] text-muted-foreground/50">
        ↑↓ 切筆 / PgUp PgDn 翻頁 / Home End 頭尾
      </span>
    </div>
  );
}

/** 結果 row：群組頭 / 替代品 / 散件三種樣式 */
function ResultRow({
  row,
  index,
  isFocused,
  onFocusIndex,
  onKeyDown,
  onSelect,
}: {
  row: FlatResultRow;
  index: number;
  isFocused: boolean;
  onFocusIndex: (i: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onSelect: (r: PartSearchRow) => void;
}) {
  const m = row.member;
  const isPrimary = row.kind !== 'group-alt';
  const indent = row.kind === 'group-alt';
  const oemTag = m.isOem ? '正廠' : '副廠';
  const oemColor = m.isOem ? 'text-[#22D88F]' : 'text-[#FFB347]';

  return (
    <button
      type="button"
      data-pqs-row={index}
      onClick={() => onSelect(m)}
      onFocus={() => onFocusIndex(index)}
      onKeyDown={onKeyDown}
      className={cn(
        'flex w-full items-center gap-4 px-6 py-3 text-left outline-none transition-colors',
        isFocused
          ? 'bg-[#E8A020]/12 ring-1 ring-inset ring-[#E8A020]/60'
          : 'hover:bg-card/60',
        !m.isActive && 'opacity-55',
      )}
    >
      {/* 縮排線（替代品）*/}
      {indent ? (
        <span className="ml-6 inline-block w-5 shrink-0 text-muted-foreground/60">└</span>
      ) : (
        <span className="inline-block w-1 shrink-0 self-stretch rounded bg-[#E8A020]/60" />
      )}

      {/* 料號 */}
      <span
        className={cn(
          'min-w-[180px] shrink-0 truncate font-mono tracking-wide',
          isPrimary ? 'text-base text-[#E8A020]' : 'text-sm text-[#9BD0E8]',
        )}
      >
        {m.code}
      </span>

      {/* 主件 / 替代 徽章 */}
      {isPrimary ? (
        <span className="shrink-0 rounded border border-[#E8A020]/60 bg-[#E8A020]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#E8A020]">
          主件
        </span>
      ) : (
        <span className="shrink-0 rounded border border-[#5A8FB8]/60 bg-[#3B5C7A]/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#9BD0E8]">
          替代
        </span>
      )}

      {/* 廠牌 */}
      <span className="w-[110px] shrink-0 truncate text-sm text-foreground">
        {m.brandCode ?? m.brandName ?? '—'}
      </span>

      {/* 正廠 / 副廠 */}
      <span className={cn('w-[44px] shrink-0 text-center font-mono text-[11px]', oemColor)}>
        {oemTag}
      </span>

      {/* 品名 */}
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{m.name}</span>

      {/* 命中高亮（替代品如果是搜尋命中、給個小點）*/}
      {'isMatch' in m && (m as { isMatch?: boolean }).isMatch && row.kind === 'group-alt' ? (
        <span className="size-1.5 shrink-0 rounded-full bg-[#E8A020] shadow-[0_0_6px_#E8A020]" />
      ) : null}

      {/* 停用品標 */}
      {!m.isActive ? (
        <span className="shrink-0 rounded border border-[#5A2A2A] bg-[#1F1212] px-1.5 py-0.5 text-[10px] text-[#E26060]">
          停用
        </span>
      ) : null}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border/50 bg-background/60 px-1.5 py-px font-mono text-[10px] text-foreground">
      {children}
    </kbd>
  );
}

// 防範未使用 import warning（result 型別暫保留導出時用）
export type { PartSearchCompatGroup };
