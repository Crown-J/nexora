// apps/nx-ui/src/design/quick-search/PartQuickSearchModal.tsx
// F2 料號即時搜尋 Modal（執行長 2026-06-17 拍板、第三版實作）
//
// 排版（鋼鐵風 #E8A020 主色）：
// ┌─────────────────────────────────────────────────────────────┐
// │ Header: 🔍 料號即時搜尋 [☐含停用]  [F2·QUICK]   [搜尋][✕] │
// ├─────────────────────────────────────────────────────────────┤
// │ 篩選列（4 個 Combobox 並排）                                │
// │   廠牌 ___▾  品名/注音 ___▾  族群 ___▾  料號 ___▾          │
// │   ↓（每欄輸入即出聯想下拉、↑↓選 + Enter 確認 + 跳下一欄）  │
// ├─────────────────────────────────────────────────────────────┤
// │ 主結果區（手動觸發、移除自動 debounce 搜避免閃跳）           │
// │   ✓ 料號  品名  廠牌  族群  庫存:onHand/可出               │
// ├─────────────────────────────────────────────────────────────┤
// │ 明細區（階段 4 接：基本+庫存+三 tab）                       │
// ├─────────────────────────────────────────────────────────────┤
// │ Footer: F2 開關 · ↑↓ 切聯想/結果 · Enter 確認/跳欄 · Esc   │
// └─────────────────────────────────────────────────────────────┘
//
// 行為（執行長 2026-06-17 第三次回饋實作）：
//   - 四欄各自為 Combobox：輸入時 debounce 200ms 出聯想下拉
//   - 上下鍵在下拉內切聯想項；Enter 選定聯想項 + 跳下一欄
//   - 不選聯想直接 Enter → 用輸入文字當該欄條件、跳下一欄
//   - 最後一欄（料號）Enter → 觸發主搜尋 + 焦點跳結果列表
//   - 主結果區只在「Enter 觸發搜尋」或「按搜尋按鈕」更新、不自動 debounce
//   - 結果列表上下鍵切、選中 row 在右側明細區顯示
//   - Alt+F 回第一欄；Esc 關下拉（若開）或關 Modal
//   - 移除 backdrop-blur（CSS blur 是閃跳元兇之一）
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, PackageSearch, Search, X } from 'lucide-react';

import {
  getPartSearchMasterOptions,
  quickSearchParts,
} from '@data/endpoints/nx01/part-search/api/part-search';
import type { PartSearchQuery, PartSearchResult, PartSearchRow } from '@data/types/nx01/part-search';
import { cn } from '@design/utils/cn';

import { Combobox } from './Combobox';

type Props = {
  open: boolean;
  onClose: () => void;
};

type BrandOpt = { id: string; code: string; name: string };
type PartGroupOpt = { id: string; code: string; name: string };

const PAGE_SIZE = 100;
const HARD_LIMIT = 500;
const SUGGESTION_LIMIT = 8;

