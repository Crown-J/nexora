// apps/nx-ui/src/design/components/quick-search/PartMainWindow.tsx
// 料號即時搜尋 視窗 2：主視窗（執行長 2026-06-25 任務單）
//
// 三欄式：左基本資料 / 中庫存狀態 / 右通用零件
//
// 核心連動（視窗 2 靈魂）：
//   · Enter（右欄）= 預覽：左中切到該件資料、但主件保留置頂高亮（供比完切回）
//   · Alt+F（右欄）= 跳搜：以該件為新主件重來、原主件不保留
//   · Esc = 關視窗 2 → 退回搜尋窗（保留搜尋窗 state）
//   · Space = 放大零件圖
//
// 焦點地基：FocusLockedDialog 包殼、modal-stack 自動隔離背景。
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Package,
  Warehouse,
  X,
} from 'lucide-react';

import {
  buildPartSearchPhotoUrl,
  getPartCompatGroup,
  getPartDetail,
  getPartStockSummary,
  listPartSearchPhotos,
  type PartPhotoMeta,
} from '@data/endpoints/nx01/part-search/api/part-search';
import type {
  PartCompatGroupDto,
  PartCompatMemberDto,
  PartDetailDto,
  PartStockSummaryDto,
} from '@data/types/nx01/part-search';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';
import { FocusZone } from '@design/primitives/focus-zone';
import { cn } from '@design/utils/cn';

type Props = {
  partId: string;
  /** 關閉主視窗、退回搜尋窗 */
  onBack: () => void;
  /** 整個關閉（搜尋窗也關）*/
  onClose: () => void;
};

// 執行長 2026-06-25 拍板的庫存四指標配色（KpiTile + WhTile 共用、視覺一致）
const STOCK_COLORS = {
  onHand: '#E8E8EB', // 現有 = 白
  available: '#22D88F', // 可出 = 綠
  reserved: '#E26060', // 不可出 = 紅
  inTransit: '#FFB347', // 在途 = 橘
} as const;
const ZERO_GREY = '#5A5A60'; // 0 值弱化色

