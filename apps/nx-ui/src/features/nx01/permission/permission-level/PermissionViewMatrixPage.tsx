// apps/nx-ui/src/features/nx01/permission/permission-level/PermissionViewMatrixPage.tsx
// 權限設定（矩陣）— 六層：工具列(L3) + 雙開分頁(L4：權限等級 Alt+1 / 權限矩陣 Alt+2) + 內容(L5 左清單+右矩陣)。
// 左選權限等級、右勾各畫面權限（瀏覽/新增/修改/停用/匯出/核准）；模組標題列可整批勾選；內建 S 唯讀。
// 對應後端 nx01/permission-levels/:id/views（GET/PUT）。

'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Save, ShieldCheck } from 'lucide-react';

import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
import {
  listPermissionLevels,
  getLevelViews,
  setLevelViews,
  type LevelViewGrant,
  type LevelViewMatrix,
} from '@data/endpoints/settings/permission-level/api';
import type { PermissionLevel } from '@data/types/settings/permission-level';

const PERM_KEYS = ['canRead', 'canCreate', 'canUpdate', 'canDelete', 'canExport', 'canApprove'] as const;
type PermKey = (typeof PERM_KEYS)[number];
const PERM_LABEL: Record<PermKey, string> = {
  canRead: '瀏覽',
  canCreate: '新增',
  canUpdate: '修改',
  canDelete: '停用',
  canExport: '匯出',
  canApprove: '核准',
};

// 模組內碼 → 主選單名稱（不顯示 NX01 內碼給用戶）
const MODULE_LABEL: Record<string, string> = {
  NX01: '基本資料',
  NX02: '採購與進貨',
  NX03: '銷售作業',
  NX04: '庫存管理',
  NX05: '會計財務',
  NX06: '物流配送',
  NX07: '人力資源',
  NX08: '報表與分析',
  NX09: '知識中心',
  NX99: '系統設定',
  NX00: '系統設定',
};
const moduleLabel = (code: string) => MODULE_LABEL[code.toUpperCase()] ?? code;

type Cell = Omit<LevelViewGrant, 'viewId'>;
const EMPTY: Cell = {
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canExport: false,
  canApprove: false,
};

/** 支援 indeterminate 的核取方塊 */
function TriCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="size-4 rounded border-border accent-primary"
    />
  );
}

