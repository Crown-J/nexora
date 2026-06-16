/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-020-F01
 * Alt+X 模組選單（鍵盤字母跳轉）
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cx } from '@design/utils/cx';
import type { PlanCode } from '@data/mocks/dashboard';

type ModuleMenuOverlayProps = {
  open: boolean;
  onClose: () => void;
  planCode: PlanCode;
};

const routes: Record<string, string> = {
  h: '/dashboard',
  b: '/dashboard/base',
  p: '/dashboard/purchase',
  w: '/dashboard/inventory',
  s: '/dashboard/sale',
  m: '/dashboard/finance',
  r: '/dashboard/report',
};

export function ModuleMenuOverlay({ open, onClose, planCode }: ModuleMenuOverlayProps) {
  const router = useRouter();
  const showPro = planCode === 'PRO';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      const path = routes[k];
      if (path) {
        e.preventDefault();
        router.push(path);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="模組總覽"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 text-center text-sm font-semibold text-foreground">模組總覽</div>
        <div className="grid gap-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <ModuleBtn label="首頁" hotkey="H" />
            <ModuleBtn label="主檔" hotkey="B" />
            <ModuleBtn label="進/退貨" hotkey="P" />
            <ModuleBtn label="庫存" hotkey="W" />
            <ModuleBtn label="銷貨" hotkey="S" />
            <ModuleBtn label="財務" hotkey="M" />
            <ModuleBtn label="報表工作台" hotkey="R" />
          </div>
          {showPro ? (
            <div className="mt-2 border-t border-border/60 pt-3">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                PRO
              </div>
              <div className="grid grid-cols-2 gap-2 opacity-50">
                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-border/40 px-3 py-2 text-left text-xs"
                >
                  物流（即將開放）
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-border/40 px-3 py-2 text-left text-xs"
                >
                  人資（即將開放）
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-border/40 px-3 py-2 text-left text-xs"
                >
                  知識（即將開放）
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-border/40 px-3 py-2 text-left text-xs"
                >
                  遊戲化（即將開放）
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-border py-2 text-xs text-muted-foreground hover:bg-secondary"
        >
          關閉（Esc）
        </button>
      </div>
    </div>
  );
}

function ModuleBtn({ label, hotkey }: { label: string; hotkey: string }) {
  return (
    <div
      className={cx(
        'flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5',
      )}
    >
      <span>{label}</span>
      <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        {hotkey}
      </kbd>
    </div>
  );
}