export function PartMainWindow({ partId: initialPartId, onBack, onClose }: Props) {
  // 主件：Alt+F 跳搜時切換
  const [mainPartId, setMainPartId] = useState(initialPartId);
  // 預覽：Enter 暫切（null = 顯示 mainPartId 自己）
  const [previewPartId, setPreviewPartId] = useState<string | null>(null);
  const effectivePartId = previewPartId ?? mainPartId;

  // 左中欄資料（隨 effectivePartId 變）
  const [detail, setDetail] = useState<PartDetailDto | null>(null);
  const [stock, setStock] = useState<PartStockSummaryDto | null>(null);
  const [photos, setPhotos] = useState<PartPhotoMeta[]>([]);
  const [leftLoading, setLeftLoading] = useState(false);

  // 右欄資料（隨 mainPartId 變、預覽不變）
  const [compatGroup, setCompatGroup] = useState<PartCompatGroupDto | null>(null);
  const [rightLoading, setRightLoading] = useState(false);

  // 右欄列表 highlight + focused side
  const [highlightIndex, setHighlightIndex] = useState(0);
  const compatListRef = useRef<HTMLDivElement>(null);
  const compatFirstRowRef = useRef<HTMLButtonElement>(null);

  // 圖片放大
  const [photoZoom, setPhotoZoom] = useState(false);

  // race 防護
  const leftReqRef = useRef(0);
  const rightReqRef = useRef(0);

  // 載 detail / stock / photos（effectivePartId）
  useEffect(() => {
    const myReq = ++leftReqRef.current;
    setLeftLoading(true);
    void (async () => {
      try {
        const [d, s, p] = await Promise.all([
          getPartDetail(effectivePartId),
          getPartStockSummary(effectivePartId),
          listPartSearchPhotos(effectivePartId).catch(() => ({ rows: [] as PartPhotoMeta[] })),
        ]);
        if (leftReqRef.current !== myReq) return;
        setDetail(d);
        setStock(s);
        setPhotos(p.rows);
      } catch {
        if (leftReqRef.current !== myReq) return;
        setDetail(null);
        setStock(null);
        setPhotos([]);
      } finally {
        if (leftReqRef.current === myReq) setLeftLoading(false);
      }
    })();
  }, [effectivePartId]);

  // 載 compat group（mainPartId、預覽不重抓）
  useEffect(() => {
    const myReq = ++rightReqRef.current;
    setRightLoading(true);
    setHighlightIndex(0);
    void (async () => {
      try {
        const r = await getPartCompatGroup(mainPartId);
        if (rightReqRef.current !== myReq) return;
        // 取第一個 group（多 group 時、選與 mainPartId 直接相關的）
        // 規則：找含 mainPartId 為主件的 group；其次找含 mainPartId 為替代品的 group
        const firstWithMainAsPrimary = r.groups.find((g) => g.primary?.id === mainPartId);
        const firstWithMain =
          firstWithMainAsPrimary ?? r.groups.find((g) => g.alts.some((a) => a.id === mainPartId));
        setCompatGroup(firstWithMain ?? r.groups[0] ?? null);
      } catch {
        if (rightReqRef.current !== myReq) return;
        setCompatGroup(null);
      } finally {
        if (rightReqRef.current === myReq) setRightLoading(false);
      }
    })();
  }, [mainPartId]);

  // 右欄列表扁平：主件 always [0]、alts 接後
  const compatRows = useMemo<PartCompatMemberDto[]>(() => {
    if (!compatGroup) return [];
    const rows: PartCompatMemberDto[] = [];
    if (compatGroup.primary) rows.push(compatGroup.primary);
    rows.push(...compatGroup.alts);
    return rows;
  }, [compatGroup]);

  // 預覽某 row（Enter）
  const previewRow = useCallback((row: PartCompatMemberDto) => {
    setPreviewPartId(row.id === undefined ? null : row.id);
  }, []);

  // 跳搜：把 row 變新主件、清預覽（Alt+F）
  const jumpSearch = useCallback((row: PartCompatMemberDto) => {
    setMainPartId(row.id);
    setPreviewPartId(null);
    setHighlightIndex(0);
  }, []);

  // 切回主件（取消預覽）— 點主件 row 時觸發
  const clearPreview = useCallback(() => {
    setPreviewPartId(null);
  }, []);

  // 右欄動作 callbacks（row onKeyDown 與 FocusZone 容器共用）
  const compatMoveDown = useCallback(() => {
    const total = compatRows.length;
    if (total === 0) return;
    setHighlightIndex((i) => {
      const next = Math.min(total - 1, i + 1);
      focusCompatRow(next);
      return next;
    });
  }, [compatRows.length]);
  const compatMoveUp = useCallback(() => {
    if (compatRows.length === 0) return;
    setHighlightIndex((i) => {
      const next = Math.max(0, i - 1);
      focusCompatRow(next);
      return next;
    });
  }, [compatRows.length]);
  const compatEnter = useCallback(() => {
    const r = compatRows[highlightIndex];
    if (!r) return;
    if (r.id === mainPartId) clearPreview();
    else previewRow(r);
  }, [compatRows, highlightIndex, mainPartId, clearPreview, previewRow]);
  const compatJumpSearch = useCallback(() => {
    const r = compatRows[highlightIndex];
    if (r) jumpSearch(r);
  }, [compatRows, highlightIndex, jumpSearch]);
  const compatToggleZoom = useCallback(() => setPhotoZoom((z) => !z), []);

  // row button onKeyDown（focus 在 row 時走這、FocusZone scope='space-only' 不接 row 冒泡）
  const handleCompatKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (compatRows.length === 0) return;

      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        e.stopPropagation();
        compatJumpSearch();
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          compatMoveDown();
          break;
        case 'ArrowUp':
          e.preventDefault();
          compatMoveUp();
          break;
        case 'Enter':
          e.preventDefault();
          compatEnter();
          break;
        case ' ':
          e.preventDefault();
          compatToggleZoom();
          break;
      }
    },
    [
      compatRows.length,
      compatMoveDown,
      compatMoveUp,
      compatEnter,
      compatJumpSearch,
      compatToggleZoom,
    ],
  );

  // 全域 Space 放大（任何地方按、除了 input/textarea）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const tgt = e.target;
      const isEditable =
        tgt instanceof HTMLInputElement ||
        tgt instanceof HTMLTextAreaElement ||
        (tgt instanceof HTMLElement && tgt.isContentEditable);
      if (isEditable) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setPhotoZoom((z) => !z);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // 執行長 2026-06-25：開窗焦點永遠在右側通用零件、不去 Header「退回搜尋」按鈕。
  // 1. initialFocusRef={compatListRef} → mount 時先 focus FocusZone 容器（即使資料還沒載完、容器可 focus）
  // 2. compatRows 載入後 useEffect → 切到第一筆（主件）row、↑↓ 直接生效
  useEffect(() => {
    if (compatRows.length === 0) return;
    queueMicrotask(() => {
      const el = document.querySelector('[data-compat-row="0"]') as HTMLElement | null;
      el?.focus();
    });
  }, [compatRows.length, mainPartId]);

  return (
    <FocusLockedDialog
      open
      onClose={onBack} // Esc → 退回搜尋窗（不是直接關全部）
      initialFocusRef={compatListRef}
      ariaLabel="料號主視窗"
      backdropClassName="bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      dialogClassName="flex flex-col rounded-2xl border border-border/40 bg-card/85 text-foreground shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200"
      dialogStyle={{ width: 'min(1400px, 96vw)', height: 'min(820px, 94vh)' }}
    >
      <>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/40 px-6 py-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-background/40 px-2.5 py-1 text-xs text-muted-foreground hover:border-[#E8A020]/55 hover:bg-card/60 hover:text-foreground"
            title="退回搜尋窗 (Esc)"
          >
            <ArrowLeft className="size-3.5" />
            退回搜尋
          </button>
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <Package className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">料號主視窗</h2>
          {previewPartId ? (
            <span className="ml-3 rounded border border-[#5A8FB8]/60 bg-[#3B5C7A]/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#9BD0E8]">
              預覽中
            </span>
          ) : null}
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60">
            F2 · 視窗 2
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-card/60 hover:text-foreground"
            aria-label="關閉全部"
            title="關閉全部"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* 三欄 */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,1fr)_minmax(320px,1.1fr)_minmax(340px,1.2fr)]">
          {/* 左欄：基本資料 + 縮圖 */}
          <LeftColumn
            detail={detail}
            photos={photos}
            loading={leftLoading}
            previewActive={!!previewPartId}
            onZoomToggle={() => setPhotoZoom((z) => !z)}
          />

          {/* 中欄：庫存狀態 */}
          <MiddleColumn stock={stock} loading={leftLoading} />

          {/* 右欄：通用零件 */}
          <RightColumn
            group={compatGroup}
            rows={compatRows}
            mainPartId={mainPartId}
            effectivePartId={effectivePartId}
            highlightIndex={highlightIndex}
            onHover={(idx) => setHighlightIndex(idx)}
            onKeyDown={handleCompatKey}
            onClickRow={(row) => {
              if (row.id === mainPartId) clearPreview();
              else previewRow(row);
            }}
            loading={rightLoading}
            firstRowRef={compatFirstRowRef}
            listRef={compatListRef}
            zoneCallbacks={{
              onArrowDown: compatMoveDown,
              onArrowUp: compatMoveUp,
              onEnter: compatEnter,
              onSpace: compatToggleZoom,
              onAltF: compatJumpSearch,
            }}
          />
        </div>

        {/* Footer 鍵盤提示 */}
        <div className="flex items-center justify-between border-t border-border/30 bg-background/30 px-6 py-1.5 text-[10px] text-muted-foreground/55">
          <span>
            <Kbd>Tab</Kbd> 切欄 · <Kbd>↑↓</Kbd> 選通用件 · <Kbd>Enter</Kbd> 預覽（留主件）·{' '}
            <Kbd>Alt+F</Kbd> 跳搜（換主件）· <Kbd>Space</Kbd> 放大圖 · <Kbd>Esc</Kbd> 退回搜尋窗
          </span>
          <span className="font-mono text-[9px] text-muted-foreground/35">NEXORA · 視窗 2</span>
        </div>

        {/* 圖片放大 Lightbox（疊在最上層）*/}
        {photoZoom && photos.length > 0 && (
          <PhotoZoomOverlay
            partId={effectivePartId}
            photos={photos}
            onClose={() => setPhotoZoom(false)}
          />
        )}
      </>
    </FocusLockedDialog>
  );
}

