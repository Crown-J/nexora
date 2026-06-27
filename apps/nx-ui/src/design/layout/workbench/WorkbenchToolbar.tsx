// apps/nx-ui/src/design/layout/workbench/WorkbenchToolbar.tsx
// 傳統 ERP 工具列：圖示快捷鈕（重新整理 / 列印 / 全域料號搜尋）+ 右側深淺切換。
// 註：新增/存檔等單據動作屬各功能頁內按鈕、此工具列只放跨頁通用動作。

'use client';

import { Moon, Printer, RefreshCw, Search, Sun } from 'lucide-react';

type Props = {
  light: boolean;
  onToggleTheme: () => void;
  onRefresh: () => void;
  onSearch: () => void;
};

function ToolButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-sm text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground"
    >
      {children}
    </button>
  );
}

export function WorkbenchToolbar({ light, onToggleTheme, onRefresh, onSearch }: Props) {
  return (
    <div className="flex items-center gap-1 border-b border-border bg-secondary/40 px-1.5 py-1">
      <ToolButton title="重新整理" onClick={onRefresh}>
        <RefreshCw className="h-[15px] w-[15px]" />
      </ToolButton>
      <ToolButton title="料號即時查詢（F2）" onClick={onSearch}>
        <Search className="h-[15px] w-[15px]" />
      </ToolButton>
      <ToolButton title="列印" onClick={() => window.print()}>
        <Printer className="h-[15px] w-[15px]" />
      </ToolButton>
      <div className="flex-1" />
      <ToolButton title={light ? '切換深色' : '切換淺色'} onClick={onToggleTheme}>
        {light ? <Moon className="h-[15px] w-[15px]" /> : <Sun className="h-[15px] w-[15px]" />}
      </ToolButton>
    </div>
  );
}
