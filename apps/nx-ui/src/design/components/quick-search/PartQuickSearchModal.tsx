// apps/nx-ui/src/design/components/quick-search/PartQuickSearchModal.tsx
// 料號即時搜尋（執行長 2026-06-25 F2 視窗 1、軌 C 五查法重做）
//
// 範圍：只做視窗 1（搜尋窗）。Enter 選定後印 partId + 觸發 window event
// `nx-part-selected`、給未來視窗 2 hook、本次不做視窗 2~6。
//
// 軌 C 規格（執行長 2026-06-25）：
//   · 五查法（Alt 切換、預設料號）：
//       Alt1 料號 / Alt2 品名 / Alt3 廠牌 / Alt4 族群 / Alt5 綜合
//       · Alt1~4 = 單條件查、左側只顯示該一欄
//       · Alt5 綜合 = 多欄組合（AND 交集）、左側全欄顯示
//   · 左右兩塊 + 焦點流轉：
//       左（輸入區）：欄位由上至下、最下搜尋按鈕
//         - 最後一欄 Enter 或任意處 Alt+F → 觸發搜尋
//         - 觸發後焦點鎖定到右側、左側變灰
//       右（結果區）：↑↓ 選 / Enter 進主要視窗 / Esc 或 Alt+F 退回左側
//   · 切查法時輸入框清空
//   · 結果四欄（沿前一輪定版）：料號 | 副廠料號(secCode) | 廠牌 | 品名 + 正廠金/副廠灰徽章
//     - 縮排分群保留（群組頭 = 主件、替代品縮排掛底）
//   · 焦點規則沿用：輸入欄打字焦點死黏、結果即時更新但不搶焦點
//
// 焦點地基：FocusLockedDialog 包殼（軌 A）、modal-stack guard 自動隔離背景所有 keydown。
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
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';
import { cn } from '@design/utils/cn';

import { Combobox } from './Combobox';
import { PhoneticPicker } from './PhoneticPicker';

type Props = {
  closing?: boolean;
  onClose: () => void;
};

type BrandOpt = { id: string; code: string; name: string };
type PartGroupOpt = { id: string; code: string; name: string };

type Method = 'partNo' | 'name' | 'brand' | 'group' | 'all';
type FocusedSide = 'input' | 'result';

const PAGE_SIZE = 100;
const SUGGESTION_LIMIT = 8;
const SEARCH_DEBOUNCE_MS = 200;
const RESULT_PAGE_SIZE = 8;

const METHOD_TABS: Array<{ key: Method; label: string; alt: string }> = [
  { key: 'partNo', label: '料號', alt: '1' },
  { key: 'name', label: '品名', alt: '2' },
  { key: 'brand', label: '廠牌', alt: '3' },
  { key: 'group', label: '族群', alt: '4' },
  { key: 'all', label: '綜合', alt: '5' },
];

type FlatResultRow =
  | { kind: 'group-primary'; groupId: string; member: PartSearchRow & { role?: number; isMatch?: boolean } }
  | { kind: 'group-alt'; groupId: string; member: PartSearchRow & { role?: number; isMatch?: boolean } }
  | { kind: 'ungrouped'; member: PartSearchRow };

