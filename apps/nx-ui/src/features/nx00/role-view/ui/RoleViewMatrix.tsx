/**
 * File: apps/nx-ui/src/features/nx00/role-view/ui/RoleViewMatrix.tsx
 *
 * Purpose:
 * - RoleView Matrix（render-only）
 * - `appearance="base"`：主檔 / Landing 語意色票（glass 風格對齊）
 */

'use client';

import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import type { PermKey, RoleViewDraftRow } from '@/features/nx00/role-view/types';

const PERM_COLS: { key: PermKey; label: string }[] = [
  { key: 'canRead', label: '讀取' },
  { key: 'canCreate', label: '新增' },
  { key: 'canUpdate', label: '修改' },
  { key: 'canDelete', label: '刪除' },
  { key: 'canExport', label: '匯出' },
];

export type RoleViewMatrixProps = {
  title: string;
  headerActions?: ReactNode;

  modules: string[];
  moduleOpen: Record<string, boolean>;
  moduleFilter: string;
  grouped: Record<string, RoleViewDraftRow[]>;

  viewError: string | null;
  roleViewError: string | null;
  saveError: string | null;
  viewLoading: boolean;
  roleViewLoading: boolean;

  saving: boolean;
  dirtyCount: number;

  onToggleModule(mc: string): void;
  onChangeModuleFilter(value: string): void;
  onSetPerm(viewId: string, key: PermKey, value: boolean): void;
  onSetRowActive(viewId: string, active: boolean): void;
  onToggleAll(nextValue: boolean): void;
  onToggleRowAll(viewId: string): void;
  onToggleModuleAll(moduleCode: string): void;

  /** dashboard = NX00 深色玻璃；base = 主檔 Landing 語意色票 */
  appearance?: 'dashboard' | 'base';
  /** false 時隱藏上方標題／Dirty 列 */
  showMatrixHeader?: boolean;
};

