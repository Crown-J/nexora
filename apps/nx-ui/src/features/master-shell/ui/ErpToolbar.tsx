// apps/nx-ui/src/features/master-shell/ui/ErpToolbar.tsx
/**
 * NEXORA Master Shell — ErpToolbar 家族
 *
 * 舊 ERP 工具列範式（鋼鐵星球視覺 + Alt 快捷鍵）。
 *
 * 三分支：
 *  - browse（瀏覽）：分頁鈕 + A 新增 / E 更正 / F 查詢 / D 停用 / 匯出 P / R 重新整理 / 選取 / Q 結束
 *  - edit（編輯）：S 存檔 / C 取消
 *  - selection（選取批次）：完成選取 / 批次啟用 / 批次停用
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
  Download,
  FileSpreadsheet,
  FileText,
  LogOut,
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
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ErpMode = 'browse' | 'edit';

export type ExportFormat = 'csv' | 'pdf' | 'print';

export function ErpToolbar({
  mode,
  hasActiveRow,
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
  onExit,
  onSave,
  onCancel,
}: {
  mode: ErpMode;
  hasActiveRow: boolean;
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
  onExit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (selectionMode) {
    const hasChecked = selectedCount > 0;
    return (
      <div className="flex items-center gap-1 border-b border-[#E8A020]/30 bg-gradient-to-r from-[#E8A020]/6 to-[#E8A020]/3 px-3 py-1.5">
        <ToolbarButton icon={Check} label="完成選取" enabled onClick={onToggleSelection} accent />
        <ToolbarSeparator />
        <span className="px-1 text-[11px] text-[#888892]">
          已選 <span className="font-mono text-[#E8A020]">{selectedCount}</span> 筆
        </span>
        <div className="flex-1" />
        <ToolbarButton icon={Power} label="批次啟用" enabled={hasChecked} />
        <ToolbarButton icon={PowerOff} label="批次停用" enabled={hasChecked} variant="danger" />
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
        <span className="px-1 text-[11px] text-[#888892]">
          編輯模式 · Alt+S 存檔 / Alt+C 取消
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 border-b border-[#2A2A30] px-3 py-2"
      style={{
        backgroundImage: 'linear-gradient(180deg, #16161B 0%, #101014 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 #000000',
      }}
    >
      <PaginationButton icon={ChevronsLeft} disabled={page <= 1} onClick={() => onPageChange(1)} title="第一頁" />
      <PaginationButton icon={ChevronLeft} disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="上一頁" />
      <span className="min-w-[2.5rem] px-1 text-center font-mono text-[11px] tabular-nums text-[#888892]">
        {page}/{totalPages}
      </span>
      <PaginationButton icon={ChevronRight} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} title="下一頁" />
      <PaginationButton icon={ChevronsRight} disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} title="最末頁" />
      <ToolbarSeparator />
      <ToolbarButton icon={Plus} letter="A" label="新增" enabled onClick={onCreate} />
      <ToolbarButton icon={Pencil} letter="E" label="更正" enabled={hasActiveRow} onClick={onEdit} />
      <ToolbarButton icon={Search} letter="F" label="查詢" enabled onClick={onSearch} />
      <ToolbarSeparator />
      <ToolbarButton icon={PowerOff} letter="D" label="停用" enabled={hasActiveRow} variant="danger" onClick={onDelete} />
      <ExportMenuButton onSelect={onExport} />
      <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={onRefresh} />
      <div className="flex-1" />
      <ToolbarButton icon={CheckSquare} label="選取" enabled onClick={onToggleSelection} />
      <ToolbarButton icon={LogOut} letter="Q" label="結束" enabled onClick={onExit} />
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
          ? 'cursor-not-allowed border-[#2A2A30]/60 bg-[#131316] text-[#5A5A60]'
          : 'border-[#2A2A30] bg-[#1A1A1F] text-[#B8B8C0] hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]',
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  letter?: string;
  label: string;
  enabled: boolean;
  variant?: 'default' | 'danger';
  onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      title={letter ? `${label}（${letter}）` : label}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-all',
        enabled
          ? variant === 'danger'
            ? 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]'
            : accent
              ? 'border-[#E8A020]/40 bg-[#E8A020]/12 text-[#E8A020] hover:bg-[#E8A020]/20'
              : 'border-[#2A2A30] bg-[#1A1A1F] text-[#B8B8C0] hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]'
          : 'cursor-not-allowed border-[#2A2A30]/60 bg-[#131316] text-[#5A5A60]',
      )}
    >
      <Icon className="size-3" />
      <span className="hidden sm:inline">
        {letter ? (
          <span className={cn('mr-0.5 font-mono', enabled && variant !== 'danger' && !accent && 'text-[#E8A020]')}>{letter}</span>
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
            'inline-flex h-7 items-center gap-1 rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-2 text-[11px] font-medium text-[#B8B8C0] transition-all hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]',
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
        className="min-w-[10rem] border-[#2A2A30] bg-[#131316]/95 p-1 shadow-2xl backdrop-blur-xl"
      >
        <DropdownMenuItem
          onClick={() => onSelect('csv')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-[#E8E8EB] focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]"
        >
          <FileSpreadsheet className="mr-2 size-3.5" />
          匯出 CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect('pdf')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-[#E8E8EB] focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]"
        >
          <FileText className="mr-2 size-3.5" />
          匯出 PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect('print')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-[#E8E8EB] focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]"
        >
          <Printer className="mr-2 size-3.5" />
          列印
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