export function PartQuickSearchModal({ closing = false, onClose }: Props) {
  const [method, setMethod] = useState<Method>('partNo');
  const [focusedSide, setFocusedSide] = useState<FocusedSide>('input');

  const [partNo, setPartNo] = useState('');
  const [keyword, setKeyword] = useState('');
  const [brandQuery, setBrandQuery] = useState('');
  const [partGroupQuery, setPartGroupQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [result, setResult] = useState<PartSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [partGroups, setPartGroups] = useState<PartGroupOpt[]>([]);

  // 欄位 refs（依當前 method 動態取首焦點欄）
  const partNoInputRef = useRef<HTMLInputElement>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const partGroupInputRef = useRef<HTMLInputElement>(null);

  const reqIdRef = useRef(0);

  // 各 method 下「左區第一個 input ref」
  const firstInputRef = useMemo<React.RefObject<HTMLInputElement | null>>(() => {
    switch (method) {
      case 'partNo':
        return partNoInputRef;
      case 'name':
        return keywordInputRef;
      case 'brand':
        return brandInputRef;
      case 'group':
        return partGroupInputRef;
      case 'all':
      default:
        return partNoInputRef;
    }
  }, [method]);

  // 切 method：清四欄輸入 + 重置 result + 焦點回左區首欄
  const switchMethod = useCallback((next: Method) => {
    setMethod(next);
    setPartNo('');
    setKeyword('');
    setBrandQuery('');
    setPartGroupQuery('');
    setIncludeInactive(false);
    setResult(null);
    setError(null);
    setHighlightIndex(0);
    setFocusedSide('input');
  }, []);

  // mount: reset + 首焦點 + lazy load 主檔
  useEffect(() => {
    setMethod('partNo');
    setPartNo('');
    setKeyword('');
    setBrandQuery('');
    setPartGroupQuery('');
    setIncludeInactive(false);
    setResult(null);
    setError(null);
    setHighlightIndex(0);
    setFocusedSide('input');
    setTimeout(() => partNoInputRef.current?.focus(), 0);
  }, []);

  // method 切換後、focus 進新欄第一個 input（FocusLockedDialog 已 mount）
  useEffect(() => {
    if (focusedSide !== 'input') return;
    queueMicrotask(() => firstInputRef.current?.focus());
  }, [method, focusedSide, firstInputRef]);

  useEffect(() => {
    void (async () => {
      try {
        const opts = await getPartSearchMasterOptions();
        setBrands(opts.brands);
        setPartGroups(opts.partGroups);
      } catch {
        /* 撈不到不擋 */
      }
    })();
  }, []);

  const flatRows = useMemo<FlatResultRow[]>(() => {
    if (!result) return [];
    const acc: FlatResultRow[] = [];
    for (const g of result.groups ?? []) {
      if (g.primary) acc.push({ kind: 'group-primary', groupId: g.groupId, member: g.primary });
      for (const a of g.alts) acc.push({ kind: 'group-alt', groupId: g.groupId, member: a });
    }
    for (const u of result.ungrouped ?? []) acc.push({ kind: 'ungrouped', member: u });
    return acc;
  }, [result]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [flatRows]);

  // 主搜尋（依 method 帶條件、Alt5 帶所有欄）
  const runSearch = useCallback(async () => {
    const q: PartSearchQuery = { groupByCompat: true, page: 1, pageSize: PAGE_SIZE };
    if (method === 'partNo' || method === 'all') q.partNo = partNo.trim() || undefined;
    if (method === 'name' || method === 'all') q.keyword = keyword.trim() || undefined;
    if (method === 'brand' || method === 'all') q.brandQuery = brandQuery.trim() || undefined;
    if (method === 'group' || method === 'all') q.partGroupQuery = partGroupQuery.trim() || undefined;
    q.includeInactive = includeInactive;
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
  }, [method, partNo, keyword, brandQuery, partGroupQuery, includeInactive]);

  // 打字 debounce 自動搜尋（資料即時更新、不動焦點）
  useEffect(() => {
    const handle = setTimeout(() => void runSearch(), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [partNo, keyword, brandQuery, partGroupQuery, includeInactive, method, runSearch]);

  // 觸發搜尋 + 焦點鎖定到右側
  const triggerSearchAndFocusResult = useCallback(() => {
    void runSearch();
    // 等下次 paint，render 完 row 再 focus
    setFocusedSide('result');
    queueMicrotask(() => {
      const el = document.querySelector('[data-pqs-row="0"]') as HTMLElement | null;
      el?.focus();
    });
  }, [runSearch]);

  // 退回左區
  const backToInput = useCallback(() => {
    setFocusedSide('input');
    queueMicrotask(() => firstInputRef.current?.focus());
  }, [firstInputRef]);

  // Combobox fetchSuggestions
  const fetchBrandSuggestions = useCallback(
    async (q: string): Promise<BrandOpt[]> => {
      const lower = q.toLowerCase();
      if (!lower) return brands.slice(0, SUGGESTION_LIMIT);
      return brands
        .filter((b) => b.code.toLowerCase().includes(lower) || b.name.toLowerCase().includes(lower))
        .slice(0, SUGGESTION_LIMIT);
    },
    [brands],
  );
  const fetchPartGroupSuggestions = useCallback(
    async (q: string): Promise<PartGroupOpt[]> => {
      const lower = q.toLowerCase();
      if (!lower) return partGroups.slice(0, SUGGESTION_LIMIT);
      return partGroups
        .filter((g) => g.code.toLowerCase().includes(lower) || g.name.toLowerCase().includes(lower))
        .slice(0, SUGGESTION_LIMIT);
    },
    [partGroups],
  );

  // 選定一筆
  const selectRow = useCallback(
    (row: PartSearchRow) => {
      console.log('[F2-V5] 選定料號 partId=%s code=%s name=%s', row.id, row.code, row.name);
      window.dispatchEvent(
        new CustomEvent('nx-part-selected', {
          detail: { partId: row.id, code: row.code, name: row.name },
        }),
      );
      onClose();
    },
    [onClose],
  );

  // 全域熱鍵：Alt+1~5 切 method、Alt+F 觸發搜尋 / 退回
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'f') {
          e.preventDefault();
          e.stopPropagation();
          if (focusedSide === 'input') triggerSearchAndFocusResult();
          else backToInput();
          return;
        }
        if (k === '1') {
          e.preventDefault();
          switchMethod('partNo');
        } else if (k === '2') {
          e.preventDefault();
          switchMethod('name');
        } else if (k === '3') {
          e.preventDefault();
          switchMethod('brand');
        } else if (k === '4') {
          e.preventDefault();
          switchMethod('group');
        } else if (k === '5') {
          e.preventDefault();
          switchMethod('all');
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [focusedSide, switchMethod, triggerSearchAndFocusResult, backToInput]);

  // 結果區 keydown
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
            backToInput();
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
        backToInput();
      }
    },
    [flatRows, highlightIndex, backToInput, selectRow],
  );

  // input 內按 Enter 命中第一筆 highlight
  const handleInputEnter = useCallback(() => {
    if (flatRows.length === 0) return;
    const idx = Math.min(flatRows.length - 1, Math.max(0, highlightIndex));
    selectRow(flatRows[idx].member);
  }, [flatRows, highlightIndex, selectRow]);

  // input 內 ↓ → 焦點進結果區
  const handleInputArrowDown = useCallback(() => {
    if (flatRows.length === 0) return;
    triggerSearchAndFocusResult();
  }, [flatRows.length, triggerSearchAndFocusResult]);

  // 純輸入欄（料號 / 品名）共用 keydown
  const handlePlainInputKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleInputEnter();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleInputArrowDown();
      }
    },
    [handleInputEnter, handleInputArrowDown],
  );

  const inputDisabled = focusedSide === 'result';

  return (
    <FocusLockedDialog
      open={!closing}
      onClose={onClose}
      initialFocusRef={partNoInputRef}
      ariaLabel="料號即時搜尋"
      backdropClassName={cn(
        'bg-black/45 backdrop-blur-sm',
        closing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200',
      )}
      dialogClassName={cn(
        'flex flex-col rounded-2xl border border-border/40 bg-card/85 text-foreground shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl',
        closing ? 'animate-out fade-out zoom-out-95 duration-200' : 'animate-in fade-in zoom-in-95 duration-200',
      )}
      dialogStyle={{ width: 'min(1200px, 96vw)', height: 'min(720px, 92vh)' }}
    >
      <>
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-2.5">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <PackageSearch className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">料號即時搜尋</h2>
          <span className="ml-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/55">
            五查法 · Alt+1~5 切換
          </span>
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

        {/* Method tabs */}
        <div className="flex items-center gap-2 border-b border-border/40 bg-card/50 px-6 py-2">
          {METHOD_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchMethod(t.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors',
                method === t.key
                  ? 'border-[#E8A020] bg-[#E8A020]/15 text-[#E8A020]'
                  : 'border-border/40 bg-background/40 text-muted-foreground hover:border-[#E8A020]/40 hover:text-foreground',
              )}
            >
              <kbd className="rounded border border-current/40 bg-current/10 px-1 text-[9px] opacity-80">
                Alt+{t.alt}
              </kbd>
              {t.label}
            </button>
          ))}
        </div>

        {/* 左右兩塊 */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,_2fr)_3fr]">
          {/* 左：輸入區 */}
          <aside
            className={cn(
              'flex min-h-0 flex-col border-r border-border/40 bg-background/30 transition-opacity',
              inputDisabled && 'opacity-50',
            )}
          >
            <div className="flex items-center justify-between border-b border-border/30 bg-background/20 px-5 py-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/65">
              <span>輸入條件</span>
              {inputDisabled ? (
                <span className="text-[#E8A020]/70 normal-case tracking-normal">
                  已鎖定 · Alt+F 回此區
                </span>
              ) : (
                <span className="text-muted-foreground/45 normal-case tracking-normal">
                  Enter / Alt+F 搜
                </span>
              )}
            </div>
            <div
              className="flex flex-1 flex-col gap-3 px-5 py-4"
              style={{ pointerEvents: inputDisabled ? 'none' : 'auto' }}
              aria-hidden={inputDisabled || undefined}
            >
              {(method === 'partNo' || method === 'all') && (
                <PlainInputBlock
                  label="料號"
                  primary
                  value={partNo}
                  onChange={setPartNo}
                  inputRef={partNoInputRef}
                  placeholder="VAG-03H / 03L 115 561 / 後 6 碼"
                  onKeyDown={handlePlainInputKey}
                />
              )}
              {(method === 'name' || method === 'all') && (
                <PhoneticPicker
                  label="品名（F4 注音）"
                  value={keyword}
                  onChange={setKeyword}
                  placeholder="打字或 F4 注音"
                  inputRef={keywordInputRef}
                  onSelectName={(name) => setKeyword(name)}
                  onSubmit={handleInputEnter}
                  onArrowDownEmpty={handleInputArrowDown}
                />
              )}
              {(method === 'brand' || method === 'all') && (
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
                  onSubmit={handleInputEnter}
                  onArrowDownEmpty={handleInputArrowDown}
                />
              )}
              {(method === 'group' || method === 'all') && (
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
                  onSubmit={handleInputEnter}
                  onArrowDownEmpty={handleInputArrowDown}
                />
              )}
              {method === 'all' && (
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-foreground">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                    className="size-4 accent-[#E8A020]"
                  />
                  含停用品
                </label>
              )}

              <div className="mt-auto pt-3">
                <button
                  type="button"
                  onClick={triggerSearchAndFocusResult}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#E8A020]/60 bg-[#E8A020]/15 px-4 py-2 text-sm text-[#E8A020] transition-colors hover:bg-[#E8A020]/25"
                >
                  搜尋 <kbd className="rounded border border-[#E8A020]/40 bg-[#E8A020]/10 px-1.5 py-px text-[10px]">Alt+F</kbd>
                </button>
                {method !== 'all' && (
                  <p className="mt-2 text-center text-[10px] text-muted-foreground/55">
                    Alt+5 切「綜合」可組合多欄查
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* 右：結果區 */}
          <section className="flex min-h-0 flex-col">
            <ResultsHeader
              result={result}
              loading={loading}
              error={error}
              hasAnyInput={Boolean(partNo || keyword || brandQuery || partGroupQuery)}
              locked={focusedSide === 'result'}
            />
            <div className="relative min-h-0 flex-1 overflow-auto">
              {flatRows.length === 0 ? (
                <EmptyState
                  hasAnyInput={Boolean(partNo || keyword || brandQuery || partGroupQuery)}
                  loading={loading}
                  error={error}
                  resultIsZero={Boolean(result && result.total === 0)}
                />
              ) : (
                <ul className="divide-y divide-border/20 pt-1 pb-3">
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
              {loading ? (
                <div className="pointer-events-none absolute right-4 top-3 flex items-center gap-2 rounded-md border border-[#E8A020]/40 bg-background/60 px-3 py-1.5 text-xs text-[#E8A020] shadow-lg">
                  <Loader2 className="size-3.5 animate-spin" />
                  搜尋中…
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/30 bg-background/30 px-6 py-1.5 text-[10px] text-muted-foreground/55">
          <span>
            <Kbd>Alt+1~5</Kbd> 切查法 · <Kbd>Enter</Kbd> 命中 / 選定 · <Kbd>Alt+F</Kbd> 搜尋 / 切左右 ·{' '}
            <Kbd>↑↓</Kbd> 切筆 · <Kbd>Esc</Kbd> 退回左區 / 關
          </span>
          <span className="font-mono text-[9px] text-muted-foreground/35">NEXORA · 視窗 1</span>
        </div>
      </>
    </FocusLockedDialog>
  );
}

function focusRow(index: number) {
  const el = document.querySelector(`[data-pqs-row="${index}"]`) as HTMLElement | null;
  if (!el) return;
  el.scrollIntoView({ block: 'nearest' });
  el.focus();
}

/** 純輸入欄（料號 / 品名變體之一）*/
function PlainInputBlock({
  label,
  primary,
  value,
  onChange,
  inputRef,
  placeholder,
  onKeyDown,
}: {
  label: string;
  primary?: boolean;
  value: string;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  placeholder?: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          'text-[10px] uppercase tracking-[0.18em]',
          primary ? 'text-[#E8A020]/85' : 'text-muted-foreground/70',
        )}
      >
        {label}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={(e) => {
          if (value) e.currentTarget.select();
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          'rounded-md border bg-background/60 px-3 outline-none placeholder:text-muted-foreground/50',
          primary
            ? 'h-12 border-2 border-[#E8A020]/55 font-mono text-lg tracking-wide text-foreground focus:border-[#E8A020]'
            : 'h-10 border border-border/40 text-sm text-foreground focus:border-[#E8A020]/60',
        )}
      />
    </div>
  );
}

function ResultsHeader({
  result,
  loading,
  error,
  hasAnyInput,
  locked,
}: {
  result: PartSearchResult | null;
  loading: boolean;
  error: string | null;
  hasAnyInput: boolean;
  locked: boolean;
}) {
  const groupCount = result?.groups?.length ?? 0;
  const ungroupedCount = result?.ungrouped?.length ?? 0;
  return (
    <div className="flex items-center justify-between border-b border-border/25 bg-background/30 px-5 py-1.5 text-[11px] text-muted-foreground">
      {error ? (
        <span className="text-[#E26060]">⚠ {error}</span>
      ) : !hasAnyInput ? (
        <span className="text-muted-foreground/65">輸入條件即時搜尋</span>
      ) : !result ? (
        loading ? <span className="text-[#E8A020]">搜尋中…</span> : <span>—</span>
      ) : (
        <span>
          {locked ? <span className="mr-2 text-[#E8A020]">▶</span> : null}
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
            <span className="ml-2 text-[#E26060]">⚠ 已達上限 500</span>
          ) : null}
        </span>
      )}
      <span className="font-mono text-[9px] text-muted-foreground/40">↑↓ PgUp PgDn Home End</span>
    </div>
  );
}

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
  if (error || loading) return null;
  const msg = !hasAnyInput
    ? '輸入條件開始搜尋'
    : resultIsZero
      ? '查無符合料號 — 換個關鍵字、或勾「含停用品」（綜合模式）'
      : '搜尋中…';
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center text-sm text-muted-foreground/60">
      <span>{msg}</span>
    </div>
  );
}

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
        'grid w-full items-center gap-3 px-5 py-2.5 text-left outline-none transition-colors',
        isHighlighted ? 'bg-[#E8A020]/12 ring-1 ring-inset ring-[#E8A020]/60' : 'hover:bg-card/55',
        !m.isActive && 'opacity-55',
      )}
      style={{
        gridTemplateColumns:
          'auto minmax(160px, 200px) minmax(120px, 160px) minmax(80px, 120px) 1fr auto auto',
      }}
    >
      {isAlt ? (
        <span className="ml-5 inline-block w-5 shrink-0 text-center text-muted-foreground/55">└</span>
      ) : (
        <span className="inline-block w-1 shrink-0 self-stretch rounded bg-[#E8A020]/55" />
      )}
      <span
        className={cn(
          'min-w-0 truncate font-mono tracking-wide',
          isAlt ? 'text-sm text-[#E8A020]/85' : 'text-base text-[#E8A020]',
        )}
      >
        {m.code}
      </span>
      <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
        {m.secCode ?? '—'}
      </span>
      <span className="min-w-0 truncate text-sm text-foreground">
        {m.brandCode ?? m.brandName ?? '—'}
      </span>
      <span className="min-w-0 truncate text-sm text-foreground">{m.name}</span>
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