export function RoleViewMatrix(props: RoleViewMatrixProps) {
  const {
    title,
    headerActions,
    modules,
    moduleOpen,
    moduleFilter,
    grouped,
    viewError,
    roleViewError,
    saveError,
    viewLoading,
    roleViewLoading,
    saving,
    dirtyCount,
    onToggleModule,
    onChangeModuleFilter,
    onSetPerm,
    onSetRowActive,
    onToggleAll,
    onToggleRowAll,
    onToggleModuleAll,
    appearance = 'dashboard',
    showMatrixHeader = true,
  } = props;

  const base = appearance === 'base';

  const chk = base ? 'size-4 accent-primary rounded border border-input' : 'h-4 w-4 align-middle';

  return (
    <div className={cx('flex flex-col gap-3', base && 'text-foreground')}>
      {showMatrixHeader ? (
        <div className="flex items-center justify-between gap-2">
          <div
            className={cx(
              'text-sm font-semibold',
              base ? 'text-foreground' : 'text-white/85',
            )}
          >
            {title}
          </div>
          <div className="flex items-center gap-2">
            <div className={cx('mr-2 text-xs', base ? 'text-muted-foreground' : 'text-white/60')}>
              Dirty: {dirtyCount}
            </div>
            {headerActions}
          </div>
        </div>
      ) : null}

      {(viewError || roleViewError || saveError) && (
        <div className="mb-2 space-y-1">
          {viewError && (
            <div className={cx('text-xs', base ? 'text-destructive' : 'text-red-300')}>{viewError}</div>
          )}
          {roleViewError && (
            <div className={cx('text-xs', base ? 'text-destructive' : 'text-red-300')}>{roleViewError}</div>
          )}
          {saveError && (
            <div className={cx('text-xs', base ? 'text-destructive' : 'text-red-300')}>{saveError}</div>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cx(
            'rounded-lg border px-4 py-2 text-xs font-semibold disabled:opacity-40',
            base
              ? 'border-primary/40 bg-primary/12 text-primary hover:bg-primary/18'
              : 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30',
          )}
          onClick={() => onToggleAll(true)}
          disabled={saving}
          title="所有畫面的所有權限與啟用狀態全部勾選"
        >
          全部勾選
        </button>

        <button
          type="button"
          className={cx(
            'rounded-lg border px-4 py-2 text-xs font-semibold disabled:opacity-40',
            base
              ? 'border-destructive/45 bg-destructive/10 text-destructive hover:bg-destructive/15'
              : 'border-red-400/40 bg-red-500/15 text-red-100 hover:bg-red-500/25',
          )}
          onClick={() => onToggleAll(false)}
          disabled={saving}
          title="所有畫面的所有權限與啟用狀態全部取消"
        >
          全部取消
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className={cx('text-xs', base ? 'text-muted-foreground' : 'text-white/60')}>Module</span>
          <select
            className={cx(
              'rounded-md border px-2 py-2 text-xs outline-none transition-[color,box-shadow]',
              base
                ? 'h-9 border-input bg-background text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
                : 'rounded-lg border-white/10 bg-white/5 text-white/80',
            )}
            value={moduleFilter}
            onChange={(e) => onChangeModuleFilter(e.target.value)}
          >
            <option value="">全部</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={cx(
          'overflow-auto rounded-xl border',
          base ? 'border-border/80 bg-muted/10' : 'border-white/10 bg-black/20',
        )}
      >
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[420px]" />
            {PERM_COLS.map((c) => (
              <col key={c.key} className="w-[110px]" />
            ))}
            <col className="w-[110px]" />
          </colgroup>

          <thead
            className={cx(
              'sticky top-0 z-10 backdrop-blur-md',
              base
                ? 'border-b border-border/80 bg-card/90 supports-[backdrop-filter]:bg-card/85'
                : 'border-b border-white/10 bg-black/70 supports-[backdrop-filter]:bg-black/50',
            )}
          >
            <tr className={cx(base ? 'border-b border-border/60' : 'border-b border-white/10')}>
              <th
                className={cx(
                  'px-3 py-2 text-center text-[11px] font-semibold tracking-wide',
                  base ? 'text-muted-foreground' : 'text-white/75',
                )}
              >
                畫面 / 功能
              </th>

              {PERM_COLS.map((c) => (
                <th
                  key={c.key}
                  className={cx(
                    'px-3 py-2 text-center text-[11px] font-semibold tracking-wide',
                    base ? 'text-muted-foreground' : 'text-white/75',
                  )}
                >
                  {c.label}
                </th>
              ))}

              <th
                className={cx(
                  'px-3 py-2 text-center text-[11px] font-semibold tracking-wide',
                  base ? 'text-muted-foreground' : 'text-white/75',
                )}
              >
                啟用
              </th>
            </tr>
          </thead>

          {modules
            .filter((m) => (moduleFilter ? m === moduleFilter : true))
            .map((mc) => {
              const rows = grouped[mc] ?? [];
              const open = moduleOpen[mc] !== false;

              return (
                <tbody
                  key={mc}
                  className={cx(base ? 'text-foreground' : 'text-white/85')}
                >
                  <tr
                    className={cx(
                      'border-b',
                      base ? 'border-border/60 bg-muted/25' : 'border-white/10 bg-white/[0.03]',
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className={cx(
                            'flex items-center gap-2 text-sm font-semibold',
                            base
                              ? 'text-foreground hover:text-primary'
                              : 'text-white/85 hover:text-white',
                          )}
                          onClick={() => onToggleModule(mc)}
                        >
                          <span className="inline-block w-4 text-center">{open ? '▼' : '▶'}</span>
                          <span>{mc}</span>
                          <span
                            className={cx('text-xs', base ? 'text-muted-foreground' : 'text-white/45')}
                          >
                            ({rows.length})
                          </span>
                        </button>

                        <button
                          type="button"
                          className={cx(
                            'rounded-full border px-2 py-1 text-[10px] disabled:opacity-40',
                            base
                              ? 'border-border bg-secondary text-secondary-foreground hover:bg-secondary/80'
                              : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10',
                          )}
                          onClick={() => onToggleModuleAll(mc)}
                          title="切換此模組下所有畫面的所有權限全選/全取消"
                        >
                          全選
                        </button>
                      </div>
                    </td>
                    {PERM_COLS.map((c) => (
                      <td
                        key={c.key}
                        className={cx(
                          'px-3 py-2 text-center text-xs',
                          base ? 'text-muted-foreground' : 'text-white/35',
                        )}
                      >
                        —
                      </td>
                    ))}
                    <td
                      className={cx(
                        'px-3 py-2 text-center text-xs',
                        base ? 'text-muted-foreground' : 'text-white/35',
                      )}
                    >
                      —
                    </td>
                  </tr>

                  {open &&
                    rows.map((r, idx) => (
                      <tr
                        key={r.view.id}
                        className={cx(
                          'border-b',
                          base
                            ? cx(
                                'border-border/40 hover:bg-muted/20',
                                idx % 2 === 1 ? 'bg-muted/[0.06]' : 'bg-transparent',
                              )
                            : cx(
                                'border-white/5 hover:bg-white/[0.06]',
                                idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]',
                              ),
                        )}
                      >
                        <td className="px-3 py-2 align-middle">
                          <div className="text-sm font-semibold">{r.view.name}</div>
                          <div
                            className={cx('text-xs', base ? 'text-muted-foreground' : 'text-white/45')}
                          >
                            {r.view.code}
                          </div>
                          <div
                            className={cx('text-[11px]', base ? 'text-muted-foreground/80' : 'text-white/35')}
                          >
                            {r.view.path}
                          </div>
                        </td>

                        {PERM_COLS.map((c) => (
                          <td key={c.key} className="px-3 py-2 text-center align-middle">
                            <input
                              type="checkbox"
                              className={chk}
                              checked={Boolean(r.perms[c.key])}
                              onChange={(e) => onSetPerm(r.view.id, c.key, e.target.checked)}
                              disabled={saving}
                            />
                          </td>
                        ))}

                        <td className="px-3 py-2 text-center align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="checkbox"
                              className={chk}
                              checked={Boolean(r.isActive)}
                              onChange={(e) => onSetRowActive(r.view.id, e.target.checked)}
                              disabled={saving}
                              title="取消啟用會在儲存後視為關閉該 View 權限"
                            />

                            <button
                              type="button"
                              onClick={() => onToggleRowAll(r.view.id)}
                              className={cx(
                                'rounded-full border px-2 py-0.5 text-[10px] disabled:opacity-40',
                                base
                                  ? 'border-border bg-muted/40 text-foreground hover:bg-muted'
                                  : 'border-white/15 bg-white/5 text-white/75 hover:bg-white/12',
                              )}
                              disabled={saving}
                              title="切換此畫面的所有權限全選/全取消"
                            >
                              全選
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              );
            })}
        </table>
      </div>

      {(viewLoading || roleViewLoading) && (
        <div className={cx('mt-2 text-xs', base ? 'text-muted-foreground' : 'text-white/60')}>
          載入中...
        </div>
      )}
    </div>
  );
}
