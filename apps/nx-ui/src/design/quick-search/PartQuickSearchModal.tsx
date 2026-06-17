// apps/nx-ui/src/design/quick-search/PartQuickSearchModal.tsx
// F2 料號即時搜尋 Modal（執行長 2026-06-17 拍板）
//
// 排版（鋼鐵風 #E8A020 主色）：
// ┌─────────────────────────────────────────────────────────┐
// │ Header: 🔍 料號即時搜尋   [☐含停用]    [F2·QUICK]  [✕] │
// ├─────────────────────────────────────────────────────────┤
// │ 篩選列：廠牌 ▾ ALL | 品名/注音 ___ | 族群 ▾ ALL | 料號 │
// ├─────────────────────────────────────────────────────────┤
// │ 主結果區（virtual scroll、上下鍵切換、選中高亮）        │
// │   ✓ 料號  品名         廠牌    族群    庫存:onHand/可出│
// ├─────────────────────────────────────────────────────────┤
// │ 明細區（階段 3-4 接：基本資料 + 庫存概況 + 三 tab）     │
// ├─────────────────────────────────────────────────────────┤
// │ Footer: F2 開關 · ↑↓ 切換 · Esc 關閉                    │
// └─────────────────────────────────────────────────────────┘
//
// 已實作（階段 2）：F2 hotkey、Esc 關、Enter 送出、↑↓ 切結果、debounce 350ms 自動搜尋
// 待後續階段：廠牌/族群 dropdown 改成聯想 picker、明細區、相關零件、注音 F4 候選、歷史紀錄
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, PackageSearch, Search, X } from 'lucide-react';

import { apiFetch } from '@data/api/client';
import { quickSearchParts } from '@data/endpoints/nx01/part-search/api/part-search';
import { listBrands } from '@data/endpoints/nx01/api/brand';
import type { PartSearchQuery, PartSearchResult, PartSearchRow } from '@data/types/nx01/part-search';
import { cn } from '@design/utils/cn';

type BrandOpt = { id: string; code: string; name: string };
type PartGroupOpt = { id: string; code: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
};

const PAGE_SIZE = 100;
const HARD_LIMIT = 500;

