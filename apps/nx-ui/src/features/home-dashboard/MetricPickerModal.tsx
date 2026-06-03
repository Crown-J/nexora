// apps/nx-ui/src/features/home-dashboard/MetricPickerModal.tsx
// 數據格設定 modal — 列出可選數據（依權限過濾、KPI 標🔒）
//
// 2026-06-03 對齊主檔中心：glass-card / border-border/80 / token 化

'use client';

import { Lock, X } from 'lucide-react';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import type { MeDto } from '@/features/auth/types';

import { METRIC_OPTIONS, type MetricOptionDef } from './metric-options.config';

type MetricPickerModalProps = {
  slotIndex: number | null;
  usedKeys: Set<string>;
  onPick: (optionKey: string) => void;
  onClose: () => void;
  onClear?: () => void;
};

function canRead(me: MeDto | null, viewCode: string): boolean {
  if (!me) return false;
  const vp = me.view_permissions;
  if (vp === null || vp === undefined) return true;
  return Boolean(vp[viewCode]?.can_read);
}

export function MetricPickerModal({
  slotIndex,
  usedKeys,
  onPick,
  onClose,
  onClear,
}: MetricPickerModalProps) {
  const { me } = useSessionMe();

  const grouped = useMemo(() => {
    const visible = METRIC_OPTIONS.filter((opt) => canRead(me as MeDto | null, opt.viewCode));
    const byCat: Record<string, MetricOptionDef[]> = {};
    for (const opt of visible) {
      (byCat[opt.category] ??= []).push(opt);
    }
    return byCat;
  }, [me]);

  if (slotIndex === null) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="選擇數據"
        className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              第 {slotIndex + 1} 個數據格
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-foreground">選擇要顯示的數據</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-5">
          {Object.keys(grouped).length === 0 ? (
            <div className="rounded border border-border/70 bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
              您目前沒有任何可選的數據權限。
              <br />
              請聯絡負責人配置您的角色。
            </div>
          ) : (
            Object.entries(grouped).map(([cat, opts]) => (
              <section key={cat}>
                <h3 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{cat}</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {opts.map((opt) => {
                    const used = usedKeys.has(opt.key);
                    const disabled = opt.isPremium || used;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          onPick(opt.key);
                        }}
                        className={cn(
                          'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                          opt.isPremium
                            ? 'cursor-not-allowed border-primary/30 bg-primary/5 opacity-70'
                            : used
                              ? 'cursor-not-allowed border-border/60 bg-secondary/30 opacity-50'
                              : 'cursor-pointer border-border/80 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60',
                        )}
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{opt.label}</span>
                          {opt.isPremium ? (
                            <span className="ml-auto inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                              <Lock className="h-3 w-3" />
                              升級 KPI 套件
                            </span>
                          ) : used ? (
                            <span className="ml-auto text-[10px] text-muted-foreground">已使用</span>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{opt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/70 px-5 py-3">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded border border-border/70 px-3 py-1 text-xs text-muted-foreground hover:border-border hover:text-foreground"
            >
              清除此格
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border/70 px-3 py-1 text-xs text-muted-foreground hover:border-border hover:text-foreground"
          >
            取消
          </button>
        </footer>
      </div>
    </div>
  );
}
