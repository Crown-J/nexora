// apps/nx-ui/src/features/master-shell/ui/ErpToolbar.tsx
/**
 * NEXORA Master Shell — ErpToolbar 家族
 *
 * 跨主檔 / 單據 / 模組共用工作列（執行長範式、未來會被單據頁大量重用）。
 *
 * 三分支（依模式切換按鈕集）：
 *  - browse（瀏覽）執行長範式 v2 2026-06-18:
 *    ⏮ ◀ {N/M 項目數字} ▶ ⏭ | A 新增 E 編輯 D 刪除 | F 查詢 R 重整 | P 列印 O 匯出 | I 欄位
 *  - edit（編輯/新增）：S 儲存 / C 取消
 *  - selection（選取批次）：完成選取 / 批次啟用 / 批次停用
 *
 * 項目級導航 vs 頁級導航：
 *   舊範式（page/totalPages/onPageChange）= 頁切換
 *   新範式（itemIndex/itemTotal/onJump*Item/onPrevItem/onNextItem）= 詳細頁項目切換
 *   兩套並存（向後相容）、優先新範式、未提供新 props 才用舊 page-level
 *
 * NEXORA 軟刪除：onDelete 內部名稱保留、UI label = 停用（isActive=false）。
 *
 * 子元件：
 *  - ToolbarButton（letter chip + icon + label + 三變體 default/danger/accent）
 *  - NavButton（icon-only 方形、項目級/頁級導航共用）
 *  - ExportMenuButton（dropdown：CSV / PDF / 列印）
 *  - ToolbarSeparator（垂直分隔線）
 */
'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import {
  SortMenuButton,
  type SortableOption,
  type SortOrder,
} from '@/features/nx01/shell/ui/sort-config/SortMenuButton';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@design/primitives/dropdown-menu';
import { cn } from '@design/utils/cn';
// 情境工具列：投影到外殼第 2 層插槽（執行長 2026-06-28 六層介面）
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';

import type { ExportFormat } from '@/features/nx01/shell/hooks/useExportTable';

export type ErpMode = 'browse' | 'edit';

// ExportFormat 真相來源：useExportTable hook（[2-1] 2026-06-06 統一、本檔 re-export 保向後相容）
export type { ExportFormat };