function focusCompatRow(index: number) {
  const el = document.querySelector(`[data-compat-row="${index}"]`) as HTMLElement | null;
  if (!el) return;
  el.scrollIntoView({ block: 'nearest' });
  el.focus();
}

// ─── 左欄 ────────────────────────────────────────────────
function LeftColumn({
  detail,
  photos,
  loading,
  previewActive,
  onZoomToggle,
}: {
  detail: PartDetailDto | null;
  photos: PartPhotoMeta[];
  loading: boolean;
  previewActive: boolean;
  onZoomToggle: () => void;
}) {
  const v = (s: string | null | undefined) => (s && s.trim() ? s : '—');
  const mainPhoto = photos[0];

  return (
    <aside className="flex min-h-0 flex-col border-r border-border/40 bg-background/30">
      <SectionHeader icon={<Package className="size-3.5" />} label="基本資料" loading={loading} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-4">
        {/* 縮圖（Space 放大）*/}
        <button
          type="button"
          onClick={onZoomToggle}
          className={cn(
            'group relative mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden rounded-lg border-2 bg-background/40 transition-colors',
            previewActive ? 'border-[#9BD0E8]/55' : 'border-[#E8A020]/35',
            'hover:border-[#E8A020]',
          )}
          title="Space 放大"
        >
          {detail && mainPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={buildPartSearchPhotoUrl(detail.id, mainPhoto.id)}
              alt={mainPhoto.origFilename ?? detail.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground/55">
              <ImageIcon className="size-7" />
              <span className="text-[10px]">無產品圖</span>
            </div>
          )}
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded border border-border/40 bg-background/70 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/80 opacity-0 transition-opacity group-hover:opacity-100">
            Space 放大
          </span>
        </button>

        {/* 文字資料 */}
        <div className="flex flex-col gap-1.5">
          <DataRow label="基準料號" value={detail?.code ?? '—'} mono primary />
          <DataRow label="舊料號" value={v(detail?.oldCode)} mono />
          <DataRow label="副廠料號" value={v(detail?.secCode)} mono />
          <DataRow label="品名" value={detail?.name ?? '—'} />
          <DataRow
            label="廠牌"
            value={detail?.brand ? `${detail.brand.code} · ${detail.brand.name}` : '—'}
          />
          <DataRow
            label="族群"
            value={
              detail?.partGroup ? `${detail.partGroup.code} · ${detail.partGroup.name}` : '—'
            }
          />
          <DataRow
            label="正/副廠"
            value={detail ? (detail.isOem ? '正廠' : '副廠') : '—'}
            badge={detail ? (detail.isOem ? 'oem' : 'non-oem') : undefined}
          />
          <DataRow label="規格備註" value={v(detail?.spec)} />
          <DataRow
            label="狀態"
            value={detail ? (detail.isActive ? '啟用' : '停用') : '—'}
            badge={detail ? (detail.isActive ? undefined : 'inactive') : undefined}
          />
        </div>
      </div>
    </aside>
  );
}