export function PermissionViewMatrixPage() {
  const [levels, setLevels] = useState<PermissionLevel[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [matrix, setMatrix] = useState<LevelViewMatrix | null>(null);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // L4 雙開分頁焦點（'left' 權限等級 / 'right' 矩陣）
  const [pane, setPane] = useState<'left' | 'right'>('left');
  const leftRef = useRef<HTMLUListElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const resp = await listPermissionLevels();
        const rows = (resp.rows ?? []).filter((r) => r.isActive);
        setLevels(rows);
        if (rows.length) setSelectedId((cur) => cur || rows[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : '載入權限等級失敗');
      }
    })();
  }, []);

  const loadMatrix = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const m = await getLevelViews(id);
      setMatrix(m);
      const map: Record<string, Cell> = {};
      for (const g of m.grants) {
        const { viewId, ...flags } = g;
        map[viewId] = flags;
      }
      setCells(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入畫面權限失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadMatrix(selectedId);
  }, [selectedId, loadMatrix]);

  const readOnly = !!matrix?.isSystem;

  const grouped = useMemo(() => {
    const map = new Map<string, LevelViewMatrix['views']>();
    for (const v of matrix?.views ?? []) {
      const arr = map.get(v.moduleCode) ?? [];
      arr.push(v);
      map.set(v.moduleCode, arr);
    }
    return [...map.entries()].map(([module, views]) => ({ module, views }));
  }, [matrix]);

  const cellOf = useCallback((viewId: string): Cell => cells[viewId] ?? EMPTY, [cells]);

  const toggle = (viewId: string, key: PermKey) => {
    if (readOnly) return;
    setCells((prev) => {
      const cur = prev[viewId] ?? EMPTY;
      return { ...prev, [viewId]: { ...cur, [key]: !cur[key] } };
    });
  };

  const toggleRow = (viewId: string) => {
    if (readOnly) return;
    const cur = cellOf(viewId);
    const allOn = PERM_KEYS.every((k) => cur[k]);
    const next: Cell = { ...EMPTY };
    for (const k of PERM_KEYS) next[k] = !allOn;
    setCells((prev) => ({ ...prev, [viewId]: next }));
  };

  // 整個模組某一欄一次勾／取消
  const toggleModuleCol = (views: LevelViewMatrix['views'], key: PermKey, on: boolean) => {
    if (readOnly) return;
    setCells((prev) => {
      const next = { ...prev };
      for (const v of views) next[v.id] = { ...(next[v.id] ?? EMPTY), [key]: on };
      return next;
    });
  };

  const focusPane = useCallback((p: 'left' | 'right') => {
    setPane(p);
    requestAnimationFrame(() => {
      (p === 'left' ? leftRef.current : rightRef.current)?.focus();
    });
  }, []);

  // 鍵盤：Alt+1 → 等級清單（↑↓ 換等級）、Alt+2 → 矩陣
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        focusPane('left');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        focusPane('right');
        return;
      }
      if (pane === 'left' && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && levels.length) {
        e.preventDefault();
        const idx = levels.findIndex((l) => l.id === selectedId);
        const ni =
          e.key === 'ArrowDown'
            ? Math.min(levels.length - 1, idx + 1)
            : Math.max(0, idx - 1);
        setSelectedId(levels[ni].id);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [pane, levels, selectedId, focusPane]);

  async function save() {
    if (readOnly || !selectedId) return;
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const views: LevelViewGrant[] = Object.entries(cells).map(([viewId, c]) => ({ viewId, ...c }));
      const res = await setLevelViews(selectedId, views);
      setMsg(`已儲存（${res.total} 個畫面有授權）`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* L3 情境工具列（投影到外殼第 3 層） */}
      <ToolbarPortal>
        <div
          className="flex items-center gap-1 border-b border-border/40 px-3 py-2"
          style={{
            backgroundImage:
              'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
          }}
        >
          <button
            type="button"
            disabled={readOnly || saving || !selectedId}
            onClick={() => void save()}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2 text-[11px] font-medium text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-3" />
            <span className="font-mono text-primary">S</span> 儲存
          </button>
          <button
            type="button"
            onClick={() => selectedId && void loadMatrix(selectedId)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border/50 bg-card px-2 text-[11px] font-medium text-foreground/80 transition hover:bg-accent/15"
          >
            <RefreshCw className="size-3" />
            <span className="font-mono text-primary">R</span> 重新整理
          </button>
          <div className="flex-1" />
          <span className="text-[11px] text-muted-foreground">Alt+1 等級 · Alt+2 矩陣</span>
        </div>
      </ToolbarPortal>

      {/* L4 雙開分頁（兩頁同時顯示、tab 指示焦點） */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-background px-3 py-1.5">
        <TabChip label="權限等級" hint="Alt+1" active={pane === 'left'} onClick={() => focusPane('left')} />
        <TabChip label="權限矩陣" hint="Alt+2" active={pane === 'right'} onClick={() => focusPane('right')} />
      </div>

      {/* L5 內容：左等級清單 + 右矩陣 */}
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <aside
          className={`${pane === 'left' ? 'block' : 'hidden'} w-full shrink-0 overflow-y-auto rounded-lg border bg-card outline-none transition md:block md:w-56 ${
            pane === 'left' ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[13px] font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> 權限等級
          </div>
          <ul ref={leftRef} tabIndex={-1} className="p-1 outline-none" onFocus={() => setPane('left')}>
            {levels.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(l.id);
                    setPane('right');
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition ${
                    selectedId === l.id
                      ? 'bg-primary/12 font-medium text-primary'
                      : 'text-foreground/85 hover:bg-foreground/[0.05]'
                  }`}
                >
                  <span className="truncate">
                    <span className="font-mono">{l.code}</span> · {l.name}
                  </span>
                  {l.isSystem ? <span className="text-[10px] text-muted-foreground">內建</span> : null}
                </button>
              </li>
            ))}
            {!levels.length ? (
              <li className="px-2.5 py-3 text-[12px] text-muted-foreground">尚無權限等級</li>
            ) : null}
          </ul>
        </aside>

        <section
          ref={rightRef}
          tabIndex={-1}
          onFocus={() => setPane('right')}
          className={`${pane === 'right' ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card outline-none transition md:flex ${
            pane === 'right' ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-[13px]">
            <span className="font-semibold text-foreground">權限矩陣</span>
            {matrix ? (
              <span className="text-muted-foreground">
                {matrix.name} <span className="font-mono">({matrix.code})</span>
              </span>
            ) : null}
          </div>

          {readOnly ? (
            <div className="m-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[13px]">
              S 為內建全權限等級、擁有所有畫面權限、不可修改。
            </div>
          ) : null}
          {error ? (
            <div className="m-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {error}
            </div>
          ) : null}
          {msg ? (
            <div className="m-3 rounded-md border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-[13px]">
              {msg}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div className="p-4 text-[13px] text-muted-foreground">載入中…</div>
            ) : (
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 z-10 bg-secondary">
                  <tr className="text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">畫面</th>
                    {PERM_KEYS.map((k) => (
                      <th key={k} className="w-14 px-1 py-2 text-center font-medium">
                        {PERM_LABEL[k]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(({ module, views }) => (
                    <Fragment key={module}>
                      <tr className="bg-foreground/[0.04]">
                        <td className="px-3 py-1.5 text-[12px] font-semibold text-foreground">
                          {moduleLabel(module)}
                        </td>
                        {PERM_KEYS.map((k) => {
                          const cnt = views.filter((v) => cellOf(v.id)[k]).length;
                          const allOn = cnt === views.length && views.length > 0;
                          return (
                            <td key={k} className="px-1 py-1.5 text-center">
                              <TriCheckbox
                                checked={readOnly || allOn}
                                indeterminate={cnt > 0 && !allOn}
                                disabled={readOnly}
                                onChange={() => toggleModuleCol(views, k, !allOn)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                      {views.map((v) => {
                        const c = cellOf(v.id);
                        return (
                          <tr key={v.id} className="border-b border-border/50 hover:bg-foreground/[0.02]">
                            <td className="px-3 py-1.5 text-foreground">
                              <button
                                type="button"
                                onClick={() => toggleRow(v.id)}
                                className="pl-3 text-left hover:text-primary"
                                title="整列切換"
                              >
                                {v.name}
                              </button>
                            </td>
                            {PERM_KEYS.map((k) => (
                              <td key={k} className="px-1 py-1.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={readOnly || c[k]}
                                  disabled={readOnly}
                                  onChange={() => toggle(v.id, k)}
                                  className="size-4 rounded border-border accent-primary"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                  {!grouped.length ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                        尚無畫面資料
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function TabChip({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition ${
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      <kbd className="rounded border border-current/30 px-1 font-mono text-[10px] opacity-70">{hint}</kbd>
    </button>
  );
}
