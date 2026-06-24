// apps/nx-ui/src/features/nx01/shell/keyboard-card-master/ExportMenu.tsx
/**
 * ExportMenu — 匯出格式選擇浮層（O 鍵叫出）
 *
 * 三選 1：CSV / Excel / PDF（列印獨立 P 按鈕、不在這裡）
 * 鍵盤：↑↓ 選 / Enter 觸發 / Esc 退 / 1-3 直選
 * 範式跟 MasterSwitcher 一致：root tabIndex=-1 + onKeyDown + framer-motion 進場
 */
'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as RKeyboardEvent,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileSpreadsheet, FileText, FileDown } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { useReducedMotion } from '@/design/motion/gsap';
import type { ExportFormat } from '@/features/nx01/shell/hooks/useExportTable';

type ExportOption = {
  key: 'csv' | 'xlsx' | 'pdf';
  label: string;
  desc: string;
  hotkey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
};

const OPTIONS: ExportOption[] = [
  { key: 'csv', label: 'CSV', desc: '通用文字檔（Excel / 試算表可開）', hotkey: '1', icon: FileText },
  { key: 'xlsx', label: 'Excel', desc: '.xlsx 真檔（自動欄寬、含格式）', hotkey: '2', icon: FileSpreadsheet },
  { key: 'pdf', label: 'PDF', desc: '新視窗預覽、印表機選「另存 PDF」', hotkey: '3', icon: FileDown },
];

export function ExportMenu({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (format: ExportFormat) => void;
}) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(0);

  // open 切換 true：reset focusIdx（衍生 state、React 19 認可的 render-time pattern）
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setFocusIdx(0);
  }
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => rootRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const pick = useCallback(
    (idx: number) => {
      const opt = OPTIONS[idx];
      if (!opt) return;
      onClose();
      onSelect(opt.key);
    },
    [onClose, onSelect],
  );

  const handleKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(focusIdx);
        return;
      case 'ArrowUp':
        e.preventDefault();
        setFocusIdx((i) => Math.max(0, i - 1));
        return;
      case 'ArrowDown':
        e.preventDefault();
        setFocusIdx((i) => Math.min(OPTIONS.length - 1, i + 1));
        return;
      case '1':
      case '2':
      case '3': {
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < OPTIONS.length) {
          e.preventDefault();
          pick(idx);
        }
        return;
      }
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/65 p-6 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={rootRef}
            tabIndex={-1}
            onKeyDown={handleKey}
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 6 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            className="w-full max-w-sm rounded-2xl border border-primary/40 bg-card shadow-2xl shadow-primary/15 outline-none"
          >
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary">
                  O
                </span>
                <h2 className="text-sm font-semibold tracking-wider text-foreground">
                  選擇匯出格式
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-3">
              {OPTIONS.map((opt, idx) => {
                const focused = idx === focusIdx;
                const Icon = opt.icon;
                return (
                  <div
                    key={opt.key}
                    onClick={() => pick(idx)}
                    onMouseEnter={() => setFocusIdx(idx)}
                    className={cn(
                      'relative cursor-pointer rounded-lg border bg-background/40 p-3 transition-colors',
                      'border-border/40 hover:border-primary/60 hover:bg-background/60',
                    )}
                  >
                    {focused ? (
                      <motion.span
                        layoutId="export-menu-ring"
                        className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-primary [box-shadow:0_0_0_3px_var(--kb-accent-16)]"
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 380, damping: 30 }
                        }
                      />
                    ) : null}
                    <div className="relative flex items-center gap-3">
                      <Icon className="size-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {opt.desc}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-foreground/8 px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                        {opt.hotkey}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border/40 px-5 py-2.5 text-[11px] text-muted-foreground">
              <span>
                <kbd className="kb">↑↓</kbd> 選 · <kbd className="kb">Enter</kbd> 觸發 ·{' '}
                <kbd className="kb">Esc</kbd> 退
              </span>
              <span className="text-[10px] opacity-60">列印見 P 鍵</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