// ─── 中欄 ────────────────────────────────────────────────
// 執行長 2026-06-25 修正單：
//   1. 表格化（表頭一行 + 每倉一列、數字欄對齊）
//   2. 表頭文字自帶顏色當圖例、數字跟欄色、不另設圖例列
//   3. 隱藏全 0 倉、底部「其他 N 倉無庫存 ▾」折疊；全倉 0 顯「各倉皆無庫存」
//   4. 視窗尺寸恆定（鐵律）：中欄分三段、各倉位分布區塊 flex-1 內部捲動、不撐大外框
function MiddleColumn({
  stock,
  loading,
}: {
  stock: PartStockSummaryDto | null;
  loading: boolean;
}) {
  const company = stock?.company;
  const warehouses = stock?.warehouses ?? [];

  // 過濾全 0 倉
  const isAllZero = (w: (typeof warehouses)[number]) =>
    Number(w.onHand) === 0 &&
    Number(w.available) === 0 &&
    Number(w.reserved) === 0 &&
    Number(w.inTransit) === 0;
  const nonZeroWh = warehouses.filter((w) => !isAllZero(w));
  const zeroWh = warehouses.filter(isAllZero);
  const [showZeros, setShowZeros] = useState(false);
  const allZero = warehouses.length > 0 && nonZeroWh.length === 0;

  return (
    <section className="flex min-h-0 flex-col border-r border-border/40 bg-background/20">
      <SectionHeader icon={<Warehouse className="size-3.5" />} label="庫存狀態" loading={loading} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-5 py-4">
        {/* 上段：公司總 4 顆 KPI（shrink-0、固定高度）*/}
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <KpiTile label="公司總庫存" value={company?.onHand} color={STOCK_COLORS.onHand} />
          <KpiTile label="可出量" value={company?.available} color={STOCK_COLORS.available} />
          <KpiTile
            label="不可出量"
            value={String(Number(company?.reserved ?? '0'))}
            color={STOCK_COLORS.reserved}
          />
          <KpiTile
            label="在進量（在途）"
            value={company?.inTransit}
            color={STOCK_COLORS.inTransit}
          />
        </div>

        {/* 下段：各倉位分布表格（flex-1 + overflow-auto、內容多時內部捲動）*/}
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
          <h4 className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            各倉位分布
          </h4>

          {warehouses.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/35 px-3 py-4 text-center text-[11px] text-muted-foreground/55">
              無倉位庫存資料
            </div>
          ) : allZero ? (
            <div className="rounded-md border border-dashed border-border/35 px-3 py-6 text-center text-[12px] text-muted-foreground/65">
              各倉皆無庫存
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/30 bg-card/40">
              {/* 表頭一行：文字自帶顏色當圖例 */}
              <div
                className="grid shrink-0 items-center border-b border-border/30 bg-background/40 px-3 py-1.5 text-[10px] uppercase tracking-wider"
                style={{ gridTemplateColumns: WH_GRID_COLS }}
              >
                <span className="text-muted-foreground/65">倉位</span>
                <span className="text-right" style={{ color: STOCK_COLORS.onHand }}>現有</span>
                <span className="text-right" style={{ color: STOCK_COLORS.available }}>可出</span>
                <span className="text-right" style={{ color: STOCK_COLORS.reserved }}>不可出</span>
                <span className="text-right" style={{ color: STOCK_COLORS.inTransit }}>在途</span>
              </div>

              {/* 內容區（內部捲動）*/}
              <div className="min-h-0 flex-1 overflow-auto">
                <ul className="flex flex-col">
                  {nonZeroWh.map((w) => (
                    <WarehouseRow key={w.warehouseId} w={w} />
                  ))}

                  {/* 隱藏空倉折疊區 */}
                  {zeroWh.length > 0 && (
                    <li className="border-t border-border/20">
                      <button
                        type="button"
                        onClick={() => setShowZeros((v) => !v)}
                        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[11px] text-muted-foreground/60 transition-colors hover:bg-card/60 hover:text-foreground"
                      >
                        {showZeros ? (
                          <ChevronDown className="size-3" />
                        ) : (
                          <ChevronRight className="size-3" />
                        )}
                        <span>
                          其他 <span className="font-mono">{zeroWh.length}</span> 倉無庫存
                        </span>
                      </button>
                      {showZeros && (
                        <ul className="border-t border-border/15 bg-background/20">
                          {zeroWh.map((w) => (
                            <WarehouseRow key={w.warehouseId} w={w} dimmed />
                          ))}
                        </ul>
                      )}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const WH_GRID_COLS = 'minmax(0, 1fr) 60px 60px 70px 60px';

function WarehouseRow({
  w,
  dimmed,
}: {
  w: PartStockSummaryDto['warehouses'][number];
  dimmed?: boolean;
}) {
  return (
    <li
      className={cn(
        'grid items-center border-b border-border/15 px-3 py-1.5 last:border-b-0',
        dimmed && 'opacity-55',
      )}
      style={{ gridTemplateColumns: WH_GRID_COLS }}
    >
      <span className="min-w-0 truncate text-[12px]">
        <span className="font-mono text-[#E8A020]">{w.warehouseCode}</span>
        <span className="ml-1.5 text-muted-foreground/85">{w.warehouseName}</span>
      </span>
      <WhCell value={w.onHand} color={STOCK_COLORS.onHand} />
      <WhCell value={w.available} color={STOCK_COLORS.available} />
      <WhCell value={w.reserved} color={STOCK_COLORS.reserved} />
      <WhCell value={w.inTransit} color={STOCK_COLORS.inTransit} />
    </li>
  );
}

function WhCell({ value, color }: { value: string; color: string }) {
  const n = Number(value);
  const isZero = n === 0;
  return (
    <span
      className="text-right font-mono text-base tabular-nums"
      style={{ color: isZero ? ZERO_GREY : color }}
    >
      {n.toFixed(0)}
    </span>
  );
}

// ─── 右欄 ────────────────────────────────────────────────
function RightColumn({
  group,
  rows,
  mainPartId,
  effectivePartId,
  highlightIndex,
  onHover,
  onKeyDown,
  onClickRow,
  loading,
  firstRowRef,
  listRef,
  zoneCallbacks,
}: {
  group: PartCompatGroupDto | null;
  rows: PartCompatMemberDto[];
  mainPartId: string;
  effectivePartId: string;
  highlightIndex: number;
  onHover: (idx: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onClickRow: (row: PartCompatMemberDto) => void;
  loading: boolean;
  firstRowRef: React.RefObject<HTMLButtonElement | null>;
  listRef: React.RefObject<HTMLDivElement | null>;
  /** 軌 2 FocusZone callbacks（容器接的方向鍵、點 row 間空白後仍 work）*/
  zoneCallbacks: {
    onArrowDown: () => void;
    onArrowUp: () => void;
    onEnter: () => void;
    onSpace: () => void;
    onAltF: () => void;
  };
}) {
  // FocusZone 容器 onKeyDown（接 Alt+F、Space 等非標準 callback 鍵）
  const handleZoneKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        e.stopPropagation();
        zoneCallbacks.onAltF();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        zoneCallbacks.onSpace();
      }
    },
    [zoneCallbacks],
  );

  return (
    <section className="flex min-h-0 flex-col bg-background/15">
      <SectionHeader
        icon={<Package className="size-3.5" />}
        label="通用零件"
        sublabel={group ? `${group.groupCode} · ${group.groupName}` : '本料件無通用件群組'}
        loading={loading}
      />
      <FocusZone
        ref={listRef}
        className="min-h-0 flex-1 overflow-auto px-3 py-3"
        onArrowDown={zoneCallbacks.onArrowDown}
        onArrowUp={zoneCallbacks.onArrowUp}
        onEnter={zoneCallbacks.onEnter}
        onKeyDown={handleZoneKey}
        role="listbox"
        ariaLabel="通用零件清單"
      >
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center px-6 text-center text-sm text-muted-foreground/60">
            <span>本料件未屬於任何通用件群組</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row, idx) => {
              const isMain = row.id === mainPartId;
              const isPreviewTarget = !isMain && row.id === effectivePartId;
              return (
                <li key={row.id}>
                  <CompatCard
                    row={row}
                    index={idx}
                    isMain={isMain}
                    isPreviewTarget={isPreviewTarget}
                    isHighlighted={idx === highlightIndex}
                    onHover={() => onHover(idx)}
                    onKeyDown={onKeyDown}
                    onClick={() => onClickRow(row)}
                    rowRef={idx === 0 ? firstRowRef : undefined}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </FocusZone>
    </section>
  );
}

function CompatCard({
  row,
  index,
  isMain,
  isPreviewTarget,
  isHighlighted,
  onHover,
  onKeyDown,
  onClick,
  rowRef,
}: {
  row: PartCompatMemberDto;
  index: number;
  isMain: boolean;
  isPreviewTarget: boolean;
  isHighlighted: boolean;
  onHover: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onClick: () => void;
  rowRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const onHand = Number(row.onHandTotal);
  const outOfStock = onHand <= 0;
  return (
    <button
      ref={rowRef}
      type="button"
      data-compat-row={index}
      onClick={onClick}
      onMouseEnter={onHover}
      onKeyDown={onKeyDown}
      className={cn(
        'relative flex w-full flex-col gap-1.5 overflow-hidden rounded-xl bg-card/60 px-4 py-3 text-left outline-none',
        'border-2 transition-[border-color,box-shadow,background-color] duration-150 ease-out',
        isMain
          ? // 主件永遠高亮
            'border-[#E8A020] bg-[#E8A020]/12 shadow-[0_0_12px_-2px_rgba(232,160,32,0.45)]'
          : isHighlighted
            ? 'border-[#E8A020] bg-[#E8A020]/12 shadow-[0_0_12px_-2px_rgba(232,160,32,0.45)]'
            : isPreviewTarget
              ? 'border-[#9BD0E8] bg-[#3B5C7A]/15'
              : 'border-border/35 bg-card/40 hover:border-[#E8A020]/55 hover:bg-card/75',
        !row.isActive && 'opacity-55',
      )}
    >
      {/* 上排：料號 + 徽章 */}
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'min-w-0 flex-1 break-all font-mono font-semibold tracking-wide',
            isMain ? 'text-lg text-[#E8A020]' : 'text-base text-[#E8A020]/85',
          )}
        >
          {row.code}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {isMain ? (
            <span className="rounded border border-[#E8A020] bg-[#E8A020]/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#E8A020]">
              主
            </span>
          ) : (
            <span className="rounded border border-[#5A8FB8]/60 bg-[#3B5C7A]/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#9BD0E8]">
              替代
            </span>
          )}
          <span
            className={cn(
              'rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
              row.isOem
                ? 'border-[#E8A020]/55 bg-[#E8A020]/12 text-[#E8A020]'
                : 'border-border/50 bg-muted/30 text-muted-foreground',
            )}
          >
            {row.isOem ? '正廠' : '副廠'}
          </span>
        </div>
      </div>

      {/* 中排：品名 */}
      <div className="break-words text-sm leading-snug text-foreground">{row.name}</div>

      {/* 下排：副廠料號 / 廠牌 / 即時庫存 */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80">
        <span className="inline-flex items-center gap-2">
          <span>
            <span className="text-muted-foreground/55">副廠料號 </span>
            <span className="font-mono text-muted-foreground">{row.secCode ?? '—'}</span>
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span>
            <span className="text-muted-foreground/55">廠牌 </span>
            <span className="text-foreground/90">{row.brandCode ?? row.brandName ?? '—'}</span>
          </span>
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px]',
            outOfStock
              ? 'border border-[#E26060]/60 bg-[#1F1212] text-[#E26060]'
              : 'text-[#22D88F]',
          )}
          title={`公司總現有量 ${row.onHandTotal}`}
        >
          <span className="text-muted-foreground/55">庫存</span>
          {row.onHandTotal}
          {outOfStock ? '（缺）' : ''}
        </span>
      </div>
    </button>
  );
}

// ─── 共用小元件 ──────────────────────────────────────────
function SectionHeader({
  icon,
  label,
  sublabel,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border/30 bg-background/20 px-5 py-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
      <span className="text-[#E8A020]">{icon}</span>
      <span>{label}</span>
      {sublabel ? (
        <span className="ml-1 normal-case tracking-normal text-muted-foreground/55">
          · {sublabel}
        </span>
      ) : null}
      {loading ? <Loader2 className="ml-auto size-3 animate-spin text-[#E8A020]" /> : null}
    </div>
  );
}

function DataRow({
  label,
  value,
  mono,
  primary,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  primary?: boolean;
  badge?: 'oem' | 'non-oem' | 'inactive';
}) {
  return (
    <div className="flex items-baseline gap-3 border-b border-border/15 pb-1 text-[12px] last:border-b-0 last:pb-0">
      <span className="w-[78px] shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/65">
        {label}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 break-words',
          mono && 'font-mono',
          primary ? 'text-[#E8A020] text-sm font-semibold' : 'text-foreground',
        )}
      >
        {value}
      </span>
      {badge === 'oem' && (
        <span className="shrink-0 rounded border border-[#E8A020]/55 bg-[#E8A020]/12 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#E8A020]">
          正廠
        </span>
      )}
      {badge === 'non-oem' && (
        <span className="shrink-0 rounded border border-border/50 bg-muted/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          副廠
        </span>
      )}
      {badge === 'inactive' && (
        <span className="shrink-0 rounded border border-[#5A2A2A] bg-[#1F1212] px-1.5 py-0.5 text-[9px] text-[#E26060]">
          停用
        </span>
      )}
    </div>
  );
}

