/**
 * File: apps/nx-ui/src/features/base/role/BaseRoleMasterView.tsx
 *
 * Purpose:
 * - 職務主檔：LIST + 置中彈窗明細（與使用者主檔相同互動）；單擊選列、雙擊開明細、↑↓／Enter、Esc 階層返回
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import { formatAuditPersonLabel } from '@/features/base/users/mock-data';
import { createRole, listRoles, setRoleActive, updateRole, type RoleDto } from '@/features/base/api/role';
import type { BaseRoleRow } from './mock-data';
import { BaseMasterModalFrame } from '@/features/base/shell/BaseMasterModalFrame';
import { MasterActiveListCell } from '@/features/base/shell/MasterActiveListCell';
import { MasterListScrollRegion } from '@/features/base/shell/MasterListScrollRegion';
import { MasterToolbarAddOrBulkActive } from '@/features/base/shell/MasterToolbarAddOrBulkActive';
import { isMasterListKeyboardBlocked } from '@/features/base/shell/baseMasterListKeyboard';
import { useMasterListRowSelection } from '@/features/base/shell/useMasterListRowSelection';

type ListColKey =
  | 'code'
  | 'name'
  | 'description'
  | 'isActive'
  | 'createdAt'
  | 'createdByPerson'
  | 'updatedAt'
  | 'updatedByPerson';
type SortKey = ListColKey;
type SortDir = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';

type EditableDraft = {
  code: string;
  name: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
  isSystem: boolean;
};

const PAGE_SIZE = 10;
const LIST_COL_PREF_VERSION = 3;
const LIST_COL_PREF_KEY = 'base.role.listcols';

const ALL_LIST_COLS: ListColKey[] = [
  'code',
  'name',
  'description',
  'isActive',
  'createdAt',
  'createdByPerson',
  'updatedAt',
  'updatedByPerson',
];

const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  code: { label: '職務代碼', locked: true },
  name: { label: '職務名稱' },
  description: { label: '職務說明' },
  isActive: { label: '啟用' },
  createdAt: { label: '建立時間' },
  createdByPerson: { label: '建立人員' },
  updatedAt: { label: '修改時間' },
  updatedByPerson: { label: '修改人員' },
};

type RoleListColPref = { visibleCols: ListColKey[]; colOrder: ListColKey[] };
const DEFAULT_COL_PREF: RoleListColPref = {
  visibleCols: [...ALL_LIST_COLS],
  colOrder: [...ALL_LIST_COLS],
};

function mapLegacyListColKey(k: string): ListColKey | null {
  if (k === 'sortOrder' || k === 'isSystem') return null;
  if (k === 'createdBy' || k === 'createdByName') return 'createdByPerson';
  if (k === 'updatedBy' || k === 'updatedByName') return 'updatedByPerson';
  return ALL_LIST_COLS.includes(k as ListColKey) ? (k as ListColKey) : null;
}

function dedupePreserveCols(keys: ListColKey[]): ListColKey[] {
  const seen = new Set<ListColKey>();
  const out: ListColKey[] = [];
  for (const k of keys) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function normalizeColPref(raw: RoleListColPref): RoleListColPref {
  const mappedOrder = dedupePreserveCols(
    raw.colOrder.map(mapLegacyListColKey).filter((k): k is ListColKey => k != null),
  );
  const order = ALL_LIST_COLS.filter((k) => mappedOrder.includes(k));
  for (const k of ALL_LIST_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = dedupePreserveCols(
    raw.visibleCols.map(mapLegacyListColKey).filter((k): k is ListColKey => k != null),
  );
  vis = vis.filter((k) => ALL_LIST_COLS.includes(k));
  if (!vis.includes('code')) vis = ['code', ...vis];
  return { colOrder: order, visibleCols: vis };
}

function emptyDraft(): EditableDraft {
  return { code: '', name: '', description: '', sortOrder: '100', isActive: true, isSystem: false };
}

function draftFromRole(r: BaseRoleRow): EditableDraft {
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
  const cbName = r.createdByName ?? null;
  const ubName = r.updatedByName ?? null;
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
    createdByUsername: r.createdByUsername ?? null,
    createdByName: cbName ?? '—',
    createdByPerson: formatAuditPersonLabel(r.createdByUsername, cbName),
    updatedBy: r.updatedBy ?? null,
    updatedByUsername: r.updatedByUsername ?? null,
    updatedByName: ubName ?? '—',
    updatedByPerson: formatAuditPersonLabel(r.updatedByUsername, ubName),
  };
}

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

function isRadixFilterMenuOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector(
    '[data-slot="dropdown-menu-content"][data-state="open"], [data-slot="dropdown-menu-sub-content"][data-state="open"]',
  );
}

export function BaseRoleMasterView() {
  const router = useRouter();
  const pathname = usePathname();
  const [roles, setRoles] = useState<BaseRoleRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'code', dir: 'asc' });
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableDraft>(() => emptyDraft());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const colPickerWrapRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLElement | null>(null);
  const listKeyboardRootRef = useRef<HTMLDivElement>(null);

  const focusListKeyboardRegion = useCallback(() => {
    requestAnimationFrame(() => {
      listKeyboardRootRef.current?.focus({ preventScroll: true });
    });
  }, []);

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
      if (activeFilter === 'active' && !r.isActive) return false;
      if (activeFilter === 'inactive' && r.isActive) return false;
      if (k) {
        const blob = `${r.code} ${r.name} ${r.description}`.toLowerCase();
        if (!blob.includes(k)) return false;
      }
      return true;
    });
  }, [roles, keyword, activeFilter]);

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
        case 'description':
          return mult * a.description.localeCompare(b.description, 'zh-Hant');
        case 'isActive':
          return mult * ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
        case 'createdAt':
          return mult * String(a.createdAt).localeCompare(String(b.createdAt));
        case 'updatedAt':
          return mult * String(a.updatedAt ?? '').localeCompare(String(b.updatedAt ?? ''));
        case 'createdByPerson':
          return mult * (a.createdByPerson ?? '').localeCompare(b.createdByPerson ?? '', 'zh-Hant');
        case 'updatedByPerson':
          return mult * (a.updatedByPerson ?? '').localeCompare(b.updatedByPerson ?? '', 'zh-Hant');
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

  const pageRowIds = useMemo(() => pageRows.map((r) => r.id), [pageRows]);
  const {
    checked,
    setChecked,
    headerCheckboxRef,
    toggleOne,
    toggleAllVisible,
    hasSelection: hasListSelection,
  } = useMasterListRowSelection(pageRowIds);

  const filterKey = `${keyword}|${activeFilter}`;
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
    setEditing(false);
    setSelectedId(null);
    setDetailFullscreen(false);
  }, []);

  const openDetail = useCallback((id: string) => {
    setSelectedId(id);
    setFocusedRowId(id);
    setCreating(false);
    setEditing(false);
  }, []);

  const moveFocusedRow = useCallback(
    (delta: number) => {
      if (sortedRows.length === 0) return;
      const cur = focusedRowId ? sortedRows.findIndex((r) => r.id === focusedRowId) : -1;
      let nextIdx: number;
      if (cur < 0) nextIdx = delta > 0 ? 0 : sortedRows.length - 1;
      else nextIdx = Math.max(0, Math.min(sortedRows.length - 1, cur + delta));
      const row = sortedRows[nextIdx];
      if (!row) return;
      setFocusedRowId(row.id);
      setPage(Math.floor(nextIdx / PAGE_SIZE) + 1);
    },
    [sortedRows, focusedRowId],
  );

  useEffect(() => {
    if (creating) return;
    if (sortedRows.length === 0) {
      setFocusedRowId(null);
      return;
    }
    setFocusedRowId((prev) => {
      if (prev != null && sortedRows.some((r) => r.id === prev)) return prev;
      return sortedRows[0]!.id;
    });
  }, [sortedRows, creating]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (colPickerOpen) {
          e.preventDefault();
          setColPickerOpen(false);
          return;
        }
        if (panelOpen) {
          e.preventDefault();
          closeDetailFull();
          return;
        }
        const onBaseSubPage = pathname != null && pathname.startsWith('/base/');
        if (onBaseSubPage) {
          e.preventDefault();
          router.push('/base');
        }
        return;
      }

      if (colPickerOpen || panelOpen) return;
      if (isMasterListKeyboardBlocked(e.target, detailPanelRef.current, panelOpen)) return;
      if (isRadixFilterMenuOpen()) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocusedRow(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocusedRow(-1);
        return;
      }
      if (e.key === 'Enter') {
        if (!focusedRowId) return;
        e.preventDefault();
        openDetail(focusedRowId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    colPickerOpen,
    panelOpen,
    closeDetailFull,
    pathname,
    router,
    moveFocusedRow,
    focusedRowId,
    openDetail,
  ]);

  useEffect(() => {
    setDetailFullscreen(false);
  }, [selectedId, creating]);

  const goDetailPrev = useCallback(() => {
    if (creating || selectedIdxSorted <= 0) return;
    const prev = sortedRows[selectedIdxSorted - 1];
    if (!prev) return;
    setSelectedId(prev.id);
    setFocusedRowId(prev.id);
    setEditing(false);
    setCreating(false);
  }, [creating, selectedIdxSorted, sortedRows]);

  const goDetailNext = useCallback(() => {
    if (creating || selectedIdxSorted < 0 || selectedIdxSorted >= sortedRows.length - 1) return;
    const next = sortedRows[selectedIdxSorted + 1];
    if (!next) return;
    setSelectedId(next.id);
    setFocusedRowId(next.id);
    setEditing(false);
    setCreating(false);
  }, [creating, selectedIdxSorted, sortedRows]);

  const formValues = useMemo(() => {
    if (editing || creating) return draft;
    if (selectedRole) return draftFromRole(selectedRole);
    return emptyDraft();
  }, [editing, creating, draft, selectedRole]);

  const onRowSingleClick = (id: string) => {
    setFocusedRowId(id);
  };

  const onRowDoubleClick = (id: string) => {
    openDetail(id);
  };

  const onAdd = () => {
    setSelectedId(null);
    setFocusedRowId(null);
    setCreating(true);
    setEditing(true);
    setDraft(emptyDraft());
  };

  const onBulkActive = async (active: boolean) => {
    if (checked.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const id of checked) {
        const dto = await setRoleActive(id, active);
        const row = roleDtoToRow(dto);
        setRoles((prev) => prev.map((r) => (r.id === id ? row : r)));
      }
      setChecked(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : '批次更新失敗');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = () => {
    if (!selectedRole) return;
    setEditing(true);
    setDraft(draftFromRole(selectedRole));
  };

  const onCancel = () => {
    if (creating) {
      setCreating(false);
      setEditing(false);
      return;
    }
    setEditing(false);
  };

  const onSave = async () => {
    const code = draft.code.trim().toUpperCase();
    const name = draft.name.trim();
    if (!code || !name) return;
    const sortN = Number.parseInt(draft.sortOrder, 10);
    const sortOrder = Number.isFinite(sortN) ? sortN : 0;
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        const dto = await createRole({
          code,
          name,
          description: draft.description.trim() || null,
          isSystem: false,
          isActive: draft.isActive,
          sortNo: sortOrder,
        });
        const row = roleDtoToRow(dto);
        setRoles((prev) => [...prev, row].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)));
        setCreating(false);
        setEditing(false);
        setSelectedId(row.id);
        setFocusedRowId(row.id);
        setDraft(draftFromRole(row));
        return;
      }
      if (!selectedId || !selectedRole) return;
      const dto = await updateRole(selectedId, {
        code: selectedRole.isSystem ? undefined : code,
        name,
        description: draft.description.trim() || null,
        isActive: draft.isActive,
        sortNo: sortOrder,
      });
      const row = roleDtoToRow(dto);
      setRoles((prev) => prev.map((r) => (r.id === selectedId ? row : r)));
      setEditing(false);
      setDraft(draftFromRole(row));
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

  const codeEditable = creating || (Boolean(editing && selectedRole && !selectedRole.isSystem));
  const auditSource = creating ? null : selectedRole;

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
      case 'isActive':
        return <MasterActiveListCell key={key} isActive={row.isActive} />;
      case 'description':
        return (
          <td key={key} className="max-w-[240px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.description || '—'}
          </td>
        );
      case 'createdAt':
      case 'updatedAt':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs text-muted-foreground">
            {formatDt(row[key] as string | null)}
          </td>
        );
      case 'createdByPerson':
      case 'updatedByPerson':
        return (
          <td key={key} className="max-w-[200px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row[key] ?? '\u2014'}
          </td>
        );
      default:
        return null;
    }
  };

  const tableMinW = Math.max(360, 40 + orderedVisibleCols.length * 112 + 48);
  const activeFilterSummary =
    activeFilter === 'all' ? '狀態：全部' : activeFilter === 'active' ? '狀態：啟用' : '狀態：停用';

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          若要為職務指派／移除使用者，請至{' '}
          <Link href="/base/user-role" className="font-medium text-primary underline-offset-4 hover:underline">
            使用者職務設定
          </Link>
          。
        </p>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="glass-card nx-glass-raised rounded-2xl border border-border/80 p-3 sm:p-4">
          <div className="relative flex min-w-0 flex-wrap items-center gap-2" ref={colPickerWrapRef}>
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

            <MasterToolbarAddOrBulkActive
              hasSelection={hasListSelection}
              loading={loading}
              saving={saving}
              onAdd={onAdd}
              onBulkEnable={() => onBulkActive(true)}
              onBulkDisable={() => onBulkActive(false)}
            />

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9 shrink-0"
              onClick={() => void reload()}
              disabled={loading}
              aria-label="重新載入"
              title="重新載入"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
            </Button>

            <Input
              id="br-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="職務代碼、名稱、說明…"
              autoComplete="off"
              className="h-9 min-w-[min(100%,10rem)] flex-1 basis-[min(100%,14rem)]"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 justify-between gap-1 px-2.5 font-normal sm:min-w-36"
                  aria-label="依啟用狀態篩選"
                >
                  <span className="truncate">{activeFilterSummary}</span>
                  <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  focusListKeyboardRegion();
                }}
              >
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">啟用與停用</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={activeFilter}
                  onValueChange={(v) => setActiveFilter(v as ActiveFilter)}
                >
                  <DropdownMenuRadioItem value="all">全部</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="active">僅啟用</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="inactive">僅停用</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="w-full text-right text-xs text-muted-foreground tabular-nums sm:ms-auto sm:w-auto">
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
        </section>

        <section className="glass-card nx-glass-raised flex min-h-[min(420px,70dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 lg:min-h-[420px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
            <MasterListScrollRegion
              scrollRef={listKeyboardRootRef}
              ariaLabel="職務列表，方向鍵選取列，Enter 開啟明細，雙擊開啟明細"
            >
              <table className="nx-master-table w-full border-collapse text-sm" style={{ minWidth: tableMinW }}>
                <thead>
                  <tr className="nx-master-thead-row text-left text-muted-foreground">
                    <th className="w-10 px-2 py-2.5">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        className="nx-master-row-checkbox"
                        aria-label="全選本頁列"
                        onChange={(e) => toggleAllVisible(e.target.checked)}
                      />
                    </th>
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
                    const isFocused = row.id === focusedRowId;
                    const isOpenDetail = !creating && panelOpen && row.id === selectedId;
                    const isHighlighted = isFocused || isOpenDetail;
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'nx-master-tbody-row cursor-pointer transition-colors duration-150',
                          isHighlighted && 'nx-row-selected',
                          isHighlighted
                            ? 'bg-primary/20 ring-1 ring-inset ring-primary/40 shadow-[inset_0_1px_0_0_rgba(244,180,0,0.14)]'
                            : 'hover:bg-primary/12 hover:shadow-[inset_0_0_0_1px_rgba(244,180,0,0.2)]',
                        )}
                        onClick={() => onRowSingleClick(row.id)}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          onRowDoubleClick(row.id);
                        }}
                      >
                        <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="nx-master-row-checkbox"
                            checked={checked.has(row.id)}
                            onChange={(e) => toggleOne(row.id, e.target.checked)}
                            aria-label={'選取 ' + row.code}
                          />
                        </td>
                        {orderedVisibleCols.map((k) => renderBodyCell(row, k))}
                        <td className="px-1 py-2.5 text-muted-foreground">
                          <ChevronRight className="mx-auto size-4 opacity-50" aria-hidden />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </MasterListScrollRegion>
          </div>
        </section>
      </div>

      <BaseMasterModalFrame
        open={panelOpen}
        detailPanelRef={detailPanelRef}
        detailFullscreen={detailFullscreen}
        onToggleFullscreen={() => setDetailFullscreen((v) => !v)}
        onClose={closeDetailFull}
        titleId="br-detail-title"
        title={creating ? '新增職務' : auditSource?.name ?? '職務明細'}
        subtitle={
          !creating && auditSource ? (
            <span className="block truncate font-mono text-xs text-muted-foreground">{auditSource.code}</span>
          ) : null
        }
        showPrevNext={!creating && selectedIdxSorted >= 0}
        onPrev={goDetailPrev}
        onNext={goDetailNext}
        disablePrev={selectedIdxSorted <= 0}
        disableNext={selectedIdxSorted >= sortedRows.length - 1}
      >
              <div className="mt-4 space-y-3 pb-2">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-stretch">
                  <div className="space-y-3 lg:max-w-sm">
                    <div className="space-y-2">
                      <Label htmlFor="br-d-code">職務代碼</Label>
                      <Input
                        id="br-d-code"
                        value={formValues.code}
                        onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                        readOnly={!codeEditable}
                        className={!codeEditable ? readonlyFieldCls : undefined}
                        placeholder="例：ADMIN"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-d-name">職務名稱</Label>
                      <Input
                        id="br-d-name"
                        value={formValues.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        readOnly={!editing && !creating}
                        className={!editing && !creating ? readonlyFieldCls : undefined}
                        placeholder="職務顯示名稱"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="br-d-sort">順序</Label>
                      <Input
                        id="br-d-sort"
                        inputMode="numeric"
                        value={formValues.sortOrder}
                        onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value }))}
                        readOnly={!editing && !creating}
                        className={!editing && !creating ? readonlyFieldCls : undefined}
                        placeholder="數字越小越前面"
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-1">
                      <input
                        id="br-d-active"
                        type="checkbox"
                        className="size-4 rounded border border-input accent-primary"
                        checked={formValues.isActive}
                        disabled={!editing && !creating}
                        onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                      />
                      <Label htmlFor="br-d-active" className="font-normal">
                        啟用
                      </Label>
                    </div>
                  </div>
                  <div className="flex min-h-[140px] flex-col space-y-2 lg:min-h-[220px]">
                    <Label htmlFor="br-d-desc">職務說明</Label>
                    <Textarea
                      id="br-d-desc"
                      value={formValues.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={cn('min-h-[120px] flex-1 resize-y lg:min-h-0', !editing && !creating && readonlyFieldCls)}
                      placeholder="職務職責摘要（選填）"
                      rows={6}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                {creating || editing ? (
                  <>
                    <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving}>
                      {saving ? '儲存中…' : '儲存'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
                      取消
                    </Button>
                  </>
                ) : selectedRole ? (
                  <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
                    編輯
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">填寫資料後儲存。</p>
                )}
              </div>

              {!creating && !editing && selectedRole ? (
                <Button
                  type="button"
                  size="icon"
                  className="fixed bottom-6 right-5 z-[60] size-14 rounded-full shadow-lg lg:hidden"
                  aria-label="編輯"
                  onClick={onEdit}
                >
                  <Pencil className="size-6" />
                </Button>
              ) : null}
      </BaseMasterModalFrame>
    </div>
  );
}