export function PartQuickSearchModal({ open, onClose }: Props) {
  // 篩選四欄
  const [brandId, setBrandId] = useState('');
  const [partGroupId, setPartGroupId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [partNo, setPartNo] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // 結果區
  const [rows, setRows] = useState<PartSearchRow[]>([]);
  const [result, setResult] = useState<PartSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // 主檔下拉
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [partGroups, setPartGroups] = useState<PartGroupOpt[]>([]);

  const keywordInputRef = useRef<HTMLInputElement>(null);

  // Modal 開啟 reset + focus 品名輸入
  useEffect(() => {
    if (!open) return;
    setBrandId('');
    setPartGroupId('');
    setKeyword('');
    setPartNo('');
    setIncludeInactive(false);
    setRows([]);
    setResult(null);
    setError(null);
    setFocusedIndex(0);
    setTimeout(() => keywordInputRef.current?.focus(), 50);
  }, [open]);

  // 開啟時 lazy load 廠牌 + 族群（只撈一次）
  useEffect(() => {
    if (!open || brands.length > 0) return;
    void (async () => {
      try {
        const [brandRes, partGroupRes] = await Promise.all([
          listBrands({ isPart: true, isActive: true, pageSize: 100 }),
          fetchPartGroups(),
        ]);
        setBrands(brandRes.items.map((b) => ({ id: b.id, code: b.code, name: b.name })));
        setPartGroups(partGroupRes);
      } catch {
        // 失敗不擋 modal 開啟、UI 顯示空 dropdown
      }
    })();
  }, [open, brands.length]);

  const hasAnyFilter = useMemo(
    () => Boolean(brandId.trim() || partGroupId.trim() || keyword.trim() || partNo.trim()),
    [brandId, partGroupId, keyword, partNo],
  );

  const runSearch = useCallback(async () => {
    if (!hasAnyFilter) {
      setError('至少需提供一個篩選條件（廠牌 / 品名 / 族群 / 料號）');
      setRows([]);
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q: PartSearchQuery = {
        brandId: brandId || undefined,
        partGroupId: partGroupId || undefined,
        keyword: keyword || undefined,
        partNo: partNo || undefined,
        includeInactive,
        page: 1,
        pageSize: PAGE_SIZE,
      };
      const res = await quickSearchParts(q);
      setResult(res);
      setRows(res.rows);
      setFocusedIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜尋失敗');
      setRows([]);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [hasAnyFilter, brandId, partGroupId, keyword, partNo, includeInactive]);

  // debounce 350ms 自動搜
  useEffect(() => {
    if (!open) return;
    if (!hasAnyFilter) {
      setRows([]);
      setResult(null);
      setError(null);
      return;
    }
    const t = setTimeout(() => {
      void runSearch();
    }, 350);
    return () => clearTimeout(t);
  }, [open, hasAnyFilter, brandId, partGroupId, keyword, partNo, includeInactive, runSearch]);

  // 全鍵盤：Esc 關、↑↓ 切結果、Enter 立即搜
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        if (rows.length === 0) return;
        e.preventDefault();
        setFocusedIndex((i) => Math.min(rows.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        if (rows.length === 0) return;
        e.preventDefault();
        setFocusedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        const tag = (document.activeElement?.tagName ?? '').toLowerCase();
        // 在 input 內按 Enter：立即送出（取代 debounce）
        if (tag === 'input' || tag === 'select') {
          e.preventDefault();
          void runSearch();
        }
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [open, rows.length, runSearch, onClose]);

  // 切到 focused row 時 scroll into view
  useEffect(() => {
    if (!open) return;
    document.querySelector(`[data-pqs-row="${focusedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, open]);

  if (!open) return null;

  const selected = rows[focusedIndex];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-[min(1180px,96vw)] flex-col rounded-2xl border border-[#2A2A30] bg-[#0F0F12] shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
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
            onClick={onClose}
            className="ml-2 rounded-md border border-[#2A2A30] bg-[#1A1A1F] p-1 text-[#888892] transition hover:bg-[#22222A] hover:text-[#E8E8EB]"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* 篩選列 */}
        <div className="grid grid-cols-1 gap-2 border-b border-[#2A2A30] bg-[#13131A] px-5 py-3 sm:grid-cols-4">
          <FilterSelect
            label="廠牌"
            value={brandId}
            onChange={setBrandId}
            options={brands.map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` }))}
          />
          <FilterInput
            label="品名 / 注音聲母"
            value={keyword}
            onChange={setKeyword}
            placeholder="例：火星塞、ㄏㄒㄙ"
            inputRef={keywordInputRef}
          />
          <FilterSelect
            label="零件族群"
            value={partGroupId}
            onChange={setPartGroupId}
            options={partGroups.map((g) => ({ value: g.id, label: `${g.code} · ${g.name}` }))}
          />
          <FilterInput
            label="使用料號"
            value={partNo}
            onChange={setPartNo}
            placeholder="例：03L-100-091 / 03L 100 091"
          />
        </div>

        {/* 主結果區 + 明細區 split */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
          {/* 左：主結果列表 */}
          <div className="flex min-h-0 flex-col border-b border-[#2A2A30] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-[#2A2A30] bg-[#0A0A0C]/60 px-4 py-1.5 text-[11px] text-[#888892]">
              <span>
                {loading ? (
                  <span className="inline-flex items-center gap-1.5 text-[#E8A020]">
                    <Loader2 className="size-3 animate-spin" /> 搜尋中…
                  </span>
                ) : result ? (
                  <>
                    主結果{' '}
                    <span className="font-mono text-[#E8A020]">
                      {result.total.toLocaleString()}
                    </span>{' '}
                    筆
                    {result.limitReached ? (
                      <span className="ml-1 text-[#E26060]">
                        （已達上限 {HARD_LIMIT}、請加條件再縮小）
                      </span>
                    ) : null}
                  </>
                ) : (
                  '輸入任一篩選條件開始搜尋'
                )}
              </span>
              <span className="font-mono text-[10px] text-[#5A5A60]">↑↓ 切換</span>
            </div>

            {error ? (
              <div className="m-4 flex items-start gap-2 rounded-md border border-[#5A2A2A] bg-[#1F1212] px-3 py-2 text-xs text-[#E26060]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span className="min-w-0 flex-1">{error}</span>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto">
              {rows.length === 0 && !loading && !error ? (
                <div className="flex h-full items-center justify-center px-6 py-10 text-center text-xs text-[#5A5A60]">
                  <div>
                    <Search className="mx-auto mb-2 size-6 text-[#3A3A42]" />
                    輸入廠牌 / 品名 / 族群 / 料號任一條件即可開始搜尋
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
                          'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
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
          </div>

          {/* 右：明細區（階段 3-4 接基本+庫存+三 tab）*/}
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
                  <div className="mt-1 text-[10px] text-[#3A3A42]">階段 3-5 接入</div>
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
          <span>F2 開關 · ↑↓ 切換 · Enter 立即搜 · Esc 關閉</span>
          <span className="font-mono text-[#3A3A42]">NEXORA · Part Quick Search</span>
        </div>
      </div>
    </div>
  );
}

/** 篩選欄共用：label + dropdown */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-[#2A2A30] bg-[#0F0F12] px-2 text-xs text-[#E8E8EB] outline-none transition focus:border-[#E8A020]/60"
      >
        <option value="">ALL（不篩選）</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 篩選欄共用：label + input */
function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">{label}</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 rounded-md border border-[#2A2A30] bg-[#0F0F12] px-2 text-xs text-[#E8E8EB] outline-none placeholder:text-[#5A5A60] transition focus:border-[#E8A020]/60"
      />
    </label>
  );
}

/**
 * 撈零件族群清單（一次性 cache）。
 * 既有 /nx01/part-groups endpoint 沒專屬 client、用 apiFetch 直接撈。
 */
async function fetchPartGroups(): Promise<PartGroupOpt[]> {
  try {
    const res = await apiFetch('/nx01/part-groups?isActive=true&pageSize=100', { method: 'GET' });
    if (!res.ok) return [];
    const json = (await res.json()) as { rows?: Array<{ id: string; code: string; name: string }> };
    return (json.rows ?? []).map((g) => ({ id: g.id, code: g.code, name: g.name }));
  } catch {
    return [];
  }
}
