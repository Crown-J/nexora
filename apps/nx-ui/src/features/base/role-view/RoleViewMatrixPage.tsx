// apps/nx-ui/src/features/base/role-view/RoleViewMatrixPage.tsx
/**
 * 職務權限視圖 — 矩陣版（鋼鐵星球、全鍵盤）
 *
 * 上方：選職務（下拉，系統管理員不顯示，對齊既有鎖定）
 * 下方：畫面（依模組分群）× 5 種權限（瀏覽 / 新增 / 修改 / 停用 / 匯出）矩陣
 * 鍵盤：↑↓ 換畫面列、←→ 換權限欄、空白 勾選/取消、Alt+S 存檔、Alt+Q 結束
 * staged：本地累積、Alt+S 才批次寫入後端（create / update / delete）
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MasterTopBar } from '@/features/master-shell/entity-master/MasterTopBar';
import { ToastStack, useToast } from '@/features/master-shell/ui/ToastStack';
import { listRoles, type RoleDto } from '@/features/base/api/role';
import {
  listViews,
  listRoleViews,
  createRoleView,
  updateRoleView,
  deleteRoleView,
  type ViewDto,
  type RoleViewPerms,
} from '@/features/base/api/role-view';

const PERM_KEYS = ['canRead', 'canCreate', 'canUpdate', 'canDelete', 'canExport'] as const;
type PermKey = (typeof PERM_KEYS)[number];
const PERM_LABELS: Record<PermKey, string> = {
  canRead: '瀏覽',
  canCreate: '新增',
  canUpdate: '修改',
  canDelete: '停用',
  canExport: '匯出',
};

type Cell = { recordId: string | null; canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean; canExport: boolean };
const EMPTY_CELL: Omit<Cell, 'recordId'> = { canRead: false, canCreate: false, canUpdate: false, canDelete: false, canExport: false };

export function RoleViewMatrixPage() {
  const router = useRouter();
  const { toasts, showToast } = useToast();

  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [roleId, setRoleId] = useState<string>('');
  const [views, setViews] = useState<ViewDto[]>([]);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [original, setOriginal] = useState<Record<string, Cell>>({});
  const [focus, setFocus] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 職務下拉（後端 list 已對非 SYSADMIN 過濾系統管理員；前端再保險過濾）
  useEffect(() => {
    void (async () => {
      try {
        const res = await listRoles({ pageSize: 100, isActive: true });
        const list = res.items.filter((r) => String(r.code).trim().toUpperCase() !== 'SYSADMIN');
        setRoles(list);
        if (list[0]) setRoleId((cur) => cur || list[0].id);
      } catch (e) {
        showToast((e as Error)?.message ?? '職務載入失敗', 'danger');
      }
    })();
  }, [showToast]);

  // 畫面字典
  useEffect(() => {
    void (async () => {
      try {
        const res = await listViews({ pageSize: 100 });
        setViews([...res.items].sort((a, b) => String(a.moduleCode).localeCompare(String(b.moduleCode), 'zh-Hant') || a.sortNo - b.sortNo));
      } catch (e) {
        showToast((e as Error)?.message ?? '畫面字典載入失敗', 'danger');
      }
    })();
  }, [showToast]);

  // 選中職務的權限
  useEffect(() => {
    if (!roleId) return;
    setLoading(true);
    void (async () => {
      try {
        const res = await listRoleViews({ roleId, pageSize: 100 });
        const map: Record<string, Cell> = {};
        for (const rv of res.items) {
          map[rv.viewId] = {
            recordId: rv.id,
            canRead: rv.canRead,
            canCreate: rv.canCreate,
            canUpdate: rv.canUpdate,
            canDelete: rv.canDelete,
            canExport: rv.canExport,
          };
        }
        setCells(map);
        setOriginal(structuredClone(map));
        setFocus({ row: 0, col: 0 });
      } catch (e) {
        showToast((e as Error)?.message ?? '權限載入失敗', 'danger');
      } finally {
        setLoading(false);
      }
    })();
  }, [roleId, showToast]);

  const cellOf = useCallback((viewId: string): Cell => cells[viewId] ?? { recordId: null, ...EMPTY_CELL }, [cells]);

  const toggle = useCallback((viewId: string, key: PermKey) => {
    setCells((prev) => {
      const cur = prev[viewId] ?? { recordId: null, ...EMPTY_CELL };
      return { ...prev, [viewId]: { ...cur, [key]: !cur[key] } };
    });
  }, []);

  const isDirty = useMemo(() => {
    const keys = new Set([...Object.keys(cells), ...Object.keys(original)]);
    for (const vid of keys) {
      const c = cells[vid] ?? { recordId: null, ...EMPTY_CELL };
      const o = original[vid] ?? { recordId: null, ...EMPTY_CELL };
      if (PERM_KEYS.some((k) => c[k] !== o[k])) return true;
    }
    return false;
  }, [cells, original]);

  const handleSave = useCallback(() => {
    if (!roleId) return;
    void (async () => {
      let ok = 0;
      let fail = 0;
      for (const v of views) {
        const c = cells[v.id] ?? { recordId: null, ...EMPTY_CELL };
        const o = original[v.id] ?? { recordId: null, ...EMPTY_CELL };
        const changed = PERM_KEYS.some((k) => c[k] !== o[k]);
        if (!changed) continue;
        const hasAny = PERM_KEYS.some((k) => c[k]);
        const perms: RoleViewPerms = { canRead: c.canRead, canCreate: c.canCreate, canUpdate: c.canUpdate, canDelete: c.canDelete, canExport: c.canExport };
        try {
          if (c.recordId) {
            if (hasAny) await updateRoleView(c.recordId, perms);
            else await deleteRoleView(c.recordId);
          } else if (hasAny) {
            await createRoleView({ roleId, viewId: v.id, ...perms });
          }
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      showToast(fail === 0 ? `已存檔 ${ok} 項權限變更` : `部分失敗：成功 ${ok} / 失敗 ${fail}`, fail === 0 ? 'success' : 'danger');
      // 重載對齊真相
      const res = await listRoleViews({ roleId, pageSize: 100 });
      const map: Record<string, Cell> = {};
      for (const rv of res.items) map[rv.viewId] = { recordId: rv.id, canRead: rv.canRead, canCreate: rv.canCreate, canUpdate: rv.canUpdate, canDelete: rv.canDelete, canExport: rv.canExport };
      setCells(map);
      setOriginal(structuredClone(map));
    })();
  }, [roleId, views, cells, original, showToast]);

  const requestNavigate = useCallback(
    (href: string) => {
      if (isDirty && !window.confirm('有未存檔的權限變更，確定離開？')) return;
      router.push(href);
    },
    [isDirty, router],
  );

  // 鍵盤：↑↓ 換列、←→ 換欄、空白 勾選、Alt+S 存檔、Alt+Q 結束
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 's') { e.preventDefault(); handleSave(); }
        else if (k === 'q') { e.preventDefault(); requestNavigate('/dashboard'); }
        return;
      }
      if (tag === 'select') return; // 職務下拉自己處理
      if (views.length === 0) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus((f) => ({ ...f, row: e.key === 'ArrowDown' ? Math.min(views.length - 1, f.row + 1) : Math.max(0, f.row - 1) }));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocus((f) => ({ ...f, col: e.key === 'ArrowRight' ? Math.min(PERM_KEYS.length - 1, f.col + 1) : Math.max(0, f.col - 1) }));
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        const v = views[focus.row];
        if (v) toggle(v.id, PERM_KEYS[focus.col]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [views, focus, toggle, handleSave, requestNavigate]);

  // 焦點格捲入視野
  useEffect(() => {
    panelRef.current?.querySelector(`[data-cell="${focus.row}-${focus.col}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  // 依 moduleCode 分群（保留 flat index 供鍵盤）
  const groups = useMemo(() => {
    const out: { module: string; rows: { view: ViewDto; flatIndex: number }[] }[] = [];
    views.forEach((view, flatIndex) => {
      const mc = view.moduleCode || 'OTHER';
      let g = out.find((x) => x.module === mc);
      if (!g) { g = { module: mc, rows: [] }; out.push(g); }
      g.rows.push({ view, flatIndex });
    });
    return out;
  }, [views]);

  const selectedRole = roles.find((r) => r.id === roleId);

  return (
    <div className="flex h-dvh flex-col text-[#E8E8EB]" style={{ backgroundImage: 'radial-gradient(ellipse at top, #11111A 0%, #0A0A0C 35%, #06060A 100%)' }}>
      <MasterTopBar
        category="帳號與權限"
        title="職務權限視圖"
        count={`${views.length} 個畫面`}
        requestNavigate={requestNavigate}
      />

      {/* 工具列：職務下拉 + 存檔 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#2A2A30] bg-[#0E0E12] px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">職務</span>
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="cursor-pointer rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2.5 py-1.5 text-sm text-[#E8E8EB] outline-none focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40"
        >
          {roles.length === 0 ? <option value="">（無可設定職務）</option> : null}
          {roles.map((r) => (
            <option key={r.id} value={r.id} className="bg-[#131316]">{r.name}</option>
          ))}
        </select>
        {selectedRole ? <span className="text-xs text-[#5A5A60]">為「{selectedRole.name}」設定各畫面權限</span> : null}
        <div className="flex-1" />
        {isDirty ? <span className="text-[11px] text-[#E8A020]">● 有未存檔變更</span> : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors',
            isDirty
              ? 'border-[#E8A020]/40 bg-[#E8A020]/15 text-[#E8A020] hover:bg-[#E8A020]/25'
              : 'cursor-not-allowed border-[#2A2A30] text-[#5A5A60]',
          )}
        >
          存檔 (Alt+S)
        </button>
      </div>

      {/* 矩陣 */}
      <div ref={panelRef} className="min-h-0 flex-1 overflow-auto nx-master-scroll">
        {views.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-[#888892]">
            {loading ? '載入中…' : '尚無畫面字典（需先 seed nx01_view 畫面清單，矩陣才有畫面可設權限）'}
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10" style={{ backgroundImage: 'linear-gradient(180deg, rgba(20,20,26,0.97) 0%, rgba(16,16,20,0.97) 100%)' }}>
              <tr className="border-b border-[#2A2A30] text-[11px] font-bold uppercase tracking-[0.14em] text-[#C8C8D0]">
                <th className="px-4 py-2.5 text-left">畫面</th>
                {PERM_KEYS.map((k) => (
                  <th key={k} className="w-20 px-2 py-2.5 text-center">{PERM_LABELS[k]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <RoleViewGroup
                  key={g.module}
                  module={g.module}
                  rows={g.rows}
                  cellOf={cellOf}
                  focus={focus}
                  setFocus={setFocus}
                  toggle={toggle}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}

function RoleViewGroup({
  module,
  rows,
  cellOf,
  focus,
  setFocus,
  toggle,
}: {
  module: string;
  rows: { view: ViewDto; flatIndex: number }[];
  cellOf: (viewId: string) => Cell;
  focus: { row: number; col: number };
  setFocus: (f: { row: number; col: number }) => void;
  toggle: (viewId: string, key: PermKey) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={PERM_KEYS.length + 1} className="bg-[#0E0E12] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A5A60]">
          {module}
        </td>
      </tr>
      {rows.map(({ view, flatIndex }) => {
        const c = cellOf(view.id);
        return (
          <tr key={view.id} className="border-b border-[#1A1A1F]/70">
            <td className="px-4 py-2 text-[#E8E8EB]">{view.name}</td>
            {PERM_KEYS.map((k, colIndex) => {
              const on = c[k];
              const focused = focus.row === flatIndex && focus.col === colIndex;
              return (
                <td key={k} className="px-2 py-2 text-center" data-cell={`${flatIndex}-${colIndex}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setFocus({ row: flatIndex, col: colIndex });
                      toggle(view.id, k);
                    }}
                    onMouseEnter={() => setFocus({ row: flatIndex, col: colIndex })}
                    aria-label={`${view.name} ${PERM_LABELS[k]}`}
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded border transition-colors',
                      on ? 'border-[#E8A020]/60 bg-[#E8A020]/15 text-[#E8A020]' : 'border-[#3A3A42] bg-[#1A1A1F] text-transparent',
                      focused && 'ring-2 ring-[#E8A020]/70',
                    )}
                  >
                    {on ? '✓' : ''}
                  </button>
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