export function PartQuickSearchModal({ open, onClose }: Props) {
  // 四欄篩選文字（執行長 2026-06-17 拍板第三次回饋:每欄都 Combobox 聯想）
  const [brandQuery, setBrandQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [partGroupQuery, setPartGroupQuery] = useState('');
  const [partNo, setPartNo] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // 主結果區
  const [rows, setRows] = useState<PartSearchRow[]>([]);
  const [result, setResult] = useState<PartSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // 廠牌 / 族群主檔（開啟時一次撈、cache 給聯想 filter 用）
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [partGroups, setPartGroups] = useState<PartGroupOpt[]>([]);

  // 焦點流程 ref（順序 廠牌 → 品名 → 族群 → 料號 → 結果列表）
  const brandInputRef = useRef<HTMLInputElement>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const partGroupInputRef = useRef<HTMLInputElement>(null);
  const partNoInputRef = useRef<HTMLInputElement>(null);

  const FILTER_ORDER: Array<React.RefObject<HTMLInputElement | null>> = useMemo(
    () => [brandInputRef, keywordInputRef, partGroupInputRef, partNoInputRef],
    [],
  );

  const focusFirstFilter = useCallback(() => {
    setTimeout(() => brandInputRef.current?.focus(), 0);
  }, []);

  // 開 Modal: reset + focus 第一欄 + lazy load 主檔
  useEffect(() => {
    if (!open) return;
    setBrandQuery('');
    setKeyword('');
    setPartGroupQuery('');
    setPartNo('');
    setIncludeInactive(false);
    setRows([]);
    setResult(null);
    setError(null);
    setFocusedIndex(0);
    focusFirstFilter();
  }, [open, focusFirstFilter]);

  useEffect(() => {
    if (!open) return;
    if (brands.length > 0 && partGroups.length > 0) return;
    void (async () => {
      try {
        const opts = await getPartSearchMasterOptions();
        setBrands(opts.brands);
        setPartGroups(opts.partGroups);
      } catch {
        // 失敗不擋、聯想下拉就空、Crown 仍能用文字搜
      }
    })();
  }, [open, brands.length, partGroups.length]);

  // 四欄 fetchSuggestions（client filter / API search）
  const fetchBrandSuggestions = useCallback(
    async (q: string): Promise<BrandOpt[]> => {
      const lower = q.toLowerCase();
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
      return partGroups
        .filter(
          (g) => g.code.toLowerCase().includes(lower) || g.name.toLowerCase().includes(lower),
        )
        .slice(0, SUGGESTION_LIMIT);
    },
    [partGroups],
  );

  const fetchKeywordSuggestions = useCallback(async (q: string): Promise<PartSearchRow[]> => {
    try {
      const res = await quickSearchParts({
        keyword: q,
        includeInactive: true,
        page: 1,
        pageSize: SUGGESTION_LIMIT,
      });
      return res.rows;
    } catch {
      return [];
    }
  }, []);

  const fetchPartNoSuggestions = useCallback(async (q: string): Promise<PartSearchRow[]> => {
    try {
      const res = await quickSearchParts({
        partNo: q,
        includeInactive: true,
        page: 1,
        pageSize: SUGGESTION_LIMIT,
      });
      return res.rows;
    } catch {
      return [];
    }
  }, []);

  // 主搜尋（只在「最後一欄 Enter」或「搜尋按鈕」觸發、不再自動 debounce）
  const runSearch = useCallback(
    async (focusResultAfter: boolean) => {
      const hasAny = Boolean(
        brandQuery.trim() || partGroupQuery.trim() || keyword.trim() || partNo.trim(),
      );
      if (!hasAny) {
        setError('至少需提供一個篩選條件（廠牌 / 品名 / 族群 / 料號）');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const q: PartSearchQuery = {
          brandQuery: brandQuery.trim() || undefined,
          partGroupQuery: partGroupQuery.trim() || undefined,
          keyword: keyword.trim() || undefined,
          partNo: partNo.trim() || undefined,
          includeInactive,
          page: 1,
          pageSize: PAGE_SIZE,
        };
        const res = await quickSearchParts(q);
        setResult(res);
        setRows(res.rows);
        setFocusedIndex(0);
        if (focusResultAfter && res.rows.length > 0) {
          setTimeout(() => {
            (document.querySelector('[data-pqs-row="0"]') as HTMLElement | null)?.focus();
          }, 0);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '搜尋失敗');
      } finally {
        setLoading(false);
      }
    },
    [brandQuery, partGroupQuery, keyword, partNo, includeInactive],
  );

  // 跳下一欄（select + focus）
  const focusNext = useCallback(
    (currentIdx: number) => {
      const next = FILTER_ORDER[currentIdx + 1]?.current;
      if (next) {
        next.focus();
        next.select();
      }
    },
    [FILTER_ORDER],
  );

  // 各欄 onSubmit（Combobox Enter 不選聯想時觸發）
  const submitFromBrand = useCallback(() => focusNext(0), [focusNext]);
  const submitFromKeyword = useCallback(() => focusNext(1), [focusNext]);
  const submitFromPartGroup = useCallback(() => focusNext(2), [focusNext]);
  const submitFromPartNo = useCallback(() => void runSearch(true), [runSearch]);

  // 各欄 onSelect（選聯想項時填入 input 值）
  const selectBrand = useCallback((b: BrandOpt) => setBrandQuery(b.code), []);
  const selectPartGroup = useCallback((g: PartGroupOpt) => setPartGroupQuery(g.code), []);
  const selectKeyword = useCallback((r: PartSearchRow) => setKeyword(r.name), []);
  const selectPartNo = useCallback((r: PartSearchRow) => setPartNo(r.code), []);

  // 全域熱鍵：Esc 關 Modal / ↑↓ 切主結果 / Alt+F 回第一欄
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        e.stopPropagation();
        focusFirstFilter();
        return;
      }
      // ↑↓ 切主結果（如果焦點不在 input 篩選欄、就讓給 main result）
      const active = document.activeElement;
      const isInFilter =
        active instanceof HTMLInputElement &&
        FILTER_ORDER.some((ref) => ref.current === active);
      if (isInFilter) return; // 篩選欄 input 的 ↑↓ 已由 Combobox 內部處理
      if (e.key === 'ArrowDown' && rows.length > 0) {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(rows.length - 1, i + 1));
      } else if (e.key === 'ArrowUp' && rows.length > 0) {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [open, rows.length, onClose, focusFirstFilter, FILTER_ORDER]);

  // 切到 focused row 時 scroll into view + DOM focus
  useEffect(() => {
    if (!open) return;
    const el = document.querySelector(`[data-pqs-row="${focusedIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
    const active = document.activeElement;
    const activeIsResultRow =
      active instanceof HTMLElement && active.hasAttribute('data-pqs-row');
    if (activeIsResultRow) el?.focus();
  }, [focusedIndex, open]);

  if (!open) return null;

  const selected = rows[focusedIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div className="flex max-h-[92vh] w-[min(1180px,96vw)] flex-col rounded-2xl border border-[#2A2A30] bg-[#0F0F12] shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[#2A2A30] px-5 py-3">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <PackageSearch className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-[#F0F0F3]">料號即時搜尋</h2>

          <label className="ml-4 flex cursor-pointer items-center gap-1.5 text-[11px] text-[#888892] hover:text-[#E8E8EB]">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="size-3 accent-[#E8A020]"
            />
            含停用品
          </label>

          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60]">
            F2 · QUICK SEARCH
          </span>
          <button
            type="button"
            onClick={() => void runSearch(true)}
            className="ml-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/15 px-3 text-xs font-medium text-[#E8A020] hover:bg-[#E8A020]/25"
          >
            <Search className="size-3.5" />
            搜尋
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-md border border-[#2A2A30] bg-[#1A1A1F] p-1 text-[#888892] hover:bg-[#22222A] hover:text-[#E8E8EB]"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* 篩選列（四個 Combobox 並排）*/}
        <div className="grid grid-cols-1 gap-2 border-b border-[#2A2A30] bg-[#13131A] px-5 py-3 sm:grid-cols-4">
          <Combobox<BrandOpt>
            label="廠牌"
            value={brandQuery}
            onChange={setBrandQuery}
            placeholder="例:BOSCH / NGK / VAG"
            inputRef={brandInputRef}
            fetchSuggestions={fetchBrandSuggestions}
            getKey={(b) => b.id}
            getLabel={(b) => `${b.code} · ${b.name}`}
            onSelect={selectBrand}
            onSubmit={submitFromBrand}
          />
          <Combobox<PartSearchRow>
            label="品名 / 注音聲母"
            value={keyword}
            onChange={setKeyword}
            placeholder="例:火星塞、ㄏㄒㄙ"
            inputRef={keywordInputRef}
            fetchSuggestions={fetchKeywordSuggestions}
            getKey={(r) => r.id}
            getLabel={(r) => r.name}
            getDescription={(r) => `${r.code}${r.brandCode ? ` · ${r.brandCode}` : ''}`}
            onSelect={selectKeyword}
            onSubmit={submitFromKeyword}
          />
          <Combobox<PartGroupOpt>
            label="零件族群"
            value={partGroupQuery}
            onChange={setPartGroupQuery}
            placeholder="例:ENGINE / 引擎 / BRAKE"
            inputRef={partGroupInputRef}
            fetchSuggestions={fetchPartGroupSuggestions}
            getKey={(g) => g.id}
            getLabel={(g) => `${g.code} · ${g.name}`}
            onSelect={selectPartGroup}
            onSubmit={submitFromPartGroup}
          />
          <Combobox<PartSearchRow>
            label="使用料號"
            value={partNo}
            onChange={setPartNo}
            placeholder="例:DEMO-ATE / VAG-03H"
            inputRef={partNoInputRef}
            fetchSuggestions={fetchPartNoSuggestions}
            getKey={(r) => r.id}
            getLabel={(r) => r.code}
            getDescription={(r) => r.name}
            onSelect={selectPartNo}
            onSubmit={submitFromPartNo}
          />
        </div>

        {/* 主結果區 + 明細區 split（固定高度 + loading overlay 防搜尋瞬間 layout 跳）*/}
        <div className="grid min-h-[480px] flex-1 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
          {/* 左：主結果列表 */}
          <div className="relative flex min-h-0 flex-col border-b border-[#2A2A30] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-[#2A2A30] bg-[#0A0A0C]/60 px-4 py-1.5 text-[11px] text-[#888892]">
              <span>
                {result ? (
                  <>
                    主結果{' '}
                    <span className="font-mono text-[#E8A020]">{result.total.toLocaleString()}</span>{' '}
                    筆
                    {result.limitReached ? (
                      <span className="ml-1 text-[#E26060]">
                        （已達上限 {HARD_LIMIT}、請加條件再縮小）
                      </span>
                    ) : null}
                  </>
                ) : (
                  '輸入條件後按 Enter（料號欄）或右上「搜尋」'
                )}
              </span>
              <span className="font-mono text-[10px] text-[#5A5A60]">↑↓ 切結果</span>
            </div>

            {error ? (
              <div className="m-4 flex items-start gap-2 rounded-md border border-[#5A2A2A] bg-[#1F1212] px-3 py-2 text-xs text-[#E26060]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span className="min-w-0 flex-1">{error}</span>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto">
              {rows.length === 0 && !error ? (
                <div className="flex h-full items-center justify-center px-6 py-10 text-center text-xs text-[#5A5A60]">
                  <div>
                    <Search className="mx-auto mb-2 size-6 text-[#3A3A42]" />
                    輸入條件、按 Enter 或「搜尋」按鈕
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-[#1A1A1F]">
                  {rows.map((r, idx) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        data-pqs-row={idx}
                        onClick={() => setFocusedIndex(idx)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2 text-left',
                          idx === focusedIndex
                            ? 'bg-[#E8A020]/12 ring-1 ring-inset ring-[#E8A020]/50'
                            : 'hover:bg-[#1A1A22]',
                          !r.isActive && 'opacity-60',
                        )}
                      >
                        <span className="w-[160px] shrink-0 truncate font-mono text-xs text-[#E8A020]">
                          {r.code}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-[#E8E8EB]">
                          {r.name}
                          {r.spec ? (
                            <span className="ml-1.5 text-[10px] text-[#5A5A60]">· {r.spec}</span>
                          ) : null}
                        </span>
                        <span className="w-[100px] shrink-0 truncate text-[11px] text-[#888892]">
                          {r.brandCode ?? '—'}
                        </span>
                        <span className="w-[80px] shrink-0 truncate text-[11px] text-[#888892]">
                          {r.partGroupCode ?? '—'}
                        </span>
                        <span className="w-[100px] shrink-0 text-right font-mono text-xs">
                          <span className="text-[#22D88F]">{Number(r.onHandTotal).toFixed(0)}</span>
                          <span className="text-[#5A5A60]"> / </span>
                          <span className="text-[#888892]">{Number(r.availableTotal).toFixed(0)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 搜尋中 overlay（不替換內容、避免 layout 重排造成的閃跳）*/}
            {loading ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#0F0F12]/60">
                <div className="flex items-center gap-2 rounded-md border border-[#E8A020]/40 bg-[#0F0F12] px-3 py-1.5 text-xs text-[#E8A020] shadow-lg">
                  <Loader2 className="size-3.5 animate-spin" />
                  搜尋中…
                </div>
              </div>
            ) : null}
          </div>

          {/* 右：明細區（階段 4 接基本+庫存+三 tab）*/}
          <div className="flex min-h-0 flex-col overflow-auto p-4">
            {selected ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-[#2A2A30] bg-[#1A1A22] p-3">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-[#5A5A60]">
                    Selected
                  </div>
                  <div className="mt-1 font-mono text-sm text-[#E8A020]">{selected.code}</div>
                  <div className="mt-0.5 text-sm text-[#E8E8EB]">{selected.name}</div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[#888892]">
                    <div>廠牌：{selected.brandName ?? '—'}</div>
                    <div>族群：{selected.partGroupName ?? '—'}</div>
                    <div>副廠料號：{selected.secCode ?? '—'}</div>
                    <div>狀態：{selected.isActive ? '啟用' : '停用'}</div>
                  </div>
                  <div className="mt-2 flex gap-3 border-t border-[#2A2A30] pt-2 text-[11px]">
                    <div>
                      <span className="text-[#5A5A60]">公司庫存</span>{' '}
                      <span className="font-mono text-[#22D88F]">
                        {Number(selected.onHandTotal).toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5A5A60]">可出量</span>{' '}
                      <span className="font-mono text-[#E8E8EB]">
                        {Number(selected.availableTotal).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-[#2A2A30] p-4 text-center text-[11px] text-[#5A5A60]">
                  基本資料 / 庫存概況 / 進貨銷貨庫存歷史 / 相關零件
                  <div className="mt-1 text-[10px] text-[#3A3A42]">階段 4-5 接入</div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-[11px] text-[#5A5A60]">
                <div>
                  <PackageSearch className="mx-auto mb-2 size-6 text-[#3A3A42]" />
                  選一筆結果以查看完整資料
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#2A2A30] bg-[#0A0A0C]/40 px-5 py-2 text-[10px] text-[#5A5A60]">
          <span>
            F2 開關 · 各欄輸入出聯想 · ↑↓ 選聯想 · Enter 確認+跳下一欄 · 料號欄 Enter 搜尋 ·
            Alt+F 回第一欄 · Esc 關
          </span>
          <span className="font-mono text-[#3A3A42]">NEXORA · Part Quick Search</span>
        </div>
      </div>
    </div>
  );
}

