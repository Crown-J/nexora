// apps/nx-ui/src/features/base/role-view/RoleViewMatrixPage.tsx
/**
 * 職務權限設定 — 矩陣版（鋼鐵星球、全鍵盤）
 *
 * 上方：選職務（下拉，系統管理員不顯示，對齊既有鎖定）
 * 下方：畫面（依模組分群）× 5 種權限（瀏覽 / 新增 / 修改 / 停用 / 匯出）矩陣
 * 鍵盤：↑↓ 換畫面列、←→ 換權限欄、空白 勾選/取消、Alt+S 存檔（離開改走星球選單 Alt+X）
 * staged：本地累積、Alt+S 才批次寫入後端（create / update / delete）
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@design/utils/cn';
import { PageHeader } from '@design/components/page-header/PageHeader';
import { useDirtyGuard } from '@design/hooks/useDirtyGuard';
import { ToastStack, useToast } from '@/features/nx01/shell/ui/ToastStack';
import { listRoles, type RoleDto } from '@data/endpoints/nx01/api/role';
import {
  listViews,
  listRoleViews,
  createRoleView,
  updateRoleView,
  deleteRoleView,
  type ViewDto,
  type RoleViewPerms,
} from '@data/endpoints/nx01/api/role-view';

// T1-fix-b 進貨對齊批次 2026-06-07：加第 6 欄「核准」（canApprove、schema 已預埋）
// 業務語意：核准權限只對有審核流程的畫面有意義（採購單 NX02_PO / 保固 NX02_WARRANTY / 盤點 NX03_STOCK_TAKE 等）；
// 其他畫面勾了不會生效（後端 service 只在需要核准的 transition 才檢查）。
const PERM_KEYS = ['canRead', 'canCreate', 'canUpdate', 'canDelete', 'canExport', 'canApprove'] as const;
type PermKey = (typeof PERM_KEYS)[number];
const PERM_LABELS: Record<PermKey, string> = {
  canRead: '瀏覽',
  canCreate: '新增',
  canUpdate: '修改',
  canDelete: '停用',
  canExport: '匯出',
  canApprove: '核准',
};

// 模組內碼 → 中文名（不顯示 NX01 這種內碼給用戶）
const MODULE_LABELS: Record<string, string> = {
  NX01: '主資料中心',
  NX02: '進貨作業',
  NX03: '銷貨作業',
  NX04: '庫存管理',
  NX05: '財務管理',
  NX06: '物流配送',
  NX07: '人資管理',
  NX08: '報表分析',
  NX09: '知識中心',
  NX99: '系統管理',
};
function moduleLabel(mc: string): string {
  return MODULE_LABELS[String(mc ?? '').trim().toUpperCase()] ?? (mc || '其他');
}

type Cell = { recordId: string | null; canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean; canExport: boolean; canApprove: boolean };
const EMPTY_CELL: Omit<Cell, 'recordId'> = { canRead: false, canCreate: false, canUpdate: false, canDelete: false, canExport: false, canApprove: false };

// 全鍵盤焦點導覽列：模組標題列（可收合）或畫面列
type NavRow =
  | { type: 'header'; module: string; viewIds: string[] }
  | { type: 'view'; view: ViewDto };

export function RoleViewMatrixPage() {
  const { toasts, showToast } = useToast();

  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [roleId, setRoleId] = useState<string>('');
  const [views, setViews] = useState<ViewDto[]>([]);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [original, setOriginal] = useState<Record<string, Cell>>({});
  const [focus, setFocus] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  // 單一展開（手風琴）：null = 全部收起；同時只展開一個模組。預設全部收起。
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 職務下拉（後端 list 已對非 SYSADMIN 過濾系統管理員；前端再保險過濾）
  useEffect(() => {
    void (async () => {
      try {
        const res = await listRoles({ pageSize: 100, isActive: true });
        // 系統管理員 + 負責人（OWNER）都擁有全部權限、不在此設定（對齊既有鎖定）
        const list = res.items.filter((r) => !['SYSADMIN', 'OWNER'].includes(String(r.code).trim().toUpperCase()));
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
            canApprove: rv.canApprove ?? false,
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

  // 整列全選：該畫面 5 權限全勾 / 全清（已全勾→清空、否則全勾）
  const toggleViewAll = useCallback((viewId: string) => {
    setCells((prev) => {
      const cur = prev[viewId] ?? { recordId: null, ...EMPTY_CELL };
      const allOn = PERM_KEYS.every((k) => cur[k]);
      const next = !allOn;
      return { ...prev, [viewId]: { ...cur, canRead: next, canCreate: next, canUpdate: next, canDelete: next, canExport: next, canApprove: next } };
    });
  }, []);

  // 整模組全選：該模組所有畫面 5 權限全勾 / 全清
  const toggleModuleAll = useCallback((viewIds: string[]) => {
    setCells((prev) => {
      const allOn = viewIds.every((vid) => { const c = prev[vid] ?? { recordId: null, ...EMPTY_CELL }; return PERM_KEYS.every((k) => c[k]); });
      const next = !allOn;
      const out = { ...prev };
      for (const vid of viewIds) {
        const cur = out[vid] ?? { recordId: null, ...EMPTY_CELL };
        out[vid] = { ...cur, canRead: next, canCreate: next, canUpdate: next, canDelete: next, canExport: next, canApprove: next };
      }
      return out;
    });
  }, []);

  // 依 moduleCode 分群
  const groups = useMemo(() => {
    const out: { module: string; rows: ViewDto[] }[] = [];
    for (const view of views) {
      const mc = view.moduleCode || 'OTHER';
      let g = out.find((x) => x.module === mc);
      if (!g) { g = { module: mc, rows: [] }; out.push(g); }
      g.rows.push(view);
    }
    return out;
  }, [views]);

  // 導覽列（全鍵盤焦點模型）：模組標題列 + 「目前展開那一個」模組的畫面列；其餘只留標題列。
  const navRows = useMemo<NavRow[]>(() => {
    const out: NavRow[] = [];
    for (const g of groups) {
      out.push({ type: 'header', module: g.module, viewIds: g.rows.map((v) => v.id) });
      if (g.module === expandedModule) for (const v of g.rows) out.push({ type: 'view', view: v });
    }
    return out;
  }, [groups, expandedModule]);

  // 手風琴：展開一個會自動收起其他；一次只展開一個。
  const toggleCollapse = useCallback((module: string, force?: 'open' | 'close') => {
    setExpandedModule((cur) => {
      if (force === 'open') return module; // 展開此模組（其餘自動收起）
      if (force === 'close') return cur === module ? null : cur; // 收起此模組
      return cur === module ? null : module; // 切換
    });
  }, []);

  // navRows 縮短（收合）時夾住 focus.row 不越界
  useEffect(() => {
    setFocus((f) => (f.row > navRows.length - 1 ? { ...f, row: Math.max(0, navRows.length - 1) } : f));
  }, [navRows.length]);

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
        const perms: RoleViewPerms = { canRead: c.canRead, canCreate: c.canCreate, canUpdate: c.canUpdate, canDelete: c.canDelete, canExport: c.canExport, canApprove: c.canApprove };
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
      for (const rv of res.items) map[rv.viewId] = { recordId: rv.id, canRead: rv.canRead, canCreate: rv.canCreate, canUpdate: rv.canUpdate, canDelete: rv.canDelete, canExport: rv.canExport, canApprove: rv.canApprove ?? false };
      setCells(map);
      setOriginal(structuredClone(map));
    })();
  }, [roleId, views, cells, original, showToast]);

  // Phase 2 後續軌:全域 dirty 攔截、跨頁跳轉前用 window.confirm 詢問（本頁無 3-way、純 yes/no）
  useDirtyGuard(
    () => isDirty,
    useCallback((proceed) => {
      if (window.confirm('有未存檔的權限變更、確定離開？')) proceed();
    }, []),
  );

  // 鍵盤：↑↓ 換列、←→ 換欄、空白 勾選、Alt+S 存檔（離開改走星球選單 Alt+X、[1-2] 2026-06-05 Alt+Q 移除）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 's') { e.preventDefault(); handleSave(); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          // Alt+↑↓：切上 / 下一個職務
          e.preventDefault();
          const idx = roles.findIndex((r) => r.id === roleId);
          const ni = e.key === 'ArrowDown' ? Math.min(roles.length - 1, idx + 1) : Math.max(0, idx - 1);
          if (roles[ni]) setRoleId(roles[ni].id);
        }
        return;
      }
      if (tag === 'select') return; // 職務下拉自己處理
      if (navRows.length === 0) return;
      const cur = navRows[Math.min(focus.row, navRows.length - 1)];
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus((f) => ({ ...f, row: e.key === 'ArrowDown' ? Math.min(navRows.length - 1, f.row + 1) : Math.max(0, f.row - 1) }));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (cur?.type === 'header') {
          // 模組標題列：→ 展開、← 收合
          toggleCollapse(cur.module, e.key === 'ArrowRight' ? 'open' : 'close');
        } else {
          setFocus((f) => ({ ...f, col: e.key === 'ArrowRight' ? Math.min(PERM_KEYS.length - 1, f.col + 1) : Math.max(0, f.col - 1) }));
        }
      } else if (e.key === 'Enter') {
        // 模組標題列：Enter 切換收合 / 展開
        if (cur?.type === 'header') { e.preventDefault(); toggleCollapse(cur.module); }
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (cur?.type === 'header') toggleCollapse(cur.module);
        else if (cur?.type === 'view') toggle(cur.view.id, PERM_KEYS[focus.col]);
      } else if (e.key.toLowerCase() === 'a') {
        // A：該畫面整列 5 權限全勾 / 全清
        e.preventDefault();
        if (cur?.type === 'view') toggleViewAll(cur.view.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navRows, focus, roles, roleId, toggle, toggleViewAll, toggleCollapse, handleSave]);

  // 焦點列捲入視野
  useEffect(() => {
    panelRef.current?.querySelector(`[data-navrow="${focus.row}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  const selectedRole = roles.find((r) => r.id === roleId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
      <PageHeader category="帳號與權限" title="職務權限設定" count={`${views.length} 個畫面`} />

      {/* 工具列：職務下拉 + 存檔 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/40 bg-background/40 px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">職務</span>
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="cursor-pointer rounded-md border border-[#E8A020]/30 bg-background/40 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40"
        >
          {roles.length === 0 ? <option value="">（無可設定職務）</option> : null}
          {roles.map((r) => (
            <option key={r.id} value={r.id} className="bg-popover">{r.name}</option>
          ))}
        </select>
        {selectedRole ? <span className="text-xs text-muted-foreground/70">為「{selectedRole.name}」設定各畫面權限</span> : null}
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
              : 'cursor-not-allowed border-border/40 text-muted-foreground/70',
          )}
        >
          存檔 (Alt+S)
        </button>
      </div>

      {/* 矩陣 */}
      <div ref={panelRef} className="min-h-0 flex-1 overflow-auto nx-master-scroll">
        {views.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
            {loading ? '載入中…' : '尚無畫面字典（需先 seed nx01_view 畫面清單，矩陣才有畫面可設權限）'}
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: '34%' }} />
              {PERM_KEYS.map((k) => (
                <col key={k} style={{ width: '11%' }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10" style={{ backgroundImage: 'linear-gradient(180deg, rgba(20,20,26,0.97) 0%, rgba(16,16,20,0.97) 100%)' }}>
              <tr className="border-b border-border/40 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/90">
                <th className="px-4 py-2.5 text-left">畫面</th>
                {PERM_KEYS.map((k) => (
                  <th key={k} className="px-2 py-2.5 text-center">{PERM_LABELS[k]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {navRows.map((nr, idx) => {
                if (nr.type === 'header') {
                  const isCollapsed = expandedModule !== nr.module;
                  const moduleAllOn =
                    nr.viewIds.length > 0 &&
                    nr.viewIds.every((vid) => { const c = cellOf(vid); return PERM_KEYS.every((k) => c[k]); });
                  const headerFocused = focus.row === idx;
                  return (
                    <tr key={`h_${nr.module}`} data-navrow={idx} className="scroll-mt-10">
                      <td
                        colSpan={PERM_KEYS.length + 1}
                        className={cn('bg-background/40 px-4 py-2', headerFocused && 'ring-1 ring-inset ring-[#E8A020]/50')}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleCollapse(nr.module)}
                            onMouseEnter={() => setFocus({ row: idx, col: 0 })}
                            title={isCollapsed ? '展開（→ / Enter）' : '收合（← / Enter）'}
                            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-foreground/90 transition-colors hover:text-[#E8A020]"
                          >
                            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                            {moduleLabel(nr.module)}
                            <span className="text-[10px] font-normal text-muted-foreground/70">（{nr.viewIds.length}）</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleModuleAll(nr.viewIds)}
                            title="本模組所有畫面 6 種權限一次全勾 / 全清"
                            className={cn(
                              'inline-flex h-7 items-center gap-1.5 rounded-md border px-3 text-[11px] font-semibold transition-colors',
                              moduleAllOn
                                ? 'border-[#E8A020]/60 bg-[#E8A020]/22 text-[#E8A020] hover:bg-[#E8A020]/30'
                                : 'border-[#E8A020]/35 bg-[#E8A020]/10 text-[#E8A020] hover:border-[#E8A020]/60 hover:bg-[#E8A020]/20',
                            )}
                          >
                            <CheckCheck className="size-3.5" />
                            {moduleAllOn ? '整模組清除' : '整模組全選'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                const view = nr.view;
                const c = cellOf(view.id);
                const viewAllOn = PERM_KEYS.every((k) => c[k]);
                return (
                  <tr key={view.id} data-navrow={idx} className="scroll-mt-10 border-b border-[#1A1A1F]/70">
                    <td className="px-4 py-2 text-foreground">
                      <div className="flex items-center justify-between gap-2 pl-5">
                        <span className="truncate">{view.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleViewAll(view.id)}
                          title="本畫面 6 種權限一次全勾 / 全清（鍵盤：A）"
                          className={cn(
                            'inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition-colors',
                            viewAllOn
                              ? 'border-[#E8A020]/55 bg-[#E8A020]/18 text-[#E8A020] hover:bg-[#E8A020]/28'
                              : 'border-[#3A3A42] bg-card/60 text-foreground/80 hover:border-[#E8A020]/45 hover:bg-[#E8A020]/12 hover:text-[#E8A020]',
                          )}
                        >
                          <CheckCheck className="size-3" />
                          {viewAllOn ? '清除' : '全選'}
                        </button>
                      </div>
                    </td>
                    {PERM_KEYS.map((k, colIndex) => {
                      const on = c[k];
                      const focused = focus.row === idx && focus.col === colIndex;
                      return (
                        <td key={k} className="px-2 py-2 text-center" data-cell={`${idx}-${colIndex}`}>
                          <button
                            type="button"
                            onClick={() => {
                              setFocus({ row: idx, col: colIndex });
                              toggle(view.id, k);
                            }}
                            onMouseEnter={() => setFocus({ row: idx, col: colIndex })}
                            aria-label={`${view.name} ${PERM_LABELS[k]}`}
                            className={cn(
                              'inline-flex size-6 items-center justify-center rounded border transition-colors',
                              on ? 'border-[#E8A020]/60 bg-[#E8A020]/15 text-[#E8A020]' : 'border-[#3A3A42] bg-card/60 text-transparent',
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
            </tbody>
          </table>
        )}
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}
