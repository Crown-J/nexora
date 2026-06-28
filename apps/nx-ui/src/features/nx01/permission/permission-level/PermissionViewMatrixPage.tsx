// apps/nx-ui/src/features/nx01/permission/permission-level/PermissionViewMatrixPage.tsx
// 職務↔權限拆分軌：權限設定（矩陣）— 左選權限等級、右勾各畫面的權限（瀏覽/新增/修改/停用/匯出/核准）。
// 內建 S（全權限）唯讀。對應後端 nx01/permission-levels/:id/views（GET/PUT）。

'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';

import { listPermissionLevels } from '@data/endpoints/settings/permission-level/api';
import {
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

const MODULE_LABEL: Record<string, string> = {
  NX01: '基本資料',
  NX02: '採購與進貨',
  NX03: '銷售作業',
  NX04: '庫存管理',
  NX05: '會計財務',
  NX06: '物流配送',
  NX07: '人力資源',
  NX08: '報表與分析',
  NX00: '系統',
};

type Cell = Omit<LevelViewGrant, 'viewId'>;
const EMPTY: Cell = {
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canExport: false,
  canApprove: false,
};

export function PermissionViewMatrixPage() {
  const [levels, setLevels] = useState<PermissionLevel[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [matrix, setMatrix] = useState<LevelViewMatrix | null>(null);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const resp = await listPermissionLevels();
        const rows = (resp.rows ?? []).filter((r) => r.isActive);
        setLevels(rows);
        if (rows.length && !selectedId) setSelectedId(rows[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : '載入權限等級失敗');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const cellOf = (viewId: string): Cell => cells[viewId] ?? EMPTY;

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
    setCells((prev) => ({
      ...prev,
      [viewId]: {
        canRead: !allOn,
        canCreate: !allOn,
        canUpdate: !allOn,
        canDelete: !allOn,
        canExport: !allOn,
        canApprove: !allOn,
      },
    }));
  };

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
    <div className="flex h-full min-h-0 flex-1 gap-3 p-4">
      {/* 左：權限等級清單 */}
      <aside className="w-56 shrink-0 overflow-y-auto rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[13px] font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> 權限等級
        </div>
        <ul className="p-1">
          {levels.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setSelectedId(l.id)}
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

      {/* 右：畫面權限矩陣 */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="text-[13px]">
            <span className="font-semibold text-foreground">權限設定</span>
            {matrix ? (
              <span className="ml-2 text-muted-foreground">
                {matrix.name} <span className="font-mono">({matrix.code})</span>
              </span>
            ) : null}
          </div>
          {!readOnly ? (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || loading || !selectedId}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? '儲存中…' : '儲存'}
            </button>
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
              <thead className="sticky top-0 bg-secondary">
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
                    <tr className="bg-foreground/[0.03]">
                      <td colSpan={7} className="px-3 py-1.5 text-[12px] font-semibold text-foreground">
                        {MODULE_LABEL[module] ?? module}
                      </td>
                    </tr>
                    {views.map((v) => {
                      const c = cellOf(v.id);
                      return (
                        <tr key={v.id} className="border-b border-border/50 hover:bg-foreground/[0.02]">
                          <td className="px-3 py-1.5 text-foreground">
                            <button
                              type="button"
                              onClick={() => toggleRow(v.id)}
                              className="text-left hover:text-primary"
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
  );
}
