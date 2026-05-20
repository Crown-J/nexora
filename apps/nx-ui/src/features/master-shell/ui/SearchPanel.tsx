// apps/nx-ui/src/features/master-shell/ui/SearchPanel.tsx
/**
 * NEXORA Master Shell — SearchPanel（搜尋面板 inline 條）
 *
 * 用法：
 *   const [open, setOpen] = useState(false);
 *   const [kw, setKw] = useState('');
 *   ...
 *   <SearchPanel
 *     open={open}
 *     value={kw}
 *     onChange={setKw}
 *     onClose={() => { setOpen(false); setKw(''); }}
 *     placeholder="搜尋帳號 / 姓名 / 信箱..."
 *   />
 *
 * 功能：
 * - 開啟時自動 focus input
 * - ESC 關閉
 * - 清除按鈕（value 非空時）
 * - 與 ErpToolbar 同寬，建議放在 toolbar 下方、tabbar 上方
 */
'use client';

import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export function SearchPanel({
  open,
  value,
  onChange,
  onClose,
  placeholder,
}: {
  open: boolean;
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="flex items-center gap-2 border-b border-[#2A2A30] px-4 py-2"
      style={{
        backgroundImage: 'linear-gradient(180deg, #0E0E12 0%, #0A0A0C 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      <Search className="size-4 text-[#E8A020]" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
        placeholder={placeholder ?? '搜尋...'}
        className="flex-1 bg-transparent text-sm text-[#E8E8EB] outline-none placeholder:text-[#5A5A60]"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="rounded px-1.5 text-[11px] text-[#888892] transition-colors hover:bg-[#1A1A1F] hover:text-[#E8E8EB]"
        >
          清除
        </button>
      ) : null}
      <span className="hidden text-[10px] tracking-wider text-[#5A5A60] sm:inline">ESC 關閉</span>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 text-[#888892] transition-colors hover:bg-[#1A1A1F] hover:text-[#E8E8EB]"
        aria-label="關閉搜尋"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
