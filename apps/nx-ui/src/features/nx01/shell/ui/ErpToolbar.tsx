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
  ArrowUpDown,
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@design/primitives/dropdown-menu';
import { cn } from '@design/utils/cn';

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
  onRefresh,
  onOpenSort,
  sortCount = 0,
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
  onRefresh: () => void;
  /** M 排序設定（執行長 2026-06-18 範式）；未提供時 disabled */
  onOpenSort?: () => void;
  /** 已套用排序欄位數（>0 時按鈕高亮 + badge） */
  sortCount?: number;
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
}) {
  // 2026-06-18 執行長範式:D 按鈕 label 改「刪除」（實際軟刪除 isActive=false）/ 「啟用」
  //   選中啟用列 → 「刪除」（danger / Trash2）
  //   選中停用列 → 「啟用」（default / Power）
  const rowIsActive = selectedRowActive ?? true;
  const disableButtonLabel = rowIsActive ? '刪除' : '啟用';
  const DisableButtonIcon = rowIsActive ? Trash2 : Power;
  const disableButtonVariant: 'default' | 'danger' = rowIsActive ? 'danger' : 'default';
  if (selectionMode) {
    const hasChecked = selectedCount > 0;
    return (
      <div className="flex items-center gap-1 border-b border-[#E8A020]/30 bg-gradient-to-r from-[#E8A020]/6 to-[#E8A020]/3 px-3 py-1.5">
        <ToolbarButton icon={Check} label="完成選取" enabled onClick={onToggleSelection} accent />
        <ToolbarSeparator />
        <span className="px-1 text-[11px] text-muted-foreground">
          已選 <span className="font-mono text-[#E8A020]">{selectedCount}</span> 筆
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
    );
  }

  if (mode === 'edit') {
    return (
      <div className="flex items-center gap-1 border-b border-[#E8A020]/30 bg-gradient-to-r from-[#E8A020]/6 to-[#E8A020]/3 px-3 py-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2 py-0.5 text-[11px] font-medium text-[#E8A020]">
          <Pencil className="size-3" />
          編輯中
        </span>
        <ToolbarSeparator />
        <ToolbarButton icon={Save} letter="S" label="存檔" enabled onClick={onSave} accent />
        <ToolbarButton icon={X} letter="C" label="取消" enabled onClick={onCancel} />
        <div className="flex-1" />
        <span className="px-1 text-[11px] text-muted-foreground">
          編輯模式 · Alt+S 存檔 / Alt+C 取消
        </span>
      </div>
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
    <div
      className="flex items-center gap-1 border-b border-border/40 px-3 py-2"
      style={{
        backgroundImage: 'linear-gradient(180deg, #16161B 0%, #101014 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 #000000',
      }}
    >
      <NavButton icon={ChevronsLeft} disabled={navFirstDisabled} onClick={handleFirst} title={`第一${navLabel}`} />
      <NavButton icon={ChevronLeft} disabled={navFirstDisabled} onClick={handlePrev} title={`上一${navLabel}`} />
      <span className="min-w-[3rem] px-1 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
        {navIndex} / {navTotal}
      </span>
      <NavButton icon={ChevronRight} disabled={navLastDisabled} onClick={handleNext} title={`下一${navLabel}`} />
      <NavButton icon={ChevronsRight} disabled={navLastDisabled} onClick={handleLast} title={`最末${navLabel}`} />
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
      <ToolbarSeparator />
      <ToolbarButton icon={Search} letter="F" label="查詢" enabled onClick={onSearch} />
      <ToolbarButton
        icon={ArrowUpDown}
        letter="M"
        label={sortCount > 0 ? `排序·${sortCount}` : '排序'}
        enabled={!!onOpenSort}
        onClick={onOpenSort}
        pressed={sortCount > 0}
      />
      <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={onRefresh} />
      <ToolbarSeparator />
      <ToolbarButton
        icon={Printer}
        letter="P"
        label="列印"
        enabled
        onClick={() => (onPrint ? onPrint() : onExport('print'))}
      />
      <ExportMenuButton onSelect={onExport} />
      <ToolbarSeparator />
      <ToolbarButton
        icon={Columns3}
        letter="I"
        label={columnsHiddenCount > 0 ? `欄位·隱${columnsHiddenCount}` : '欄位'}
        enabled={!!onOpenColumns}
        onClick={onOpenColumns}
        pressed={columnsHiddenCount > 0}
      />
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
  );
}

export function ToolbarSeparator() {
  return <div className="mx-1 h-5 w-px bg-[#2A2A30]" aria-hidden />;
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
        'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all',
        disabled
          ? 'cursor-not-allowed border-border/40/60 bg-popover text-muted-foreground/70'
          : 'border-border/40 bg-card/60 text-foreground/80 hover:border-[#3A3A42] hover:bg-card/80 hover:text-foreground',
      )}
    >
      <Icon className="size-3.5" />
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
  // pressed 與 accent 視覺接近（皆琥珀調），語意上 pressed = toggle on
  const isAmberActive = enabled && (accent || pressed);
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      title={letter ? `${label}（${letter}）` : label}
      aria-pressed={pressed}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-all',
        enabled
          ? variant === 'danger'
            ? 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]'
            : isAmberActive
              ? 'border-[#E8A020]/40 bg-[#E8A020]/12 text-[#E8A020] hover:bg-[#E8A020]/20'
              : 'border-border/40 bg-card/60 text-foreground/80 hover:border-[#3A3A42] hover:bg-card/80 hover:text-foreground'
          : 'cursor-not-allowed border-border/40/60 bg-popover text-muted-foreground/70',
      )}
    >
      <Icon className="size-3" />
      <span className="hidden sm:inline">
        {letter ? (
          <span className={cn('mr-0.5 font-mono', enabled && variant !== 'danger' && !isAmberActive && 'text-[#E8A020]')}>{letter}</span>
        ) : null}
        {label}
      </span>
    </button>
  );
}

export function ExportMenuButton({ onSelect }: { onSelect: (format: ExportFormat) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="匯出（P）"
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-md border border-border/40 bg-card/60 px-2 text-[11px] font-medium text-foreground/80 transition-all hover:border-[#3A3A42] hover:bg-card/80 hover:text-foreground',
            'data-[state=open]:border-[#E8A020]/40 data-[state=open]:bg-[#E8A020]/10 data-[state=open]:text-[#E8A020]',
          )}
        >
          <Download className="size-3" />
          <span className="hidden sm:inline">
            <span className="mr-0.5 font-mono text-[#E8A020]">P</span>
            匯出
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="min-w-[10rem] border-border/40 bg-popover/95 p-1 shadow-2xl backdrop-blur-xl"
      >
        <DropdownMenuItem
          onClick={() => onSelect('csv')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]"
        >
          <FileSpreadsheet className="mr-2 size-3.5" />
          匯出 CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect('pdf')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]"
        >
          <FileText className="mr-2 size-3.5" />
          匯出 PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect('print')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]"
        >
          <Printer className="mr-2 size-3.5" />
          列印
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
