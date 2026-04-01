/**
 * File: apps/nx-ui/src/features/base/role/BaseRoleMasterView.tsx
 *
 * Purpose:
 * - 職務主檔：LIST + SLIDE（與使用者主檔相同互動）；僅維護職務欄位，成員指派請至「使用者職務設定」
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { createRole, listRoles, updateRole, type RoleDto } from '@/features/base/api/role';
import type { BaseRoleRow } from './mock-data';

type ListColKey =
  | 'code'
  | 'name'
  | 'sortOrder'
  | 'isActive'
  | 'isSystem'
  | 'description'
  | 'createdAt'
  | 'createdBy'
  | 'createdByName'
  | 'updatedAt'
  | 'updatedBy'
  | 'updatedByName';
type SortKey = ListColKey;
type SortDir = 'asc' | 'desc';

type DetailDraft = {
  code: string;
  name: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
  isSystem: boolean;
};

const PAGE_SIZE = 10;
const LIST_COL_PREF_VERSION = 2;
const LIST_COL_PREF_KEY = 'base.role.listcols';
const ALL_LIST_COLS: ListColKey[] = [
  'code',
  'name',
  'sortOrder',
  'isActive',
  'isSystem',
  'description',
  'createdAt',
  'createdBy',
  'createdByName',
  'updatedAt',
  'updatedBy',
  'updatedByName',
];
const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  code: { label: '代碼', locked: true },
  name: { label: '名稱' },
  sortOrder: { label: '排序' },
  isActive: { label: '狀態' },
  isSystem: { label: '系統內建' },
  description: { label: '說明' },
  createdAt: { label: '建立時間' },
  createdBy: { label: '建立人ID' },
  createdByName: { label: '建立人' },
  updatedAt: { label: '修改時間' },
  updatedBy: { label: '修改人ID' },
  updatedByName: { label: '修改人' },
};

type RoleListColPref = { visibleCols: ListColKey[]; colOrder: ListColKey[] };
const DEFAULT_COL_PREF: RoleListColPref = {
  visibleCols: [...ALL_LIST_COLS],
  colOrder: [...ALL_LIST_COLS],
};

function normalizeColPref(raw: RoleListColPref): RoleListColPref {
  const order = ALL_LIST_COLS.filter((k) => raw.colOrder.includes(k));
  for (const k of ALL_LIST_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => ALL_LIST_COLS.includes(k));
  if (!vis.includes('code')) vis = ['code', ...vis];
  return { colOrder: order, visibleCols: vis };
}

function emptyDraft(): DetailDraft {
  return { code: '', name: '', description: '', sortOrder: '100', isActive: true, isSystem: false };
}

function draftFromRole(r: BaseRoleRow): DetailDraft {
  return {
    code: r.code,
    name: r.name,
    description: r.description,
    sortOrder: String(r.sortOrder),
    isActive: r.isActive,
    isSystem: Boolean(r.isSystem),
  };
}

function roleDtoToRow(r: RoleDto): BaseRoleRow {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? '',
    sortOrder: r.sortNo,
    isActive: r.isActive,
    isSystem: r.isSystem,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    createdBy: r.createdBy ?? null,
    createdByName: r.createdByName ?? '—',
    updatedBy: r.updatedBy ?? null,
    updatedByName: r.updatedByName ?? '—',
  };
}

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

export function BaseRoleMasterView() {
  const [roles, setRoles] = useState<BaseRoleRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [activePick, setActivePick] = useState<'all' | 'active' | 'inactive'>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'sortOrder', dir: 'asc' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [detailDraft, setDetailDraft] = useState<DetailDraft>(() => emptyDraft());
  const [baselineDetail, setBaselineDetail] = useState<DetailDraft>(() => emptyDraft());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('main');
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const colPickerWrapRef = useRef<HTMLDivElement>(null);

  const { value: colPref, setValue: setColPref } = useListLocalPref<RoleListColPref>(
    LIST_COL_PREF_KEY,
    LIST_COL_PREF_VERSION,
    DEFAULT_COL_PREF,
  );
  const listCols = useMemo(() => normalizeColPref(colPref), [colPref]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rr = await listRoles({ page: 1, pageSize: 200 });
      setRoles(rr.items.map(roleDtoToRow).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!colPickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = colPickerWrapRef.current;
      if (el && !el.contains(e.target as Node)) setColPickerOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [colPickerOpen]);

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return roles.filter((r) => {
      if (activePick === 'active' && !r.isActive) return false;
      if (activePick === 'inactive' && r.isActive) return false;
      if (k) {
        const blob = `${r.code} ${r.name} ${r.description}`.toLowerCase();
        if (!blob.includes(k)) return false;
      }
      return true;
    });
  }, [roles, keyword, activePick]);

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sk = sort.key;
    const out = [...filtered];
    out.sort((a, b) => {
      switch (sk) {
        case 'code':
          return mult * a.code.localeCompare(b.code, 'zh-Hant');
        case 'name':
          return mult * a.name.localeCompare(b.name, 'zh-Hant');
        case 'sortOrder':
          return mult * (a.sortOrder - b.sortOrder);
        case 'isActive':
          return mult * ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
        case 'description':
          return mult * a.description.localeCompare(b.description, 'zh-Hant');
        case 'isSystem':
          return mult * ((a.isSystem ? 1 : 0) - (b.isSystem ? 1 : 0));
        case 'createdAt':
          return mult * String(a.createdAt).localeCompare(String(b.createdAt));
        case 'updatedAt':
          return mult * String(a.updatedAt ?? '').localeCompare(String(b.updatedAt ?? ''));
        case 'createdBy':
          return mult * (a.createdBy ?? '').localeCompare(b.createdBy ?? '');
        case 'createdByName':
          return mult * (a.createdByName ?? '').localeCompare(b.createdByName ?? '', 'zh-Hant');
        case 'updatedBy':
          return mult * (a.updatedBy ?? '').localeCompare(b.updatedBy ?? '');
        case 'updatedByName':
          return mult * (a.updatedByName ?? '').localeCompare(b.updatedByName ?? '', 'zh-Hant');
        default:
          return 0;
      }
    });
    return out;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, safePage]);

  const filterKey = `${keyword}|${activePick}`;
  const prevFilterKeyRef = useRef('');
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPage(1);
      return;
    }
    setPage((p) => Math.min(p, totalPages));
  }, [filterKey, totalPages]);

  const selectedRole = useMemo(
    () => (selectedId ? roles.find((r) => r.id === selectedId) ?? null : null),
    [roles, selectedId],
  );

  const panelOpen = creating || selectedId != null;

  const orderedVisibleCols = useMemo(
    () => listCols.colOrder.filter((k) => listCols.visibleCols.includes(k)),
    [listCols.colOrder, listCols.visibleCols],
  );

  const selectedIdxSorted = useMemo(
    () => (selectedId ? sortedRows.findIndex((r) => r.id === selectedId) : -1),
    [sortedRows, selectedId],
  );

  const closeDetailFull = useCallback(() => {
    setCreating(false);
    setSelectedId(null);
    setDetailTab('main');
    setDetailFullscreen(false);
    setSaveConfirmOpen(false);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      closeDetailFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, closeDetailFull]);

  useEffect(() => {
    setDetailFullscreen(false);
  }, [selectedId, creating]);

  const goDetailPrev = useCallback(() => {
    if (creating || selectedIdxSorted <= 0) return;
    const prev = sortedRows[selectedIdxSorted - 1];
    if (!prev) return;
    setSelectedId(prev.id);
    setCreating(false);
  }, [creating, selectedIdxSorted, sortedRows]);

  const goDetailNext = useCallback(() => {
    if (creating || selectedIdxSorted < 0 || selectedIdxSorted >= sortedRows.length - 1) return;
    const next = sortedRows[selectedIdxSorted + 1];
    if (!next) return;
    setSelectedId(next.id);
    setCreating(false);
  }, [creating, selectedIdxSorted, sortedRows]);

  useEffect(() => {
    if (creating) {
      setDetailDraft(emptyDraft());
      setBaselineDetail(emptyDraft());
      return;
    }
    if (selectedRole) {
      const d = draftFromRole(selectedRole);
      setDetailDraft(d);
      setBaselineDetail(d);
    }
  }, [creating, selectedId, selectedRole]);

  const detailDirty = useMemo(() => {
    if (creating) {
      return (
        detailDraft.code.trim() !== '' ||
        detailDraft.name.trim() !== '' ||
        detailDraft.description.trim() !== '' ||
        detailDraft.sortOrder !== '100' ||
        !detailDraft.isActive
      );
    }
    return JSON.stringify(detailDraft) !== JSON.stringify(baselineDetail);
  }, [baselineDetail, creating, detailDraft]);

  const onRowClick = (id: string) => {
    if (id === selectedId && !creating) {
      closeDetailFull();
      return;
    }
    setSelectedId(id);
    setCreating(false);
  };

  const onAdd = () => {
    setSelectedId(null);
    setCreating(true);
  };

  const onReset = () => {
    if (creating) {
      setDetailDraft(emptyDraft());
      return;
    }
    setDetailDraft({ ...baselineDetail });
  };

  const performSave = async () => {
    const code = detailDraft.code.trim().toUpperCase();
    const name = detailDraft.name.trim();
    if (!code || !name) return;
    const sortN = Number.parseInt(detailDraft.sortOrder, 10);
    const sortOrder = Number.isFinite(sortN) ? sortN : 0;
    setSaving(true);
    setError(null);
    setSaveConfirmOpen(false);
    try {
      if (creating) {
        const dto = await createRole({
          code,
          name,
          description: detailDraft.description.trim() || null,
          isSystem: false,
          isActive: detailDraft.isActive,
          sortNo: sortOrder,
        });
        const row = roleDtoToRow(dto);
        setRoles((prev) => [...prev, row].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)));
        setCreating(false);
        setSelectedId(row.id);
        const d = draftFromRole(row);
        setDetailDraft(d);
        setBaselineDetail(d);
        return;
      }
      if (!selectedId || !selectedRole) return;
      const dto = await updateRole(selectedId, {
        code,
        name,
        description: detailDraft.description.trim() || null,
        isActive: detailDraft.isActive,
        sortNo: sortOrder,
      });
      const row = roleDtoToRow(dto);
      setRoles((prev) => prev.map((r) => (r.id === selectedId ? row : r)));
      setBaselineDetail({ ...detailDraft });
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sort.key !== key) return <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />;
    return sort.dir === 'asc' ? (
      <ArrowUp className="size-3.5" aria-hidden />
    ) : (
      <ArrowDown className="size-3.5" aria-hidden />
    );
  };

  const readonlyFieldCls = 'bg-muted/40 text-muted-foreground cursor-default';

  const renderBodyCell = (row: BaseRoleRow, key: ListColKey) => {
    switch (key) {
      case 'code':
        return (
          <td key={key} className="max-w-[140px] truncate px-2 py-2.5 font-mono text-xs text-foreground">
            {row.code}
          </td>
        );
      case 'name':
        return (
          <td key={key} className="max-w-[200px] truncate px-2 py-2.5 text-foreground">
            {row.name}
          </td>
        );
      case 'sortOrder':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 tabular-nums text-muted-foreground">
            {row.sortOrder}
          </td>
        );
      case 'isActive':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5">
            <span
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-md text-xs font-medium',
                row.isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/15 text-destructive',
              )}
            >
              {row.isActive ? '✓' : '×'}
            </span>
          </td>
        );
      case 'description':
        return (
          <td key={key} className="max-w-[240px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.description || '—'}
          </td>
        );
      case 'isSystem':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5">
            <span
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-md text-xs font-medium',
                row.isSystem ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300' : 'bg-muted text-muted-foreground',
              )}
            >
              {row.isSystem ? 'S' : '—'}
            </span>
          </td>
        );
      case 'createdAt':
      case 'updatedAt':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs text-muted-foreground">
            {formatDt(row[key] as string | null)}
          </td>
        );
      case 'createdBy':
      case 'updatedBy':
      case 'createdByName':
      case 'updatedByName':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 font-mono text-xs text-muted-foreground">
            {(row[key] as string | null | undefined) ?? '—'}
          </td>
        );
      default:
        return null;
    }
  };

  const tableMinW = Math.max(360, 32 + orderedVisibleCols.length * 100 + 40);
  const auditSource = creating ? null : selectedRole;

  return (
    <>
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <span>
            若要為職務指派／移除使用者，請至{' '}
            <Link href="/base/user-role" className="font-medium text-primary underline-offset-4 hover:underline">
              使用者職務設定
            </Link>
            。
          </span>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="glass-card rounded-2xl border border-border/80 p-3 shadow-sm sm:p-4">
          <div className="relative flex flex-col gap-3" ref={colPickerWrapRef}>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Input
                id="br-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="代碼、名稱、說明…"
                autoComplete="off"
                className="h-9 min-w-[min(100%,12rem)] flex-1 basis-full sm:basis-[18rem] sm:max-w-xl"
              />
              <div
                className="flex flex-1 flex-wrap items-center gap-1 basis-full sm:basis-auto"
                role="group"
                aria-label="依啟用狀態篩選"
              >
                {(
                  [
                    { k: 'all' as const, label: '全部' },
                    { k: 'active' as const, label: '啟用' },
                    { k: 'inactive' as const, label: '停用' },
                  ] as const
                ).map(({ k, label }) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActivePick(k)}
                    className={cn(
                      'rounded-lg border border-transparent px-2.5 py-1.5 text-xs transition-colors sm:text-sm',
                      activePick === k
                        ? 'border-primary/35 bg-primary/10 font-medium text-primary'
                        : 'text-foreground hover:bg-secondary/60',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border/50 pt-3">
              <div
                className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/20 p-0.5"
                role="navigation"
                aria-label="分頁"
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  disabled={safePage <= 1 || loading}
                  onClick={() => setPage(1)}
                  aria-label="第一頁"
                  title="第一頁"
                >
                  <ChevronsLeft className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  disabled={safePage <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="上一頁"
                  title="上一頁"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </Button>
                <span className="min-w-[3.25rem] px-1 text-center text-xs tabular-nums text-muted-foreground">
                  {safePage}/{totalPages}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  disabled={safePage >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="下一頁"
                  title="下一頁"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  disabled={safePage >= totalPages || loading}
                  onClick={() => setPage(totalPages)}
                  aria-label="最後一頁"
                  title="最後一頁"
                >
                  <ChevronsRight className="size-4" aria-hidden />
                </Button>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1 px-2"
                onClick={() => setColPickerOpen((o) => !o)}
                aria-expanded={colPickerOpen}
                aria-label="列表欄位設定"
              >
                <Columns3 className="size-4" aria-hidden />
                欄位
              </Button>

              <Button type="button" size="sm" variant="default" onClick={onAdd} disabled={loading || saving}>
                新增
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => void reload()} disabled={loading}>
                重新載入
              </Button>

              <span className="ms-auto text-xs text-muted-foreground tabular-nums">
                {loading ? '載入中…' : `共 ${sortedRows.length} 筆 · 本頁 ${pageRows.length} 筆`}
              </span>

              {colPickerOpen ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 w-full min-w-[min(100%,320px)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg sm:left-auto sm:right-0 sm:w-[min(100vw-2rem,320px)]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">顯示欄位（可拖曳排序）</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        setColPref({
                          visibleCols: [...ALL_LIST_COLS],
                          colOrder: [...ALL_LIST_COLS],
                        })
                      }
                    >
                      重置
                    </Button>
                  </div>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {listCols.colOrder.map((key) => {
                      const def = COL_DEF[key];
                      const checked = listCols.visibleCols.includes(key);
                      const locked = Boolean(def.locked);
                      return (
                        <div
                          key={key}
                          draggable
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-card px-2 py-2 text-xs"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', key);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const from = e.dataTransfer.getData('text/plain') as ListColKey;
                            if (!ALL_LIST_COLS.includes(from)) return;
                            setColPref((p) => {
                              const norm = normalizeColPref(p);
                              const fromIdx = norm.colOrder.indexOf(from);
                              const toIdx = norm.colOrder.indexOf(key);
                              if (fromIdx < 0 || toIdx < 0) return norm;
                              return { ...norm, colOrder: arrayMove(norm.colOrder, fromIdx, toIdx) };
                            });
                          }}
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              className="size-3.5 rounded border border-input accent-primary"
                              checked={locked ? true : checked}
                              disabled={locked}
                              onChange={() => {
                                if (locked) return;
                                setColPref((p) => {
                                  const norm = normalizeColPref(p);
                                  const has = norm.visibleCols.includes(key);
                                  const nextVis = has
                                    ? norm.visibleCols.filter((k) => k !== key)
                                    : [...norm.visibleCols, key];
                                  return normalizeColPref({ ...norm, visibleCols: nextVis });
                                });
                              }}
                            />
                            <span>{def.label}</span>
                          </label>
                          <span className="text-muted-foreground" aria-hidden>
                            ⠿
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="glass-card flex min-h-[min(420px,70dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 shadow-sm lg:min-h-[420px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
              <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-x-contain pr-2">
                <table className="w-full border-collapse text-sm" style={{ minWidth: tableMinW }}>
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-left text-muted-foreground">
                        {orderedVisibleCols.map((key) => (
                          <th key={key} className="px-2 py-2.5">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                              onClick={() => toggleSort(key)}
                            >
                              {COL_DEF[key].label}
                              {sortIcon(key)}
                            </button>
                          </th>
                        ))}
                        <th className="w-10 px-1 py-2.5" aria-hidden />
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row) => {
                        const isSel = row.id === selectedId;
                        return (
                          <tr
                            key={row.id}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              'cursor-pointer border-b border-border/40 transition-colors',
                              isSel ? 'bg-primary/10' : 'hover:bg-secondary/40',
                            )}
                            onClick={() => onRowClick(row.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onRowClick(row.id);
                              }
                            }}
                          >
                            {orderedVisibleCols.map((k) => renderBodyCell(row, k))}
                            <td className="px-1 py-2.5 text-muted-foreground">
                              <ChevronRight className="mx-auto size-4 opacity-50" aria-hidden />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                </table>
              </div>
            </div>
        </section>
      </div>

      {panelOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/55 backdrop-blur-[2px] dark:bg-background/70"
            aria-hidden
            onClick={closeDetailFull}
            role="button"
            tabIndex={-1}
          />

          <aside
            className={cn(
              'glass-card flex flex-col overflow-y-auto overscroll-contain border-border/80 bg-background shadow-2xl transition-[transform,opacity,box-shadow] duration-300 ease-out',
              detailFullscreen
                ? 'fixed left-1/2 top-1/2 z-50 w-[min(92vw,42rem)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-2xl max-h-[min(85dvh,calc(100dvh-3.5rem-6.5rem))] sm:w-[min(90vw,48rem)]'
                : 'fixed inset-0 z-50 max-h-[100dvh] rounded-none border-0 max-lg:border-0 lg:inset-auto lg:right-4 lg:top-24 lg:bottom-4 lg:left-auto lg:h-auto lg:max-h-[calc(100vh-7rem)] lg:w-[min(440px,calc(100vw-2rem))] lg:rounded-2xl lg:border lg:shadow-2xl',
            )}
            aria-modal="true"
            role="dialog"
            aria-labelledby="br-detail-title"
          >
            <div
              className={cn(
                'flex min-w-0 flex-col',
                'min-h-0 flex-1 p-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-4',
                detailFullscreen &&
                  'w-full max-w-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6',
              )}
            >
              <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 pb-3 lg:border-0 lg:pb-0">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 lg:hidden"
                    aria-label="返回列表"
                    onClick={closeDetailFull}
                  >
                    <ArrowLeft className="size-5" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
                    <h2 id="br-detail-title" className="mt-0.5 truncate text-base font-semibold text-foreground lg:text-sm">
                      {creating ? '新增職務' : auditSource?.name ?? '職務明細'}
                    </h2>
                    {!creating && auditSource ? (
                      <p className="truncate text-xs text-muted-foreground font-mono">{auditSource.code}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!creating && selectedIdxSorted >= 0 ? (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="hidden size-8 lg:inline-flex"
                        aria-label="上一筆"
                        disabled={selectedIdxSorted <= 0}
                        onClick={goDetailPrev}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="hidden size-8 lg:inline-flex"
                        aria-label="下一筆"
                        disabled={selectedIdxSorted >= sortedRows.length - 1}
                        onClick={goDetailNext}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="inline-flex size-8"
                    aria-label={detailFullscreen ? '結束全螢幕' : '全螢幕明細'}
                    onClick={() => setDetailFullscreen((v) => !v)}
                  >
                    {detailFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="關閉" onClick={closeDetailFull}>
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4 flex flex-col gap-0">
                <TabsList className="h-auto w-full shrink-0 flex-wrap justify-start gap-1 bg-muted/50 p-1">
                  <TabsTrigger value="main" className="flex-none">
                    基本資料
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="flex-none">
                    稽核
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="main" className="mt-3 outline-none">
                  <div className="space-y-3 pb-28 lg:pb-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="br-d-code">代碼</Label>
                        <Input
                          id="br-d-code"
                          value={detailDraft.code}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, code: e.target.value }))}
                          placeholder="例：ADMIN"
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="br-d-name">名稱</Label>
                        <Input
                          id="br-d-name"
                          value={detailDraft.name}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, name: e.target.value }))}
                          placeholder="職務顯示名稱"
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="br-d-sort">排序</Label>
                        <Input
                          id="br-d-sort"
                          inputMode="numeric"
                          value={detailDraft.sortOrder}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, sortOrder: e.target.value }))}
                          placeholder="數字越小越前面"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="br-d-desc">說明</Label>
                        <Textarea
                          id="br-d-desc"
                          value={detailDraft.description}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, description: e.target.value }))}
                          placeholder="職務職責摘要（選填）"
                          rows={3}
                          className="min-h-[88px] resize-y"
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-2 sm:col-span-2">
                        <input
                          id="br-d-active"
                          type="checkbox"
                          className="size-4 rounded border border-input accent-primary"
                          checked={detailDraft.isActive}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, isActive: e.target.checked }))}
                        />
                        <Label htmlFor="br-d-active" className="font-normal">
                          啟用
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 pb-2 sm:col-span-2">
                        <input
                          id="br-d-sys"
                          type="checkbox"
                          className="size-4 rounded border border-input accent-primary"
                          checked={detailDraft.isSystem}
                          disabled
                          readOnly
                        />
                        <Label htmlFor="br-d-sys" className="font-normal text-muted-foreground">
                          系統內建（僅顯示；新增一律為否）
                        </Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="audit" className="mt-3 outline-none">
                  <div className="space-y-3 pb-28 lg:pb-6">
                    <div className="space-y-2">
                      <Label>建立時間</Label>
                      <Input readOnly value={auditSource ? formatDt(auditSource.createdAt) : '—'} className={readonlyFieldCls} />
                    </div>
                    <div className="space-y-2">
                      <Label>建立人員（ID）</Label>
                      <Input readOnly value={auditSource?.createdBy ?? '—'} className={readonlyFieldCls} />
                    </div>
                    <div className="space-y-2">
                      <Label>建立人員（姓名）</Label>
                      <Input readOnly value={auditSource?.createdByName ?? '—'} className={readonlyFieldCls} />
                    </div>
                    <div className="space-y-2">
                      <Label>最後修改時間</Label>
                      <Input readOnly value={auditSource ? formatDt(auditSource.updatedAt) : '—'} className={readonlyFieldCls} />
                    </div>
                    <div className="space-y-2">
                      <Label>最後修改人員（ID）</Label>
                      <Input readOnly value={auditSource?.updatedBy ?? '—'} className={readonlyFieldCls} />
                    </div>
                    <div className="space-y-2">
                      <Label>最後修改人員（姓名）</Label>
                      <Input readOnly value={auditSource?.updatedByName ?? '—'} className={readonlyFieldCls} />
                    </div>
                    {creating ? <p className="text-xs text-muted-foreground">建立完成後將顯示完整稽核欄位。</p> : null}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onReset}
                  disabled={!creating && !selectedRole}
                >
                  還原
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (creating ? !detailDraft.code.trim() || !detailDraft.name.trim() : !selectedRole || !detailDirty) return;
                    setSaveConfirmOpen(true);
                  }}
                  disabled={
                    saving || (creating ? !detailDraft.code.trim() || !detailDraft.name.trim() : !selectedRole || !detailDirty)
                  }
                >
                  {saving ? '儲存中…' : '儲存'}
                </Button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      <MasterSaveConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        onConfirm={() => void performSave()}
      />
    </>
  );
}