export function ErpToolbar({
  mode,
  hasActiveRow,
  selectedRowActive,
  selectedRowBuiltin,
  selectionMode,
  onToggleSelection,
  selectedCount,
  // 舊 page-level nav（向後相容、其他 7 主檔頁仍用）
  page,
  totalPages,
  onPageChange,
  // 新 item-level nav（執行長範式 2026-06-18、優先用）
  itemIndex,
  itemTotal,
  onJumpFirstItem,
  onPrevItem,
  onNextItem,
  onJumpLastItem,
  onCreate,
  onEdit,
  onSearch,
  onDelete,
  onExport,
  onPrint,
  exportMenuOpen,
  onExportMenuOpenChange,
  onExportMenuCloseAutoFocus,
  onRefresh,
  // M 排序 dropdown:options + 受控狀態 + change/reset
  sortOptions,
  sortKey,
  sortOrder = 'asc',
  onSortChange,
  onSortReset,
  sortMenuOpen,
  onSortMenuOpenChange,
  onSortMenuCloseAutoFocus,
  onSave,
  onCancel,
  showInactive,
  onShowInactiveChange,
  onBatchEnable,
  onBatchDisable,
  onOpenColumns,
  onOpenFilter,
  columnsHiddenCount = 0,
  filterCount = 0,
  hideMutations = false,
}: {
  mode: ErpMode;
  hasActiveRow: boolean;
  /** 當前選列的 isActive 狀態。true → D 按鈕為「停用」（danger）；false → 「啟用」（default）。 */
  selectedRowActive?: boolean;
  /** 當前選列 isBuiltin → D 按鈕鎖、不可停用。 */
  selectedRowBuiltin?: boolean;
  selectionMode: boolean;
  onToggleSelection: () => void;
  selectedCount: number;
  // ── 舊 page-level navigation（向後相容、未提供 item-level 時 fallback）──
  page?: number;
  totalPages?: number;
  onPageChange?: (next: number) => void;
  // ── 新 item-level navigation（執行長 2026-06-18 範式、優先用）──
  /** 當前項目 1-based index（0 = 未選） */
  itemIndex?: number;
  /** 全部項目總數 */
  itemTotal?: number;
  /** ⏮ 跳到第一項 */
  onJumpFirstItem?: () => void;
  /** ◀ 上一項 */
  onPrevItem?: () => void;
  /** ▶ 下一項 */
  onNextItem?: () => void;
  /** ⏭ 跳到最後一項 */
  onJumpLastItem?: () => void;
  onCreate: () => void;
  onEdit: () => void;
  onSearch: () => void;
  onDelete: () => void;
  /** O 匯出 dropdown（CSV/PDF/列印）*/
  onExport: (format: ExportFormat) => void;
  /** P 純列印（執行長範式：P=列印 / O=匯出 dropdown）；未提供時走 onExport('print') */
  onPrint?: () => void;
  /** O 匯出 dropdown 受控 open 狀態（Alt+O 用：父層 setOpen(true) 即可程式打開）*/
  exportMenuOpen?: boolean;
  onExportMenuOpenChange?: (open: boolean) => void;
  /** dropdown 關閉時的 focus restore：Radix 預設還給 trigger（O 按鈕）、
   *  caller 提供時可 preventDefault 並手動 focus 別處（例：回 row）*/
  onExportMenuCloseAutoFocus?: (e: Event) => void;
  onRefresh: () => void;
  // ── M 排序 dropdown menu（2026-06-18 執行長範式、取代 dialog）──
  /** 可排序欄位 metadata；未提供時整個 M 按鈕不渲染 */
  sortOptions?: SortableOption[];
  sortKey?: string | null;
  sortOrder?: SortOrder;
  onSortChange?: (key: string | null, order: SortOrder) => void;
  onSortReset?: () => void;
  /** 受控 open（Alt+M 程式觸發） */
  sortMenuOpen?: boolean;
  onSortMenuOpenChange?: (open: boolean) => void;
  /** Radix 關閉時 focus restore hook（preventDefault + 手動 focus row）*/
  onSortMenuCloseAutoFocus?: (e: Event) => void;
  onSave: () => void;
  onCancel: () => void;
  showInactive?: boolean;
  onShowInactiveChange?: (next: boolean) => void;
  onBatchEnable?: () => void;
  onBatchDisable?: () => void;
  /** 欄位設定（Alt+I）；提供時顯示「欄位」按鈕 */
  onOpenColumns?: () => void;
  /** 篩選（Alt+T）；提供時顯示「篩選」按鈕 */
  onOpenFilter?: () => void;
  columnsHiddenCount?: number;
  filterCount?: number;
  /** 純紀錄/日誌頁：隱藏 新增/編輯/刪除（A/E/D）；只留導航+查詢+重整+匯出 */
  hideMutations?: boolean;
}) {
  // 2026-06-18 執行長範式:D 按鈕 label 改「刪除」（實際軟刪除 isActive=false）/ 「啟用」
  //   選中啟用列 → 「刪除」（danger / Trash2）
  //   選中停用列 → 「啟用」（default / Power）
  const rowIsActive = selectedRowActive ?? true;
  const disableButtonLabel = rowIsActive ? '刪除' : '啟用';
  const DisableButtonIcon = rowIsActive ? Trash2 : Power;
  const disableButtonVariant: 'default' | 'danger' = rowIsActive ? 'danger' : 'default';
  // 手機「更多」sheet 開關（瀏覽模式 L3 精簡工具列用）
  const [moreOpen, setMoreOpen] = useState(false);
  if (selectionMode) {
    const hasChecked = selectedCount > 0;
    return (
      <ToolbarPortal>
      <div className="flex items-center gap-1 border-b border-[var(--primary)]/30 bg-gradient-to-r from-[var(--primary)]/6 to-[var(--primary)]/3 px-3 py-1.5">
        <ToolbarButton icon={Check} label="完成選取" enabled onClick={onToggleSelection} accent />
        <ToolbarSeparator />
        <span className="px-1 text-[14px] text-muted-foreground">
          已選 <span className="font-mono text-[var(--primary)]">{selectedCount}</span> 筆
        </span>
        <div className="flex-1" />
        <ToolbarButton
          icon={Power}
          label="批次啟用"
          enabled={hasChecked && !!onBatchEnable}
          onClick={onBatchEnable}
        />
        <ToolbarButton
          icon={Trash2}
          label="批次刪除"
          enabled={hasChecked && !!onBatchDisable}
          variant="danger"
          onClick={onBatchDisable}
        />
      </div>
      </ToolbarPortal>
    );
  }

  if (mode === 'edit') {
    return (
      <ToolbarPortal>
      <div className="flex items-center gap-1 border-b border-[var(--primary)]/30 bg-gradient-to-r from-[var(--primary)]/6 to-[var(--primary)]/3 px-3 py-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--primary)]/40 bg-[var(--primary)]/12 px-2 py-0.5 text-[13px] font-medium text-[var(--primary)]">
          <Pencil className="size-4" />
          編輯中
        </span>
        <ToolbarSeparator />
        <ToolbarButton icon={Save} letter="S" label="存檔" enabled onClick={onSave} accent />
        <ToolbarButton icon={X} letter="C" label="取消" enabled onClick={onCancel} />
        <div className="flex-1" />
        <span className="px-1 text-[14px] text-muted-foreground">
          編輯模式 · Alt+S 存檔 / Alt+C 取消
        </span>
      </div>
      </ToolbarPortal>
    );
  }

  // 決定導航範式：優先 item-level（執行長 2026-06-18 範式）、fallback 舊 page-level
  const useItemNav = itemTotal !== undefined && itemIndex !== undefined;
  const navIndex = useItemNav ? itemIndex! : (page ?? 0);
  const navTotal = useItemNav ? itemTotal! : (totalPages ?? 0);
  const navFirstDisabled = useItemNav ? navIndex <= 1 : navIndex <= 1;
  const navLastDisabled = useItemNav ? navIndex >= navTotal || navTotal === 0 : navIndex >= navTotal;
  const handleFirst = useItemNav
    ? onJumpFirstItem
    : page !== undefined && onPageChange
      ? () => onPageChange(1)
      : undefined;
  const handlePrev = useItemNav
    ? onPrevItem
    : page !== undefined && onPageChange
      ? () => onPageChange(page - 1)
      : undefined;
  const handleNext = useItemNav
    ? onNextItem
    : page !== undefined && onPageChange
      ? () => onPageChange(page + 1)
      : undefined;
  const handleLast = useItemNav
    ? onJumpLastItem
    : page !== undefined && onPageChange && totalPages !== undefined
      ? () => onPageChange(totalPages)
      : undefined;
  const navLabel = useItemNav ? '項目' : '頁';

  return (
    <ToolbarPortal>
    <div
      data-nx-frame
      className="hidden items-center gap-1 border-b border-border/40 px-3 py-2 md:flex"
      style={{
        // 2026-06-18 token 化:dark 用 var(--secondary)→var(--secondary)、light 用深橘 #c8550f→#a8430a
        backgroundImage:
          'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
      }}
    >
      <NavButton icon={ChevronsLeft} disabled={navFirstDisabled} onClick={handleFirst} title={`第一${navLabel}`} />
      <NavButton icon={ChevronLeft} disabled={navFirstDisabled} onClick={handlePrev} title={`上一${navLabel}`} />
      <span className="min-w-[3.5rem] px-1 text-center font-mono text-[14px] tabular-nums text-muted-foreground">
        {navIndex} / {navTotal}
      </span>
      <NavButton icon={ChevronRight} disabled={navLastDisabled} onClick={handleNext} title={`下一${navLabel}`} />
      <NavButton icon={ChevronsRight} disabled={navLastDisabled} onClick={handleLast} title={`最末${navLabel}`} />
      {hideMutations ? null : (
        <>
          <ToolbarSeparator />
          <ToolbarButton icon={Plus} letter="A" label="新增" enabled onClick={onCreate} />
          <ToolbarButton icon={Pencil} letter="E" label="編輯" enabled={hasActiveRow} onClick={onEdit} />
          <ToolbarButton
            icon={DisableButtonIcon}
            letter="D"
            label={selectedRowBuiltin ? '內建鎖定' : disableButtonLabel}
            enabled={hasActiveRow && !selectedRowBuiltin}
            variant={selectedRowBuiltin ? 'default' : disableButtonVariant}
            onClick={onDelete}
          />
        </>
      )}
      <ToolbarSeparator />
      <ToolbarButton icon={Search} letter="F" label="查詢" enabled onClick={onSearch} />
      {sortOptions && onSortChange && onSortReset ? (
        <SortMenuButton
          options={sortOptions}
          sortKey={sortKey ?? null}
          sortOrder={sortOrder}
          onChange={onSortChange}
          onReset={onSortReset}
          open={sortMenuOpen}
          onOpenChange={onSortMenuOpenChange}
          onCloseAutoFocus={onSortMenuCloseAutoFocus}
        />
      ) : null}
      <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={onRefresh} />
      <ToolbarSeparator />
      <ToolbarButton
        icon={Printer}
        letter="P"
        label="列印"
        enabled
        onClick={() => (onPrint ? onPrint() : onExport('print'))}
      />
      <ExportMenuButton
        onSelect={onExport}
        open={exportMenuOpen}
        onOpenChange={onExportMenuOpenChange}
        onCloseAutoFocus={onExportMenuCloseAutoFocus}
      />
      {onOpenColumns ? <ToolbarSeparator /> : null}
      {/* 2026-06-18 執行長 B 方案:表頭可拖、I 欄位 dialog 退役、只在 caller 提供 onOpenColumns 時才渲染 I 按鈕 */}
      {onOpenColumns ? (
        <ToolbarButton
          icon={Columns3}
          letter="I"
          label={columnsHiddenCount > 0 ? `欄位·隱${columnsHiddenCount}` : '欄位'}
          enabled
          onClick={onOpenColumns}
          pressed={columnsHiddenCount > 0}
        />
      ) : null}
      {/* 2026-06-18 執行長範式:I 欄位右側「T 垃圾桶」= 顯示已停用列、給 user 再啟用 */}
      {onShowInactiveChange ? (
        <ToolbarButton
          icon={Trash2}
          letter="T"
          label="垃圾桶"
          enabled
          onClick={() => onShowInactiveChange(!showInactive)}
          pressed={showInactive}
        />
      ) : null}
      {onOpenFilter ? (
        <ToolbarButton
          icon={Filter}
          label={filterCount > 0 ? `篩選·${filterCount}` : '篩選'}
          enabled
          onClick={onOpenFilter}
          pressed={filterCount > 0}
        />
      ) : null}
      <div className="flex-1" />
    </div>

    {/* ── 手機：精簡工具列（查詢/重整/編輯/刪除 + 更多）── */}
    <div
      data-nx-frame
      className="flex items-center gap-1 border-b border-border/40 px-3 py-2 md:hidden"
      style={{
        backgroundImage: 'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
      }}
    >
      <ToolbarButton icon={Search} letter="F" label="查詢" enabled onClick={onSearch} />
      <ToolbarButton icon={RefreshCcw} letter="R" label="重整" enabled onClick={onRefresh} />
      {hideMutations ? null : (
        <>
          <ToolbarButton icon={Pencil} letter="E" label="編輯" enabled={hasActiveRow} onClick={onEdit} />
          <ToolbarButton
            icon={DisableButtonIcon}
            letter="D"
            label={selectedRowBuiltin ? '鎖' : disableButtonLabel}
            enabled={hasActiveRow && !selectedRowBuiltin}
            variant={selectedRowBuiltin ? 'default' : disableButtonVariant}
            onClick={onDelete}
          />
        </>
      )}
      <div className="flex-1" />
      <ToolbarButton icon={MoreHorizontal} label="更多" enabled onClick={() => setMoreOpen(true)} />
    </div>

    {moreOpen ? (
      <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setMoreOpen(false)}>
        <div className="absolute inset-0 bg-black/50" />
        <div
          className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-card p-2 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-sm font-bold text-foreground">更多操作</div>
          {onOpenFilter ? (
            <MoreRow icon={Filter} label={filterCount > 0 ? `篩選 · ${filterCount}` : '篩選'} onClick={() => { onOpenFilter(); setMoreOpen(false); }} />
          ) : null}
          {sortOptions && onSortChange ? (
            <>
              <div className="border-t border-border/40 px-3 pt-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">排序</div>
              {sortOptions.map((o) => {
                const active = sortKey === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => { onSortChange(o.key, active && sortOrder === 'asc' ? 'desc' : 'asc'); setMoreOpen(false); }}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[14px] text-foreground hover:bg-accent/10"
                  >
                    <span>依 {o.label}</span>
                    {active ? <span className="text-[14px] text-primary">{sortOrder === 'asc' ? '↑ 升冪' : '↓ 降冪'}</span> : null}
                  </button>
                );
              })}
            </>
          ) : null}
          <div className="my-1 border-t border-border/40" />
          <MoreRow icon={Download} label="匯出 CSV" onClick={() => { onExport('csv'); setMoreOpen(false); }} />
          <MoreRow icon={FileText} label="匯出 PDF" onClick={() => { onExport('pdf'); setMoreOpen(false); }} />
          <MoreRow icon={Printer} label="列印" onClick={() => { if (onPrint) onPrint(); else onExport('print'); setMoreOpen(false); }} />
          {onOpenColumns ? (
            <MoreRow icon={Columns3} label={columnsHiddenCount > 0 ? `欄位 · 隱${columnsHiddenCount}` : '欄位'} onClick={() => { onOpenColumns(); setMoreOpen(false); }} />
          ) : null}
          {onShowInactiveChange ? (
            <MoreRow icon={Trash2} label={showInactive ? '隱藏停用' : '顯示停用（垃圾桶）'} onClick={() => { onShowInactiveChange(!showInactive); setMoreOpen(false); }} />
          ) : null}
          <button type="button" onClick={() => setMoreOpen(false)} className="mt-1 w-full rounded-lg border border-border/50 px-3 py-3 text-[14px] text-muted-foreground">
            關閉
          </button>
        </div>
      </div>
    ) : null}
    </ToolbarPortal>
  );
}

function MoreRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-3 text-left text-[14px] text-foreground hover:bg-accent/10"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </button>
  );
}

export function ToolbarSeparator() {
  return <div className="mx-1 h-5 w-px bg-border/60" aria-hidden />;
}

/** alias 保留向後相容（其他檔可能 import PaginationButton） */
export const PaginationButton = NavButton;

export function NavButton({
  icon: Icon,
  disabled,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  onClick?: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        // v3.0.0 階段 4：28px 方鈕 → 36px，跟主按鈕同高才不會參差
        'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-all',
        disabled
          ? 'cursor-not-allowed border-border/30 bg-muted/30 text-muted-foreground/50'
          : 'border-border/50 bg-card text-foreground/80 hover:border-border hover:bg-accent/15 hover:text-foreground',
      )}
    >
      <Icon className="size-4.5" />
    </button>
  );
}

export function ToolbarButton({
  icon: Icon,
  letter,
  label,
  enabled,
  variant = 'default',
  onClick,
  accent,
  pressed,
}: {
  icon: React.ComponentType<{ className?: string }>;
  letter?: string;
  label: string;
  enabled: boolean;
  variant?: 'default' | 'danger';
  onClick?: () => void;
  /** call-to-action 變體（如 S 存檔、完成選取）— 永久琥珀填色 */
  accent?: boolean;
  /** toggle 已開啟（如顯示停用）— 琥珀邊框 + 琥珀字 + 微淡底（與 accent 視覺接近但語意是 on/off 狀態）*/
  pressed?: boolean;
}) {
  // pressed 與 accent 視覺接近（皆 primary amber/orange 調）、語意上 pressed = toggle on
  const isAmberActive = enabled && (accent || pressed);
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      title={letter ? `${label}（${letter}）` : label}
      aria-pressed={pressed}
      className={cn(
        // v3.0.0 階段 4：11px → 15px、h-7(28px) → h-9(36px)。
        // 這是工具列的主按鈕（新增／編輯／刪除…），25 個頁面共用。
        // 11px 對年長使用者近乎讀不到，按鈕也太小不好點（規格 §6）。
        'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[15px] font-medium transition-all',
        enabled
          ? variant === 'danger'
            ? 'border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive/60 hover:bg-destructive/20'
            : isAmberActive
              ? 'border-primary/50 bg-primary/15 text-primary hover:bg-primary/25'
              : 'border-border/50 bg-card text-foreground/80 hover:border-border hover:bg-accent/15 hover:text-foreground'
          : 'cursor-not-allowed border-border/30 bg-muted/30 text-muted-foreground/50',
      )}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">
        {letter ? (
          <span
            className={cn(
              'mr-0.5 font-mono',
              enabled && variant !== 'danger' && !isAmberActive && 'text-primary',
            )}
          >
            {letter}
          </span>
        ) : null}
        {label}
      </span>
    </button>
  );
}

