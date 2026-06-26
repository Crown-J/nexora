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
import { FocusZone } from '@design/primitives/focus-zone';
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
  // 執行長 2026-06-26：品名/廠牌/族群 加車型縮小範圍（次要 AND 篩選欄）
  const [modelQuery, setModelQuery] = useState('');
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
  const modelInputRef = useRef<HTMLInputElement>(null);

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
    setModelQuery('');
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
    setModelQuery('');
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
    if (method === 'name' || method === 'brand' || method === 'group' || method === 'all')
      q.modelQuery = modelQuery.trim() || undefined;
    q.includeInactive = includeInactive;
    const hasAny = Boolean(
      q.partNo || q.keyword || q.brandQuery || q.partGroupQuery || q.modelQuery,
    );
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
  }, [method, partNo, keyword, brandQuery, partGroupQuery, modelQuery, includeInactive]);

  // 打字 debounce 自動搜尋（資料即時更新、不動焦點）
  useEffect(() => {
    const handle = setTimeout(() => void runSearch(), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [partNo, keyword, brandQuery, partGroupQuery, modelQuery, includeInactive, method, runSearch]);

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

  // 選定一筆：dispatch event 給 GlobalPartQuickSearch 接（開視窗 2）。
  // 搜尋窗不自己關、由 Global 管控（主視窗 Esc 退回搜尋窗時搜尋條件保留）。
  const selectRow = useCallback((row: PartSearchRow) => {
    console.log('[F2-V5] 選定料號 partId=%s code=%s name=%s', row.id, row.code, row.name);
    window.dispatchEvent(
      new CustomEvent('nx-part-selected', {
        detail: { partId: row.id, code: row.code, name: row.name },
      }),
    );
  }, []);

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

  // 結果區動作 callbacks（抽出來、給 row onKeyDown 和 FocusZone 容器共用、邏輯不重複）
  const resultMoveDown = useCallback(() => {
    const total = flatRows.length;
    if (total === 0) return;
    setHighlightIndex((i) => {
      const next = Math.min(total - 1, i + 1);
      focusRow(next);
      return next;
    });
  }, [flatRows.length]);
  const resultMoveUp = useCallback(() => {
    const total = flatRows.length;
    if (total === 0) return;
    setHighlightIndex((i) => {
      if (i === 0) {
        backToInput();
        return 0;
      }
      const next = i - 1;
      focusRow(next);
      return next;
    });
  }, [flatRows.length, backToInput]);
  const resultMovePageDown = useCallback(() => {
    const total = flatRows.length;
    if (total === 0) return;
    setHighlightIndex((i) => {
      const next = Math.min(total - 1, i + RESULT_PAGE_SIZE);
      focusRow(next);
      return next;
    });
  }, [flatRows.length]);
  const resultMovePageUp = useCallback(() => {
    if (flatRows.length === 0) return;
    setHighlightIndex((i) => {
      const next = Math.max(0, i - RESULT_PAGE_SIZE);
      focusRow(next);
      return next;
    });
  }, [flatRows.length]);
  const resultMoveHome = useCallback(() => {
    if (flatRows.length === 0) return;
    setHighlightIndex(0);
    focusRow(0);
  }, [flatRows.length]);
  const resultMoveEnd = useCallback(() => {
    const total = flatRows.length;
    if (total === 0) return;
    setHighlightIndex(total - 1);
    focusRow(total - 1);
  }, [flatRows.length]);
  const resultSelect = useCallback(() => {
    const r = flatRows[highlightIndex];
    if (r) selectRow(r.member);
  }, [flatRows, highlightIndex, selectRow]);
  const resultEscape = useCallback(() => backToInput(), [backToInput]);

  // row button onKeyDown（focus 在 row 時走這、scope='space-only' 的 FocusZone 不接 row 冒泡）
  const handleResultKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (flatRows.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          resultMoveDown();
          break;
        case 'ArrowUp':
          e.preventDefault();
          resultMoveUp();
          break;
        case 'PageDown':
          e.preventDefault();
          resultMovePageDown();
          break;
        case 'PageUp':
          e.preventDefault();
          resultMovePageUp();
          break;
        case 'Home':
          e.preventDefault();
          resultMoveHome();
          break;
        case 'End':
          e.preventDefault();
          resultMoveEnd();
          break;
        case 'Enter':
          e.preventDefault();
          resultSelect();
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          resultEscape();
          break;
      }
    },
    [
      flatRows.length,
      resultMoveDown,
      resultMoveUp,
      resultMovePageDown,
      resultMovePageUp,
      resultMoveHome,
      resultMoveEnd,
      resultSelect,
      resultEscape,
    ],
  );

  // 執行長 2026-06-25 修正單：左區 Enter 只做「焦點切右」一件事。
  // 不重跑搜尋（即時搜尋 debounce 已跑）、不選定 row、不關窗。
  // 右區 Enter 才是「選定 + 關窗」（在 handleResultKey 內）。
  // ↓ 鍵在左區也走同一條路：只切焦點。
  const moveFocusToResult = useCallback(() => {
    if (flatRows.length === 0) return; // 無結果不切焦點、避免左區變灰但無處可選
    setFocusedSide('result');
    queueMicrotask(() => {
      const el = document.querySelector('[data-pqs-row="0"]') as HTMLElement | null;
      el?.focus();
    });
  }, [flatRows.length]);
  const handleInputEnter = moveFocusToResult;
  const handleInputArrowDown = moveFocusToResult;

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
        'bg-black/60 backdrop-blur-sm',
        closing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200',
      )}
      dialogClassName={cn(
        'flex flex-col rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_-18px_rgba(232,160,32,0.22)]',
        closing ? 'animate-out fade-out zoom-out-95 duration-200' : 'animate-in fade-in zoom-in-95 duration-200',
      )}
      dialogStyle={{ width: 'min(1200px, 96vw)', height: 'min(720px, 92vh)' }}
    >
      <>
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-3">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
          <PackageSearch className="size-[18px] text-primary" />
          <h2 className="text-[15px] font-semibold tracking-wide text-foreground">料號即時搜尋</h2>
          <span className="ml-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60">
            五查法 · Alt+1~5 切換
          </span>
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/65">
            F2 · QUICK SEARCH
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Method tabs */}
        <div className="flex items-center gap-2 border-b border-border/40 bg-secondary/50 px-6 py-2.5">
          {METHOD_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchMethod(t.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors',
                method === t.key
                  ? 'border-primary bg-primary/15 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                  : 'border-border/40 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <kbd className="rounded border border-current/40 bg-current/10 px-1.5 py-px font-mono text-[10px] tracking-tight opacity-85">
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
            <div className="flex items-center justify-between border-b border-border/30 bg-background/20 px-5 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
              <span>輸入條件</span>
              {inputDisabled ? (
                <span className="text-[12px] text-primary/75 normal-case tracking-normal">
                  已鎖定 · Alt+F 回此區
                </span>
              ) : (
                <span className="text-[12px] text-muted-foreground/55 normal-case tracking-normal">
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
              {(method === 'name' || method === 'brand' || method === 'group' || method === 'all') && (
                <PlainInputBlock
                  label="車型（縮小範圍）"
                  value={modelQuery}
                  onChange={setModelQuery}
                  inputRef={modelInputRef}
                  placeholder="車型代碼/名稱，如 T5 / F30（可空）"
                  onKeyDown={handlePlainInputKey}
                />
              )}
              {method === 'all' && (
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground/90">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  含停用品
                </label>
              )}

              <div className="mt-auto pt-3">
                <button
                  type="button"
                  onClick={triggerSearchAndFocusResult}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/60 bg-primary/15 px-4 py-2 text-[14px] font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:bg-primary/25"
                >
                  搜尋 <kbd className="rounded border border-primary/40 bg-primary/10 px-1.5 py-px font-mono text-[11px]">Alt+F</kbd>
                </button>
                {method !== 'all' && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground/55">
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
            {/* 軌 2：FocusZone 焦點黏著、點 row 間空白方向鍵不失效（scope='space-only'、row onKeyDown 仍處理 row 內事件、避免雙觸發）*/}
            <FocusZone
              className="relative min-h-0 flex-1 overflow-auto"
              onArrowDown={resultMoveDown}
              onArrowUp={resultMoveUp}
              onPageDown={resultMovePageDown}
              onPageUp={resultMovePageUp}
              onHome={resultMoveHome}
              onEnd={resultMoveEnd}
              onEnter={resultSelect}
              onEscape={resultEscape}
              role="listbox"
              ariaLabel="搜尋結果清單"
            >
              {flatRows.length === 0 ? (
                <EmptyState
                  hasAnyInput={Boolean(partNo || keyword || brandQuery || partGroupQuery)}
                  loading={loading}
                  error={error}
                  resultIsZero={Boolean(result && result.total === 0)}
                />
              ) : (
                <ul className="flex flex-col gap-2 px-3 pt-3 pb-4">
                  {flatRows.map((row, idx) => (
                    <li
                      key={`${row.kind}-${row.member.id}-${idx}`}
                      className={cn(row.kind === 'group-alt' && 'pl-7')}
                    >
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
                <div className="pointer-events-none absolute right-4 top-3 flex items-center gap-2 rounded-md border border-primary/40 bg-background/60 px-3 py-1.5 text-xs text-primary shadow-lg">
                  <Loader2 className="size-3.5 animate-spin" />
                  搜尋中…
                </div>
              ) : null}
            </FocusZone>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/30 bg-background/30 px-6 py-2 text-[11px] text-muted-foreground/70">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Kbd>Alt+1~5</Kbd> 切查法
            <span className="text-muted-foreground/30">·</span>
            <Kbd>Enter</Kbd> 命中 / 選定
            <span className="text-muted-foreground/30">·</span>
            <Kbd>Alt+F</Kbd> 搜尋 / 切左右
            <span className="text-muted-foreground/30">·</span>
            <Kbd>↑↓</Kbd> 切筆
            <span className="text-muted-foreground/30">·</span>
            <Kbd>Esc</Kbd> 退回左區 / 關
          </span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/40">
            NEXORA · 視窗 1
          </span>
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
          'text-[11px] font-medium uppercase tracking-[0.14em]',
          primary ? 'text-primary/85' : 'text-muted-foreground/70',
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
          'rounded-md bg-background/60 px-3 outline-none transition-colors placeholder:text-muted-foreground/45',
          primary
            ? 'h-11 border-2 border-primary/55 font-mono text-[15px] tracking-wide text-foreground focus:border-primary'
            : 'h-10 border border-border/40 text-sm text-foreground focus:border-primary/60',
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
    <div className="flex items-center justify-between border-b border-border/25 bg-background/30 px-5 py-2 text-[12px] text-muted-foreground">
      {error ? (
        <span className="text-destructive">⚠ {error}</span>
      ) : !hasAnyInput ? (
        <span className="text-muted-foreground/65">輸入條件即時搜尋</span>
      ) : !result ? (
        loading ? <span className="text-primary">搜尋中…</span> : <span>—</span>
      ) : (
        <span>
          {locked ? <span className="mr-2 text-primary">▶</span> : null}
          找到{' '}
          <span
            className={cn(
              'font-mono font-semibold',
              result.total === 0 ? 'text-destructive' : 'text-primary',
            )}
          >
            {result.total.toLocaleString()}
          </span>{' '}
          筆 · 群組 <span className="font-mono">{groupCount}</span> · 散件{' '}
          <span className="font-mono">{ungroupedCount}</span>
          {result.limitReached ? (
            <span className="ml-2 text-destructive">⚠ 已達上限 500</span>
          ) : null}
        </span>
      )}
      <span className="font-mono text-[10px] text-muted-foreground/45">↑↓ PgUp PgDn Home End</span>
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
    <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center text-[14px] text-muted-foreground/65">
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

  // 字級階層重整（執行長 2026-06-25 質感優化）：
  //   L 識別主資訊（料號 16px / 品名 15px medium）
  //   M 元資訊值（13px）
  //   S 標籤 / 徽章（11px）
  // 卡片質感：背景 gradient（from-card/65 to-card/45）、inset highlight、邊框 / 光暈 / 金條三層動畫
  return (
    <button
      type="button"
      data-pqs-row={index}
      onClick={() => onSelect(m)}
      onMouseEnter={onHover}
      onKeyDown={onKeyDown}
      className={cn(
        'group/card relative flex w-full flex-col gap-2 overflow-hidden rounded-xl px-4 py-3 text-left outline-none',
        'border bg-gradient-to-b from-card/65 to-card/45',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        'transition-[border-color,box-shadow,background-color] duration-150 ease-out',
        // 群組頭 vs 替代品基準
        isAlt ? 'border-border/35' : 'border-primary/30',
        // highlight：邊框純金 + 背景加深 + 雙層光暈（不 scale、字不糊）
        isHighlighted
          ? 'border-primary from-primary/15 to-primary/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_14px_-2px_rgba(232,160,32,0.5)]'
          : 'hover:border-primary/55 hover:from-card/75 hover:to-card/55',
        !m.isActive && 'opacity-55',
      )}
    >
      {/* 群組頭：左側金條（highlight 時變寬、純 width 變化不影響字 anti-alias）*/}
      {!isAlt && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-0 top-2 bottom-2 rounded-r transition-[width,background-color] duration-150 ease-out',
            isHighlighted ? 'w-1.5 bg-primary' : 'w-1 bg-primary/55',
          )}
        />
      )}

      {/* 上排：料號（L 級、mono）+ 徽章群 */}
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            'min-w-0 flex-1 break-all font-mono font-semibold tracking-[0.01em]',
            isAlt ? 'text-[15px] text-primary/85' : 'text-[16px] text-primary',
          )}
        >
          {m.code}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {isAlt && (
            <span className="rounded-md border border-border/55 bg-secondary/25 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              替代
            </span>
          )}
          <span
            className={cn(
              'rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em]',
              m.isOem
                ? 'border-primary/55 bg-primary/15 text-primary'
                : 'border-border/50 bg-muted/30 text-muted-foreground/85',
            )}
          >
            {m.isOem ? '正廠' : '副廠'}
          </span>
          {!m.isActive && (
            <span className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
              停用
            </span>
          )}
        </div>
      </div>

      {/* 中排：品名（L 級 medium、最易讀）*/}
      <div className="break-words text-[15px] font-medium leading-snug text-foreground">
        {m.name}
      </div>

      {/* 下排：副廠料號 / 廠牌（執行長 2026-06-25 視覺優化：灰字對比拉強、字級加大）*/}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="inline-flex items-baseline gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/75">副廠</span>
          <span className="font-mono text-[13px] text-foreground/90">{m.secCode ?? '—'}</span>
        </span>
        <span className="select-none text-muted-foreground/35">·</span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/75">廠牌</span>
          <span className="text-[13px] text-foreground/90">{m.brandCode ?? m.brandName ?? '—'}</span>
        </span>
      </div>
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border/40 bg-background/40 px-1.5 py-px font-mono text-[10px] text-muted-foreground/85">
      {children}
    </kbd>
  );
}

export type { PartSearchCompatGroup };
