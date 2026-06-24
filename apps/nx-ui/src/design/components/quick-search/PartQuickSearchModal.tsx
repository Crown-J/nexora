// apps/nx-ui/src/design/components/quick-search/PartQuickSearchModal.tsx
// 料號即時搜尋（執行長 2026-06-24 F2 視窗 1、第四版修正單後）
//
// 範圍：只做視窗 1（搜尋窗）。Enter 選定後印 partId + 觸發 window event
// `nx-part-selected`、給未來視窗 2 hook、本次不做視窗 2~6。
//
// 第二輪修正單（2026-06-24 執行長）：
//   1. 拆 highlight(視覺) ≠ focus 移動(鍵盤焦點)
//      · 打字 → 結果即時更新、鍵盤焦點「死黏」料號欄、永不自動移走
//      · 第一筆視覺預選(highlight)、但 focus 不動
//      · 使用者按 ↓ → 焦點才進清單第一筆
//      · 使用者在 input 按 Enter → 有結果就直接選定第一筆(命中捷徑)
//   2. 結果四欄定版：料號 | 副廠料號(secCode) | 廠牌 | 品名 | [正廠金/副廠灰]徽章
//      · 群組頭 / 替代品都同樣四欄；移除主件/替代字樣
//      · 縮排視覺保留（替代品 └ 縮排）
//   3. 版面：料號欄明顯加大、搜尋列高度收斂、空狀態提示、Footer 降存在感
//
// 全鍵盤紀律（不變）：
//   · Tab / Shift+Tab 純跳欄
//   · focus 落入有字 → 自動全選反白
//   · 純輸入欄(料號 / 品名)：空白 = 正常空格
//   · 品名欄 F4 = 注音查詢
//   · 下拉欄(廠牌 / 族群)：空欄+空白→開選單；有字+空白→吞掉
//   · 結果區：↑↓ / PgUp PgDn / Home End / Enter 選定 / Esc 關
//   · Esc 兩段式
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
const SEARCH_DEBOUNCE_MS = 200;
const RESULT_PAGE_SIZE = 8; // PgUp/PgDn 每頁跳幾筆

/** 扁平 row 給↑↓ navigation 用：群組頭 + 替代品依序排、最後接 ungrouped */
type FlatResultRow =
  | { kind: 'group-primary'; groupId: string; member: PartSearchRow & { role?: number; isMatch?: boolean } }
  | { kind: 'group-alt'; groupId: string; member: PartSearchRow & { role?: number; isMatch?: boolean } }
  | { kind: 'ungrouped'; member: PartSearchRow };