export function ExportMenuButton({
  onSelect,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  onSelect: (format: ExportFormat) => void;
  /** 受控 open（Alt+O 程式觸發） */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Radix 關閉時 focus restore hook、未提供時走預設（focus 回 trigger） */
  onCloseAutoFocus?: (e: Event) => void;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="匯出（O）"
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md border border-border/50 bg-card px-3 text-[15px] font-medium text-foreground/80 transition-all hover:border-border hover:bg-accent/15 hover:text-foreground',
            'data-[state=open]:border-primary/50 data-[state=open]:bg-primary/15 data-[state=open]:text-primary',
          )}
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">
            <span className="mr-0.5 font-mono text-primary">O</span>
            匯出
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        onCloseAutoFocus={onCloseAutoFocus}
        className="min-w-[10rem] border-border/40 bg-popover/95 p-1 shadow-2xl backdrop-blur-xl"
      >
        {/* 2026-06-18 執行長範式:O 匯出只 CSV / PDF、列印走獨立 P 按鈕 */}
        <DropdownMenuItem
          onClick={() => onSelect('csv')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground focus:bg-primary/15 focus:text-primary data-[highlighted]:bg-primary/15 data-[highlighted]:text-primary"
        >
          <FileSpreadsheet className="mr-2 size-4.5" />
          匯出 CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect('pdf')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground focus:bg-primary/15 focus:text-primary data-[highlighted]:bg-primary/15 data-[highlighted]:text-primary"
        >
          <FileText className="mr-2 size-4.5" />
          匯出 PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
