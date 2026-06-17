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
import { AlertCircle, Image as ImageIcon, Loader2, PackageSearch, Search, X } from 'lucide-react';

import {
  buildPartSearchPhotoUrl,
  getPartDetail,
  getPartSearchMasterOptions,
  getPartStockSummary,
  listPartSearchPhotos,
  quickSearchParts,
  type PartPhotoMeta,
} from '@data/endpoints/nx01/part-search/api/part-search';
import type {
  PartDetailDto,
  PartSearchQuery,
  PartSearchResult,
  PartSearchRow,
  PartStockSummaryDto,
} from '@data/types/nx01/part-search';
import { cn } from '@design/utils/cn';

import { Combobox } from './Combobox';
import { PhoneticPicker } from './PhoneticPicker';

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

  // 明細區（隨選中料號變動）
  const [detail, setDetail] = useState<PartDetailDto | null>(null);
  const [stockSummary, setStockSummary] = useState<PartStockSummaryDto | null>(null);
  const [photos, setPhotos] = useState<PartPhotoMeta[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailReqIdRef = useRef(0);

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

  // 各欄 onSelect（選聯想項時填入 input 值；廠牌/族群帶 name、料號帶 code、品名走 PhoneticPicker）
  const selectBrand = useCallback((b: BrandOpt) => setBrandQuery(b.name), []);
  const selectPartGroup = useCallback((g: PartGroupOpt) => setPartGroupQuery(g.name), []);
  const selectPartNo = useCallback((r: PartSearchRow) => setPartNo(r.code), []);
  const selectKeywordName = useCallback((name: string) => setKeyword(name), []);

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

  // 選中 row 變化 → 並行 fetch detail + stockSummary + photos
  const selected = rows[focusedIndex];
  useEffect(() => {
    if (!open || !selected) {
      setDetail(null);
      setStockSummary(null);
      setPhotos([]);
      return;
    }
    const partId = selected.id;
    const myReqId = ++detailReqIdRef.current;
    setDetailLoading(true);
    void (async () => {
      try {
        const [d, s, p] = await Promise.all([
          getPartDetail(partId),
          getPartStockSummary(partId),
          listPartSearchPhotos(partId).catch(() => ({ rows: [] as PartPhotoMeta[] })),
        ]);
        if (detailReqIdRef.current !== myReqId) return;
        setDetail(d);
        setStockSummary(s);
        setPhotos(p.rows);
      } catch {
        if (detailReqIdRef.current !== myReqId) return;
        setDetail(null);
        setStockSummary(null);
        setPhotos([]);
      } finally {
        if (detailReqIdRef.current === myReqId) setDetailLoading(false);
      }
    })();
  }, [open, selected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div
        className="flex flex-col rounded-2xl border border-[#2A3A32] bg-[#0F1A14] shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        style={{
          // 執行長 2026-06-17:固定 modal 大小、不隨內容變動
          width: 'min(1200px, 96vw)',
          height: 'min(760px, 92vh)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[#2A3A32] px-5 py-3">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <PackageSearch className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-[#E8E8EB]">料號即時搜尋</h2>

          <label className="ml-4 flex cursor-pointer items-center gap-1.5 text-[11px] text-[#888892] hover:text-[#D8D8DC]">
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
            className="ml-1 rounded-md border border-[#2A3A32] bg-[#1F2D26] p-1 text-[#888892] hover:bg-[#22222A] hover:text-[#D8D8DC]"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* 篩選列（四個 Combobox 並排）*/}
        <div className="grid grid-cols-1 gap-2 border-b border-[#2A3A32] bg-[#1A2A22] px-5 py-3 sm:grid-cols-4">
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
          <PhoneticPicker
            label="品名"
            value={keyword}
            onChange={setKeyword}
            placeholder="直接打中文 / 注音鍵盤碼+F4 (CVN→火星塞)"
            inputRef={keywordInputRef}
            onSelectName={selectKeywordName}
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

        {/* 主結果區（窄）+ 明細區（寬）split（執行長 2026-06-17:左側更窄、右側永遠全顯示）*/}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_1fr]">
          {/* 左：主結果列表 */}
          <div className="relative flex min-h-0 flex-col border-b border-[#2A3A32] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-2 border-b border-[#2A3A32] bg-[#0A1410]/60 px-4 py-1.5 text-[11px] text-[#888892]">
              <span className="min-w-0 flex-1 truncate">
                {result ? (
                  <>
                    主結果{' '}
                    <span
                      className={cn(
                        'font-mono',
                        result.total === 0 ? 'text-[#E26060]' : 'text-[#E8A020]',
                      )}
                    >
                      {result.total.toLocaleString()}
                    </span>{' '}
                    筆
                    {result.limitReached ? (
                      <span className="ml-1 text-[#E26060]">
                        （已達上限 {HARD_LIMIT}、請加條件再縮小）
                      </span>
                    ) : null}
                    {result.total === 0 ? (
                      <span className="ml-2 text-[#E26060]">
                        條件「
                        {[
                          brandQuery && `廠牌=${brandQuery}`,
                          keyword && `品名=${keyword}`,
                          partGroupQuery && `族群=${partGroupQuery}`,
                          partNo && `料號=${partNo}`,
                        ]
                          .filter(Boolean)
                          .join(' / ') || '空'}
                        」無對應料號（檢查 demo seed 是否已跑）
                      </span>
                    ) : null}
                  </>
                ) : (
                  '輸入條件後按 Enter（料號欄）或右上「搜尋」'
                )}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-[#5A5A60]">↑↓ 切結果</span>
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
                    <Search className="mx-auto mb-2 size-6 text-[#3A4A42]" />
                    輸入條件、按 Enter 或「搜尋」按鈕
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-[#1F2D26]">
                  {rows.map((r, idx) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        data-pqs-row={idx}
                        onClick={() => setFocusedIndex(idx)}
                        className={cn(
                          'flex w-full px-3 py-2 text-left',
                          idx === focusedIndex
                            ? 'bg-[#E8A020]/12 ring-1 ring-inset ring-[#E8A020]/50'
                            : 'hover:bg-[#1A2A22]',
                          !r.isActive && 'opacity-60',
                        )}
                      >
                        {/* 執行長 2026-06-17:列表只顯示基準料號、不顯示庫存數字 */}
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#E8A020]">
                          {r.code}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 搜尋中 overlay（不替換內容、避免 layout 重排造成的閃跳）*/}
            {loading ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#0F1A14]/60">
                <div className="flex items-center gap-2 rounded-md border border-[#E8A020]/40 bg-[#0F1A14] px-3 py-1.5 text-xs text-[#E8A020] shadow-lg">
                  <Loader2 className="size-3.5 animate-spin" />
                  搜尋中…
                </div>
              </div>
            ) : null}
          </div>

          {/* 右：明細區（基本資料 + 庫存概況 + 產品圖片；進貨/銷貨/庫存歷史留後續階段）*/}
          <DetailPane
            selected={selected}
            detail={detail}
            stockSummary={stockSummary}
            photos={photos}
            detailLoading={detailLoading}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#2A3A32] bg-[#0A1410]/40 px-5 py-2 text-[10px] text-[#5A5A60]">
          <span>
            F2 開關 · 廠牌/族群/料號輸入出聯想 · 品名按 F4 注音查詢 · ↑↓ 選 · Enter 確認 ·
            料號欄 Enter 搜尋 · Alt+F 回第一欄 · Esc 關
          </span>
          <span className="font-mono text-[#3A4A42]">NEXORA · Part Quick Search</span>
        </div>
      </div>
    </div>
  );
}

/** 右側明細區：基本資料(含正方形圖片) + 庫存概況（執行長 2026-06-17:永遠顯示、空值用 —）*/
function DetailPane({
  selected,
  detail,
  stockSummary,
  photos,
  detailLoading,
}: {
  selected: PartSearchRow | undefined;
  detail: PartDetailDto | null;
  stockSummary: PartStockSummaryDto | null;
  photos: PartPhotoMeta[];
  detailLoading: boolean;
}) {
  // 取顯示值 helper（無 selected/detail 時回 '—'）
  const v = (val: string | null | undefined) => (val && val.trim() ? val : '—');
  const codeVal = selected ? (detail?.code ?? selected.code) : '—';
  const nameVal = selected ? v(detail?.name ?? selected.name) : '—';
  const secCodeVal = selected ? v(detail?.secCode ?? selected.secCode) : '—';
  const oldCodeVal = selected ? v(detail?.oldCode) : '—';
  const brandVal = selected
    ? detail?.brand
      ? `${detail.brand.code} · ${detail.brand.name}`
      : v(selected.brandName)
    : '—';
  const groupVal = selected
    ? detail?.partGroup
      ? `${detail.partGroup.code} · ${detail.partGroup.name}`
      : v(selected.partGroupName)
    : '—';
  const specVal = selected ? v(detail?.spec ?? selected.spec) : '—';
  const statusVal = selected ? (selected.isActive ? '啟用' : '停用') : '—';

  return (
    <div className="flex min-h-0 flex-col overflow-auto p-4">
      <div className="space-y-3">
        {/* 基本資料（內嵌正方形圖片在左側）*/}
        <section className="rounded-lg border border-[#2A3A32] bg-[#1A2A22] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#888892]">
              基本資料
            </h3>
            {detailLoading ? <Loader2 className="size-3 animate-spin text-[#5A5A60]" /> : null}
          </div>
          <div className="flex gap-3">
            {/* 正方形產品圖片（執行長 2026-06-17:嵌在基本資料內）*/}
            <SquarePhoto partId={selected?.id} photos={photos} />

            {/* 文字資料 */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <DataRow label="基準料號" value={codeVal} mono accent />
              <DataRow label="品名" value={nameVal} />
              <DataRow label="副廠料號" value={secCodeVal} mono />
              <DataRow label="舊料號" value={oldCodeVal} mono />
              <DataRow label="廠牌" value={brandVal} />
              <DataRow label="族群" value={groupVal} />
              <DataRow label="備註 (規格)" value={specVal} />
              <DataRow label="狀態" value={statusVal} />
            </div>
          </div>
        </section>

        {/* 庫存概況 */}
        <section className="rounded-lg border border-[#2A3A32] bg-[#1A2A22] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#888892]">
              庫存概況
            </h3>
            {detailLoading ? <Loader2 className="size-3 animate-spin text-[#5A5A60]" /> : null}
          </div>

          {/* 公司總 */}
          <div className="mb-2 grid grid-cols-4 gap-2">
            <StatPill
              label="公司庫存"
              value={stockSummary?.company.onHand ?? '0'}
              color="#22D88F"
            />
            <StatPill
              label="可出量"
              value={stockSummary?.company.available ?? '0'}
              color="#D8D8DC"
            />
            <StatPill
              label="不可出"
              value={String(
                Number(stockSummary?.company.reserved ?? '0') +
                  Number(stockSummary?.company.inTransit ?? '0'),
              )}
              color="#E26060"
            />
            <StatPill
              label="在途"
              value={stockSummary?.company.inTransit ?? '0'}
              color="#888892"
            />
          </div>

          {/* 各倉位明細 */}
          {stockSummary && stockSummary.warehouses.length > 0 ? (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[#2A3A32] text-[10px] uppercase tracking-wider text-[#5A5A60]">
                  <th className="py-1.5 pr-2 text-left font-medium">倉位</th>
                  <th className="py-1.5 px-1 text-right font-medium">庫存</th>
                  <th className="py-1.5 px-1 text-right font-medium">可出</th>
                  <th className="py-1.5 px-1 text-right font-medium">不可出</th>
                  <th className="py-1.5 pl-1 text-right font-medium">在途</th>
                </tr>
              </thead>
              <tbody>
                {stockSummary.warehouses.map((w) => (
                  <tr key={w.warehouseId} className="border-b border-[#1F2D26]">
                    <td className="py-1.5 pr-2 font-mono text-[#D8D8DC]">
                      {w.warehouseCode}
                      <span className="ml-1 text-[10px] text-[#5A5A60]">· {w.warehouseName}</span>
                    </td>
                    <td className="py-1.5 px-1 text-right font-mono text-[#22D88F]">
                      {Number(w.onHand).toFixed(0)}
                    </td>
                    <td className="py-1.5 px-1 text-right font-mono text-[#D8D8DC]">
                      {Number(w.available).toFixed(0)}
                    </td>
                    <td className="py-1.5 px-1 text-right font-mono text-[#E26060]">
                      {Number(w.reserved).toFixed(0)}
                    </td>
                    <td className="py-1.5 pl-1 text-right font-mono text-[#888892]">
                      {Number(w.inTransit).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded border border-dashed border-[#2A3A32] px-3 py-2 text-center text-[10px] text-[#5A5A60]">
              無倉位庫存資料
            </div>
          )}
        </section>

        {/* 後續階段提示（進貨/銷貨/庫存歷史 / 相關零件）*/}
        <div className="rounded-lg border border-dashed border-[#2A3A32] p-3 text-center text-[10px] text-[#5A5A60]">
          進貨明細 / 銷貨報價 / 出入庫紀錄 / 相關零件 ─ 階段 5+ 接入
        </div>
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 border-b border-[#1F2D26]/60 pb-1 text-[11px] last:border-b-0 last:pb-0">
      <span className="w-[78px] shrink-0 text-[#5A5A60]">{label}</span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          mono && 'font-mono',
          accent ? 'text-[#E8A020]' : 'text-[#D8D8DC]',
        )}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-[#2A3A32] bg-[#0A1410]/60 px-2 py-1.5">
      <span className="text-[9px] uppercase tracking-wider text-[#5A5A60]">{label}</span>
      <span className="font-mono text-sm" style={{ color }}>
        {Number(value).toFixed(0)}
      </span>
    </div>
  );
}

/** 正方形產品縮圖（嵌在基本資料左側、執行長 2026-06-17）*/
function SquarePhoto({ partId, photos }: { partId: string | undefined; photos: PartPhotoMeta[] }) {
  const main = photos[0];
  if (!partId || !main) {
    return (
      <div className="flex size-[120px] shrink-0 flex-col items-center justify-center rounded border border-dashed border-[#2A3A32] bg-[#0A1410]/40 text-center text-[9px] text-[#5A5A60]">
        <ImageIcon className="mb-1 size-5 text-[#3A4A42]" />
        無產品圖
      </div>
    );
  }
  return (
    <div className="size-[120px] shrink-0 overflow-hidden rounded border border-[#2A3A32] bg-[#0A1410]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={buildPartSearchPhotoUrl(partId, main.id)}
        alt={main.origFilename ?? '產品圖片'}
        className="size-full object-cover"
      />
    </div>
  );
}