function KpiTile({ label, value, color }: { label: string; value: string | undefined; color: string }) {
  const n = value ? Number(value) : 0;
  const isZero = n === 0;
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border/30 bg-card/50 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/65">{label}</span>
      <span className="font-mono text-lg" style={{ color: isZero ? ZERO_GREY : color }}>
        {n.toFixed(0)}
      </span>
    </div>
  );
}


function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border/40 bg-background/40 px-1 py-px font-mono text-[9px] text-muted-foreground/80">
      {children}
    </kbd>
  );
}

// ─── 圖片放大 Lightbox ────────────────────────────────────
function PhotoZoomOverlay({
  partId,
  photos,
  onClose,
}: {
  partId: string;
  photos: PartPhotoMeta[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const photo = photos[idx];
  // Esc / Space 關
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight') {
        setIdx((i) => (i + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setIdx((i) => (i - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [photos.length, onClose]);

  if (!photo) return null;
  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="零件圖片放大"
      backdropClassName="bg-black/85 animate-in fade-in duration-200"
      dialogClassName="relative flex items-center justify-center"
      dialogStyle={{ width: '90vw', height: '90vh' }}
    >
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={buildPartSearchPhotoUrl(partId, photo.id)}
          alt={photo.origFilename ?? ''}
          className="max-h-full max-w-full object-contain"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md border border-border/40 bg-background/40 p-2 text-foreground hover:bg-card/60"
          aria-label="關閉"
        >
          <X className="size-4" />
        </button>
        {photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md border border-border/40 bg-background/60 px-3 py-1 font-mono text-[10px] text-muted-foreground">
            {idx + 1} / {photos.length} · ← → 切圖 · Space / Esc 關
          </div>
        )}
      </>
    </FocusLockedDialog>
  );
}