export function PartQuickSearchModal({ closing = false, onClose }: Props) {
  // 條件
  const [partNo, setPartNo] = useState('');
  const [keyword, setKeyword] = useState('');
  const [brandQuery, setBrandQuery] = useState('');
  const [partGroupQuery, setPartGroupQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // 結果
  const [result, setResult] = useState<PartSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // highlight 預選（focus 仍可能在 input、這只控視覺反白 + Enter 命中目標）
  const [highlightIndex, setHighlightIndex] = useState(0);

  // 廠牌 / 族群 cache
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [partGroups, setPartGroups] = useState<PartGroupOpt[]>([]);

  // 欄位 refs
  const partNoInputRef = useRef<HTMLInputElement>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const partGroupInputRef = useRef<HTMLInputElement>(null);
  // 上次有焦點的 input ref（給 row 區按 ↑ 在第一筆時 → focus 回該 input 用）
  const lastInputRef = useRef<HTMLInputElement | null>(null);

  const reqIdRef = useRef(0);

  // mount: reset + 首焦點落料號欄 + lazy load 主檔
  useEffect(() => {
    setPartNo('');
    setKeyword('');
    setBrandQuery('');
    setPartGroupQuery('');
    setIncludeInactive(false);
    setResult(null);
    setError(null);
    setHighlightIndex(0);
    setTimeout(() => {
      partNoInputRef.current?.focus();
      lastInputRef.current = partNoInputRef.current;
    }, 0);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const opts = await getPartSearchMasterOptions();
        setBrands(opts.brands);
        setPartGroups(opts.partGroups);
      } catch {
        // 撈不到不擋
      }
    })();
  }, []);

  // 扁平化 result
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

  // 結果集變更 → highlight 回 0；不動 focus
  useEffect(() => {
    setHighlightIndex(0);
  }, [flatRows]);

  // 主搜尋（永不動焦點、只更新結果與 highlight）
  const runSearch = useCallback(async () => {
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
    } catch (e) {
      if (reqIdRef.current !== myReqId) return;
      setError(e instanceof Error ? e.message : '搜尋失敗');
    } finally {
      if (reqIdRef.current === myReqId) setLoading(false);
    }
  }, [partNo, keyword, brandQuery, partGroupQuery, includeInactive]);

  // debounce 自動搜尋（只更新資料、不動焦點）
  useEffect(() => {
    const handle = setTimeout(() => {
      void runSearch();
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [partNo, keyword, brandQuery, partGroupQuery, includeInactive, runSearch]);

  // Combobox fetchSuggestions
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

  // 選定某 row
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

  // input 在「無下拉/候選」時、按 Enter / ↓ 的 callback
  // 給 PartNoInput / Combobox / PhoneticPicker 共用（透過 onArrowDown / onEnterEmpty props）
  const handleInputArrowDown = useCallback(() => {
    if (flatRows.length === 0) return;
    // ↓ 從 input 進清單 → 焦點轉到 highlight 那筆（預設 0）
    const target =
      (document.querySelector(`[data-pqs-row="${highlightIndex}"]`) as HTMLElement | null) ??
      (document.querySelector(`[data-pqs-row="0"]`) as HTMLElement | null);
    if (target) {
      setHighlightIndex((i) => Math.min(flatRows.length - 1, Math.max(0, i)));
      target.focus();
    }
  }, [flatRows.length, highlightIndex]);

  const handleInputEnter = useCallback(() => {
    // input 內按 Enter 命中第一筆 highlight（規格：使用者按 Enter→有結果就直接選定）
    if (flatRows.length === 0) return;
    const idx = Math.min(flatRows.length - 1, Math.max(0, highlightIndex));
    selectRow(flatRows[idx].member);
  }, [flatRows, highlightIndex, selectRow]);

  // 任一 input focus 時記錄、給 row 區 ↑ 回 input 用
  const trackInputFocus = useCallback((ref: React.RefObject<HTMLInputElement | null>) => {
    return () => {
      lastInputRef.current = ref.current;
    };
  }, []);

  // 結果區 row keydown
  const handleResultKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.nativeEvent.isComposing) return;
      const total = flatRows.length;
      if (total === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => {
          const next = Math.min(total - 1, i + 1);
          focusRow(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => {
          if (i === 0) {
            // 從第一筆往上 → 焦點回上次 input 欄
            const back = lastInputRef.current ?? partNoInputRef.current;
            back?.focus();
            return 0;
          }
          const next = i - 1;
          focusRow(next);
          return next;
        });
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        setHighlightIndex((i) => {
          const next = Math.min(total - 1, i + RESULT_PAGE_SIZE);
          focusRow(next);
          return next;
        });
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        setHighlightIndex((i) => {
          const next = Math.max(0, i - RESULT_PAGE_SIZE);
          focusRow(next);
          return next;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setHighlightIndex(0);
        focusRow(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setHighlightIndex(total - 1);
        focusRow(total - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = flatRows[highlightIndex];
        if (r) selectRow(r.member);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [flatRows, highlightIndex, onClose, selectRow],
  );

  // Modal 全域 Esc 保險（內層元件未攔截才走這）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
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
        {/* Header（收斂高度）*/}
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-2.5">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <PackageSearch className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">料號即時搜尋</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60">
            F2 · QUICK SEARCH
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-card/60 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* 搜尋列：料號 3fr 主角 / 品名 1fr / 廠牌 1fr / 族群 1fr / 含停用品 auto */}
        <div
          className="grid items-end gap-3 border-b border-border/40 bg-card/60 px-6 py-3"
          style={{ gridTemplateColumns: '3fr 1fr 1fr 1fr auto' }}
        >
          <PartNoInput
            value={partNo}
            onChange={setPartNo}
            inputRef={partNoInputRef}
            onArrowDown={handleInputArrowDown}
            onEnter={handleInputEnter}
            onFocusTrack={trackInputFocus(partNoInputRef)}
          />
          <PhoneticPicker
            label="品名（F4 注音）"
            value={keyword}
            onChange={setKeyword}
            placeholder="打字或 F4 注音"
            inputRef={keywordInputRef}
            onSelectName={(name) => setKeyword(name)}
            onSubmit={handleInputEnter}
            onArrowDownEmpty={handleInputArrowDown}
            onFocusOutside={trackInputFocus(keywordInputRef)}
          />
          <Combobox<BrandOpt>
            label="廠牌"
            value={brandQuery}
            onChange={setBrandQuery}
            placeholder="空白=展開"
            inputRef={brandInputRef}
            fetchSuggestions={fetchBrandSuggestions}
            getKey={(b) => b.id}
            getLabel={(b) => `${b.code} · ${b.name}`}
            onSelect={(b) => setBrandQuery(b.name)}
            onSubmit={handleInputEnter}
            onArrowDownEmpty={handleInputArrowDown}
            onFocusOutside={trackInputFocus(brandInputRef)}
          />
          <Combobox<PartGroupOpt>
            label="族群"
            value={partGroupQuery}
            onChange={setPartGroupQuery}
            placeholder="空白=展開"
            inputRef={partGroupInputRef}
            fetchSuggestions={fetchPartGroupSuggestions}
            getKey={(g) => g.id}
            getLabel={(g) => `${g.code} · ${g.name}`}
            onSelect={(g) => setPartGroupQuery(g.name)}
            onSubmit={handleInputEnter}
            onArrowDownEmpty={handleInputArrowDown}
            onFocusOutside={trackInputFocus(partGroupInputRef)}
          />
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-[12px] text-foreground">
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
          <div className="h-full overflow-auto pb-3 pt-1">
            {flatRows.length === 0 ? (
              <EmptyState
                hasAnyInput={Boolean(partNo || keyword || brandQuery || partGroupQuery)}
                loading={loading}
                error={error}
                resultIsZero={Boolean(result && result.total === 0)}
              />
            ) : (
              <ul className="divide-y divide-border/20">
                {flatRows.map((row, idx) => (
                  <li key={`${row.kind}-${row.member.id}-${idx}`}>
                    <ResultRow
                      row={row}
                      index={idx}
                      isHighlighted={idx === highlightIndex}
                      onHover={() => setHighlightIndex(idx)}
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

        {/* Footer（降存在感、精簡）*/}
        <div className="flex items-center justify-between border-t border-border/30 bg-background/30 px-6 py-1.5 text-[10px] text-muted-foreground/55">
          <span>
            <Kbd>Tab</Kbd> 切欄 · <Kbd>↓</Kbd> 進清單 · <Kbd>Enter</Kbd> 命中第一筆 · <Kbd>F4</Kbd>{' '}
            注音 · <Kbd>Esc</Kbd> 關
          </span>
          <span className="font-mono text-[9px] text-muted-foreground/35">NEXORA · 視窗 1</span>
        </div>
      </div>
    </div>
  );
}

/** 切 highlight row 時 scroll into view（不主動 setFocus DOM、focus 由 keydown handler 控）*/
function focusRow(index: number) {
  const el = document.querySelector(`[data-pqs-row="${index}"]`) as HTMLElement | null;
  if (!el) return;
  el.scrollIntoView({ block: 'nearest' });
  el.focus();
}

/** 料號純輸入欄：focus 全選、空白=空格、Enter=命中第一筆、↓=焦點進清單 */
function PartNoInput({
  value,
  onChange,
  inputRef,
  onArrowDown,
  onEnter,
  onFocusTrack,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onArrowDown: () => void;
  onEnter: () => void;
  onFocusTrack: () => void;
}) {
  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        onEnter();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onArrowDown();
        return;
      }
      // Esc 由外層全域 listener 接（modal close）；
      // 空白不攔、純輸入欄 = 正常空格（要能打「03L 115 561」）
    },
    [onArrowDown, onEnter],
  );
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#E8A020]/85">
        料號（主、首焦點）
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        onFocus={(e) => {
          onFocusTrack();
          if (value) e.currentTarget.select();
        }}
        placeholder="VAG-03H / 03L 115 561 / 03L*115 / 後 6 碼"
        autoComplete="off"
        className="h-12 rounded-md border-2 border-[#E8A020]/55 bg-background/60 px-3 font-mono text-lg tracking-wide text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-[#E8A020]"
      />
    </div>
  );
}

/** 結果區頂部統計列 */
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
    <div className="flex items-center justify-between border-b border-border/25 bg-background/30 px-6 py-1.5 text-[11px] text-muted-foreground">
      {error ? (
        <span className="text-[#E26060]">⚠ {error}</span>
      ) : !hasAnyInput ? (
        <span className="text-muted-foreground/65">輸入任一條件即時搜尋</span>
      ) : !result ? (
        loading ? <span className="text-[#E8A020]">搜尋中…</span> : <span>—</span>
      ) : (
        <span>
          找到{' '}
          <span
            className={cn(
              'font-mono font-semibold',
              result.total === 0 ? 'text-[#E26060]' : 'text-[#E8A020]',
            )}
          >
            {result.total.toLocaleString()}
          </span>{' '}
          筆 · 群組 <span className="font-mono">{groupCount}</span> · 散件{' '}
          <span className="font-mono">{ungroupedCount}</span>
          {result.limitReached ? (
            <span className="ml-2 text-[#E26060]">⚠ 已達上限 500、請縮小條件</span>
          ) : null}
        </span>
      )}
      <span className="font-mono text-[9px] text-muted-foreground/40">
        ↑↓ / PgUp PgDn / Home End
      </span>
    </div>
  );
}

/** 空狀態提示 */
function EmptyState({
  hasAnyInput,
  loading,
  error,
  resultIsZero,
}: {
  hasAnyInput: boolean;
  loading: boolean;
  error: string | null;
  resultIsZero: boolean;
}) {
  if (error) return null; // 錯誤已在 ResultsHeader 顯示
  if (loading) return null;
  let msg: string;
  if (!hasAnyInput) {
    msg = '輸入料號開始搜尋';
  } else if (resultIsZero) {
    msg = '查無符合料號 — 換個關鍵字、或勾「含停用品」';
  } else {
    msg = '搜尋中…';
  }
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center px-6 text-center text-sm text-muted-foreground/60">
      <span>{msg}</span>
    </div>
  );
}

/** 結果 row（四欄定版：料號 / 副廠料號 / 廠牌 / 品名 / [正廠金 副廠灰]徽章）*/
function ResultRow({
  row,
  index,
  isHighlighted,
  onHover,
  onKeyDown,
  onSelect,
}: {
  row: FlatResultRow;
  index: number;
  isHighlighted: boolean;
  onHover: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onSelect: (r: PartSearchRow) => void;
}) {
  const m = row.member;
  const isAlt = row.kind === 'group-alt';

  return (
    <button
      type="button"
      data-pqs-row={index}
      onClick={() => onSelect(m)}
      onMouseEnter={onHover}
      onKeyDown={onKeyDown}
      className={cn(
        'grid w-full items-center gap-3 px-6 py-2.5 text-left outline-none transition-colors',
        isHighlighted ? 'bg-[#E8A020]/12 ring-1 ring-inset ring-[#E8A020]/55' : 'hover:bg-card/55',
        !m.isActive && 'opacity-55',
      )}
      style={{
        gridTemplateColumns: 'auto minmax(160px, 220px) minmax(120px, 160px) minmax(100px, 140px) 1fr auto auto',
      }}
    >
      {/* 縮排線（替代品）/ 群組頭金條 */}
      {isAlt ? (
        <span className="ml-6 inline-block w-5 shrink-0 text-center text-muted-foreground/55">└</span>
      ) : (
        <span className="inline-block w-1 shrink-0 self-stretch rounded bg-[#E8A020]/55" />
      )}

      {/* 料號（mono、金、突出）*/}
      <span
        className={cn(
          'min-w-0 truncate font-mono tracking-wide',
          isAlt ? 'text-sm text-[#E8A020]/85' : 'text-base text-[#E8A020]',
        )}
      >
        {m.code}
      </span>

      {/* 副廠料號（secCode、mono、灰）*/}
      <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
        {m.secCode ?? '—'}
      </span>

      {/* 廠牌 */}
      <span className="min-w-0 truncate text-sm text-foreground">
        {m.brandCode ?? m.brandName ?? '—'}
      </span>

      {/* 品名 */}
      <span className="min-w-0 truncate text-sm text-foreground">{m.name}</span>

      {/* 正廠 / 副廠 徽章（正廠金、副廠灰）*/}
      <span
        className={cn(
          'shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
          m.isOem
            ? 'border-[#E8A020]/55 bg-[#E8A020]/12 text-[#E8A020]'
            : 'border-border/50 bg-muted/30 text-muted-foreground',
        )}
      >
        {m.isOem ? '正廠' : '副廠'}
      </span>

      {/* 停用標 */}
      {!m.isActive ? (
        <span className="shrink-0 rounded border border-[#5A2A2A] bg-[#1F1212] px-1.5 py-0.5 text-[10px] text-[#E26060]">
          停用
        </span>
      ) : (
        <span className="w-0 shrink-0" />
      )}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border/40 bg-background/40 px-1 py-px font-mono text-[9px] text-muted-foreground/80">
      {children}
    </kbd>
  );
}

export type { PartSearchCompatGroup };
