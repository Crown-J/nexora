// apps/nx-ui/src/features/master-shell/ui/ErpToolbar.tsx
/**
 * NEXORA Master Shell — ErpToolbar 家族
 *
 * 舊 ERP 工具列範式（鋼鐵星球視覺 + Alt 快捷鍵）。
 *
 * 三分支：
 *  - browse（瀏覽）：分頁鈕 + A 新增 / E 更正 / F 查詢 / D 停用 / 匯出 P / R 重新整理 / 選取
 *  - edit（編輯）：S 存檔 / C 取消
 *  - selection（選取批次）：完成選取 / 批次啟用 / 批次停用
 *
 * 註：[1-2] 2026-06-05 起移除「Q 結束」按鈕與 Alt+Q：導覽改走星球選單（Alt+X）、
 *     離開主檔只需切到別頁、不再需要返回左側 nav 的「結束」概念。
 *
 * NEXORA 系統設計：不能刪除資料（防止破壞已串接的關聯資料），「停用」為軟刪除（isActive=false）。
 * onDelete prop / handleDelete 內部名稱保留 delete 為通用慣例，UI label 為「停用」。
 *
 * 子元件：
 *  - ToolbarButton（letter chip + icon + label + 三變體 default/danger/accent）
 *  - PaginationButton（icon-only 方形）
 *  - ExportMenuButton（dropdown：CSV / PDF / 列印）
 *  - ToolbarSeparator（垂直分隔線）
 */
'use client';

import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Filter,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Printer,
  RefreshCcw,
  Save,
  Search,
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
  selectionMode,
  onToggleSelection,
  selectedCount,
  page,
  totalPages,
  onPageChange,
  onCreate,
  onEdit,
  onSearch,
  onDelete,
  onExport,
  onRefresh,
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
  /** 當前選列的 isActive 狀態。true → D 按鈕為「停用」（danger）；false → 「啟用」（default）。未指定時預設為 true。
   *  NEXORA 軟刪除設計：選中已停用列時 D 改成「啟用」，方便重新啟用。 */
  selectedRowActive?: boolean;
  selectionMode: boolean;
  onToggleSelection: () => void;
  selectedCount: number;
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
  onCreate: () => void;
  onEdit: () => void;
  onSearch: () => void;
  onDelete: () => void;
  onExport: (format: ExportFormat) => void;
  onRefresh: () => void;
  onSave: () => void;
  onCancel: () => void;
  /** 列表 filter：是否含已停用列。提供時顯示「顯示停用」toggle 按鈕（位於選取按鈕前）；未提供則隱藏。 */
  showInactive?: boolean;
  onShowInactiveChange?: (next: boolean) => void;
  /** selectionMode 批次啟用 callback；未提供時按鈕仍顯示但永遠 disabled */
  onBatchEnable?: () => void;
  /** selectionMode 批次停用 callback；同上 */
  onBatchDisable?: () => void;
  /** 欄位設定（Alt+L）；提供時顯示「欄位」按鈕（瀏覽模式） */
  onOpenColumns?: () => void;
  /** 篩選（Alt+T）；提供時顯示「篩選」按鈕（瀏覽模式） */
  onOpenFilter?: () => void;
  /** 已隱藏欄位數（>0 時欄位按鈕高亮 + badge） */
  columnsHiddenCount?: number;
  /** 已套用篩選條件數（>0 時篩選按鈕高亮 + badge） */
  filterCount?: number;
}) {
  // 選中啟用列 → 按鈕為「停用」(danger / PowerOff)；選中停用列 → 「啟用」(default / Power)
  const rowIsActive = selectedRowActive ?? true;
  const disableButtonLabel = rowIsActive ? '停用' : '啟用';
  const DisableButtonIcon = rowIsActive ? PowerOff : Power;
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
          icon={PowerOff}
          label="批次停用"
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

  return (
    <div
      className="flex items-center gap-1 border-b border-border/40 px-3 py-2"
      style={{
        backgroundImage: 'linear-gradient(180deg, #16161B 0%, #101014 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 #000000',
      }}
    >
      <PaginationButton icon={ChevronsLeft} disabled={page <= 1} onClick={() => onPageChange(1)} title="第一頁" />
      <PaginationButton icon={ChevronLeft} disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="上一頁" />
      <span className="min-w-[2.5rem] px-1 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
        {page}/{totalPages}
      </span>
      <PaginationButton icon={ChevronRight} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} title="下一頁" />
      <PaginationButton icon={ChevronsRight} disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} title="最末頁" />
      <ToolbarSeparator />
      <ToolbarButton icon={Plus} letter="A" label="新增" enabled onClick={onCreate} />
      <ToolbarButton icon={Pencil} letter="E" label="更正" enabled={hasActiveRow} onClick={onEdit} />
      <ToolbarButton icon={Search} letter="F" label="查詢" enabled onClick={onSearch} />
      <ToolbarSeparator />
      <ToolbarButton
        icon={DisableButtonIcon}
        letter="D"
        label={disableButtonLabel}
        enabled={hasActiveRow}
        variant={disableButtonVariant}
        onClick={onDelete}
      />
      <ExportMenuButton onSelect={onExport} />
      <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={onRefresh} />
      {onOpenColumns || onOpenFilter ? <ToolbarSeparator /> : null}
      {onOpenColumns ? (
        <ToolbarButton
          icon={Columns3}
          letter="L"
          label={columnsHiddenCount > 0 ? `欄位·隱${columnsHiddenCount}` : '欄位'}
          enabled
          onClick={onOpenColumns}
          pressed={columnsHiddenCount > 0}
        />
      ) : null}
      {onOpenFilter ? (
        <ToolbarButton
          icon={Filter}
          letter="T"
          label={filterCount > 0 ? `篩選·${filterCount}` : '篩選'}
          enabled
          onClick={onOpenFilter}
          pressed={filterCount > 0}
        />
      ) : null}
      <div className="flex-1" />
      {onShowInactiveChange ? (
        <ToolbarButton
          icon={showInactive ? Eye : EyeOff}
          label="顯示停用"
          enabled
          onClick={() => onShowInactiveChange(!showInactive)}
          pressed={showInactive}
        />
      ) : null}
      <ToolbarButton icon={CheckSquare} label="選取" enabled onClick={onToggleSelection} />
    </div>
  );
}

export function ToolbarSeparator() {
  return <div className="mx-1 h-5 w-px bg-[#2A2A30]" aria-hidden />;
}

export function PaginationButton({
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
