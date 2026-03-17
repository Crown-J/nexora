/**
 * File: apps/nx-ui/src/features/nx00/role-view/ui/RoleViewMatrix.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLE-VIEW-MATRIX-002：RoleView Matrix（render-only）
 *
 * Notes:
 * - 純呈現元件，不呼叫任何 hook 或 API
 * - 資料與事件全由父層注入
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
  onBulkSetPerm(key: PermKey, value: boolean): void;
  onSetPerm(viewId: string, key: PermKey, value: boolean): void;
  onSetRowActive(viewId: string, active: boolean): void;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-MATRIX-002-F01
 * 說明：RoleViewMatrix - 權限矩陣表格（render-only）
 */
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
    onBulkSetPerm,
    onSetPerm,
    onSetRowActive,
  } = props;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white/85">{title}</div>
        <div className="flex items-center gap-2">
          <div className="mr-2 text-xs text-white/60">Dirty: {dirtyCount}</div>
          {headerActions}
        </div>
      </div>

      {(viewError || roleViewError || saveError) && (
        <div className="mb-2 space-y-1">
          {viewError && <div className="text-xs text-red-300">{viewError}</div>}
          {roleViewError && <div className="text-xs text-red-300">{roleViewError}</div>}
          {saveError && <div className="text-xs text-red-300">{saveError}</div>}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PERM_COLS.map((c) => (
          <button
            key={c.key}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
            onClick={() => onBulkSetPerm(c.key, true)}
            disabled={saving}
            title={`將目前可見的 rows 全部設為 ${c.label}=true`}
          >
            {c.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/60">Module</span>
          <select
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/80 outline-none"
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

      <div className="overflow-auto rounded-xl border border-white/10 bg-black/20">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[360px]" />
            {PERM_COLS.map((c) => (
              <col key={c.key} className="w-[110px]" />
            ))}
            <col className="w-[110px]" />
          </colgroup>

          <thead className="sticky top-0 z-10 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/50">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-white/70">畫面 / 功能</th>

              {PERM_COLS.map((c) => (
                <th key={c.key} className="px-3 py-2 text-center text-[11px] font-semibold text-white/70">
                  {c.label}
                </th>
              ))}

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white/70">啟用</th>
            </tr>
          </thead>

          {modules
            .filter((m) => (moduleFilter ? m === moduleFilter : true))
            .map((mc) => {
              const rows = grouped[mc] ?? [];
              const open = moduleOpen[mc] !== false;

              return (
                <tbody key={mc} className="text-white/85">
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <td className="px-3 py-2">
                      <button
                        className="flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-white"
                        onClick={() => onToggleModule(mc)}
                      >
                        <span className="inline-block w-4 text-center">{open ? '▼' : '▶'}</span>
                        <span>{mc}</span>
                        <span className="text-xs text-white/45">({rows.length})</span>
                      </button>
                    </td>
                    {PERM_COLS.map((c) => (
                      <td key={c.key} className="px-3 py-2 text-center text-xs text-white/35">
                        —
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-xs text-white/35">—</td>
                  </tr>

                  {open &&
                    rows.map((r, idx) => (
                      <tr
                        key={r.view.id}
                        className={cx(
                          'border-b border-white/5 hover:bg-white/[0.06]',
                          idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]',
                        )}
                      >
                        <td className="px-3 py-2 align-middle">
                          <div className="text-sm font-semibold">{r.view.name}</div>
                          <div className="text-xs text-white/45">{r.view.code}</div>
                          <div className="text-[11px] text-white/35">{r.view.path}</div>
                        </td>

                        {PERM_COLS.map((c) => (
                          <td key={c.key} className="px-3 py-2 text-center align-middle">
                            <input
                              type="checkbox"
                              className="h-4 w-4 align-middle"
                              checked={Boolean(r.perms[c.key])}
                              onChange={(e) => onSetPerm(r.view.id, c.key, e.target.checked)}
                              disabled={saving}
                            />
                          </td>
                        ))}

                        <td className="px-3 py-2 text-center align-middle">
                          <input
                            type="checkbox"
                            className="h-4 w-4 align-middle"
                            checked={Boolean(r.isActive)}
                            onChange={(e) => onSetRowActive(r.view.id, e.target.checked)}
                            disabled={saving}
                            title="取消啟用會在儲存後視為關閉該 View 權限"
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              );
            })}
        </table>
      </div>

      {(viewLoading || roleViewLoading) && <div className="mt-2 text-xs text-white/60">載入中...</div>}
    </div>
  );
}

