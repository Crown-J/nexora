/**
 * 廠牌料號規則：與汽車廠牌相同的 LIST + 置中彈窗明細
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import { formatAuditPersonLabel } from '@/features/base/users/mock-data';
import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import { BaseMasterModalFrame } from '@/features/base/shell/BaseMasterModalFrame';
import { MasterActiveListCell } from '@/features/base/shell/MasterActiveListCell';
import { MasterListScrollRegion } from '@/features/base/shell/MasterListScrollRegion';
import { MasterToolbarAddOrBulkActive } from '@/features/base/shell/MasterToolbarAddOrBulkActive';
import { isMasterListKeyboardBlocked } from '@/features/base/shell/baseMasterListKeyboard';
import { useMasterListRowSelection } from '@/features/base/shell/useMasterListRowSelection';

type BcrRow = {
  id: string;
  partBrandId: string;
  partBrandDisplay: string;
  partBrandCode: string | null;
  partBrandName: string | null;
  seg1: number;
  seg2: number;
  seg3: number;
  seg4: number;
  seg5: number;
  codeFormat: string;
  brandSort: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByPerson: string;
  updatedByPerson: string;
};

type BcrDraft = {
  partBrandId: string;
  seg1: string;
  seg2: string;
  seg3: string;
  seg4: string;
  seg5: string;
  codeFormat: string;
  brandSort: string;
  isActive: boolean;
};

type ListColKey =
  | 'partBrandDisplay'
  | 'seg1'
  | 'seg2'
  | 'seg3'
  | 'seg4'
  | 'seg5'
  | 'codeFormat'
  | 'brandSort'
  | 'isActive'
  | 'createdAt'
  | 'createdByPerson'
  | 'updatedAt'
  | 'updatedByPerson';

type SortDir = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';
type ListColPref = { visibleCols: string[]; colOrder: string[] };

const PAGE_SIZE = 10;

const ALL_LIST_COLS: ListColKey[] = [
  'partBrandDisplay',
  'seg1',
  'seg2',
  'seg3',
  'seg4',
  'seg5',
  'codeFormat',
  'brandSort',
  'isActive',
  'createdAt',
  'createdByPerson',
  'updatedAt',
  'updatedByPerson',
];

const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  partBrandDisplay: { label: '零件品牌', locked: true },
  seg1: { label: '第1段字數限制' },
  seg2: { label: '第2段字數限制' },
  seg3: { label: '第3段字數限制' },
  seg4: { label: '第4段字數限制' },
  seg5: { label: '第5段字數限制' },
  codeFormat: { label: '組合格式' },
  brandSort: { label: '排序順序' },
  isActive: { label: '啟用' },
  createdAt: { label: '建立時間' },
  createdByPerson: { label: '建立人員' },
  updatedAt: { label: '修改時間' },
  updatedByPerson: { label: '修改人員' },
};

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

function normalizeColPref(raw: ListColPref, allowed: readonly string[]): ListColPref {
  const order = allowed.filter((k) => raw.colOrder.includes(k));
  for (const k of allowed) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => allowed.includes(k));
  const first = allowed[0];
  if (first && !vis.includes(first)) vis = [first, ...vis];
  return { colOrder: order, visibleCols: vis };
}

function dtoToRow(d: {
  id: string;
  partBrandId: string;
  partBrandCode: string | null;
  partBrandName: string | null;
  seg1: number;
  seg2: number;
  seg3: number;
  seg4: number;
  seg5: number;
  codeFormat: string;
  brandSort: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUsername?: string | null;
  createdByName?: string | null;
  updatedByUsername?: string | null;
  updatedByName?: string | null;
}): BcrRow {
  const c = (d.partBrandCode ?? '').trim();
  const n = (d.partBrandName ?? '').trim();
  const partBrandDisplay = c && n ? `${c} ${n}` : c || n || '\u2014';
  return {
    id: d.id,
    partBrandId: d.partBrandId,
    partBrandDisplay,
    partBrandCode: d.partBrandCode,
    partBrandName: d.partBrandName,
    seg1: d.seg1,
    seg2: d.seg2,
    seg3: d.seg3,
    seg4: d.seg4,
    seg5: d.seg5,
    codeFormat: d.codeFormat,
    brandSort: d.brandSort,
    isActive: d.isActive,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    createdByPerson: formatAuditPersonLabel(d.createdByUsername ?? null, d.createdByName ?? null),
    updatedByPerson: formatAuditPersonLabel(d.updatedByUsername ?? null, d.updatedByName ?? null),
  };
}

function emptyDraft(): BcrDraft {
  return {
    partBrandId: '',
    seg1: '0',
    seg2: '0',
    seg3: '0',
    seg4: '0',
    seg5: '0',
    codeFormat: '',
    brandSort: '',
    isActive: true,
  };
}

function fromRow(r: BcrRow): BcrDraft {
  return {
    partBrandId: r.partBrandId,
    seg1: String(r.seg1),
    seg2: String(r.seg2),
    seg3: String(r.seg3),
    seg4: String(r.seg4),
    seg5: String(r.seg5),
    codeFormat: r.codeFormat,
    brandSort: r.brandSort,
    isActive: r.isActive,
  };
}

function parseSeg(s: string): number {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function isRadixFilterMenuOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector(
    '[data-slot="dropdown-menu-content"][data-state="open"], [data-slot="dropdown-menu-sub-content"][data-state="open"]',
  );
}

const DEFAULT_COL_PREF: ListColPref = { visibleCols: [...ALL_LIST_COLS], colOrder: [...ALL_LIST_COLS] };
const ALL_COLS_STR = ALL_LIST_COLS as readonly string[];

export function BaseNx00ModalBrandCodeRoleMasterView() {
  const router = useRouter();
  const pathname = usePathname();

  const meta = useMemo(
    () => ({
      basePath: '/brand-code-role',
      listErrorCode: 'nxui_base_bcor_list',
      listPrefKey: 'base.brandCodeRole.modal.listcols',
      listPrefVersion: 1,
      titleId: 'nx-bcr-detail',
      hubName: '廠牌料號規則',
      addLabel: '新增料號規則',
      keywordPlaceholder: '品牌、格式、排序…',
    }),
    [],
  );

  const [rows, setRows] = useState<BcrRow[]>([]);
  const [brandOpts, setBrandOpts] = useState<{ value: string; label: string }[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [sort, setSort] = useState<{ key: ListColKey; dir: SortDir }>({ key: 'partBrandDisplay', dir: 'asc' });
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BcrDraft>(() => emptyDraft());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('main');
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const colPickerWrapRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLElement | null>(null);
  const listKeyboardRootRef = useRef<HTMLDivElement>(null);

  const focusListKeyboardRegion = useCallback(() => {
    requestAnimationFrame(() => {
      listKeyboardRootRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const { value: colPrefRaw, setValue: setColPref } = useListLocalPref<ListColPref>(
    meta.listPrefKey,
    meta.listPrefVersion,
    DEFAULT_COL_PREF,
  );
  const listCols = useMemo(() => normalizeColPref(colPrefRaw, ALL_COLS_STR), [colPrefRaw]);

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const qs = buildQueryString({ page: '1', pageSize: '500' });
      const res = await apiFetch(`/brand${qs}`, { method: 'GET' });
      await assertOk(res, 'nxui_base_bcor_brands');
      const data = (await res.json()) as { items: { id: string; code: string; name: string }[] };
      setBrandOpts(
        (data.items ?? []).map((b) => ({
          value: b.id,
          label: `${b.code} — ${b.name}`,
        })),
      );
    } catch {
      setBrandOpts([]);
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString({ page: '1', pageSize: '500' });
      const res = await apiFetch(`${meta.basePath}${qs}`, { method: 'GET' });
      await assertOk(res, meta.listErrorCode);
      const data = (await res.json()) as { items: unknown[] };
      setRows((data.items ?? []).map((x) => dtoToRow(x as Parameters<typeof dtoToRow>[0])));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [meta.basePath, meta.listErrorCode]);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

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

  const toggleSort = (key: ListColKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeFilter === 'active' && !r.isActive) return false;
      if (activeFilter === 'inactive' && r.isActive) return false;
      if (!k) return true;
      const blob =
        `${r.partBrandDisplay} ${r.codeFormat} ${r.brandSort} ${r.seg1} ${r.seg2} ${r.seg3} ${r.seg4} ${r.seg5} ${r.createdByPerson} ${r.updatedByPerson}`.toLowerCase();
      return blob.includes(k);
    });
  }, [rows, keyword, activeFilter]);

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sk = sort.key;
    const out = [...filtered];
    out.sort((a, b) => {
      if (sk === 'seg1' || sk === 'seg2' || sk === 'seg3' || sk === 'seg4' || sk === 'seg5') {
        return mult * (a[sk] - b[sk]);
      }
      if (sk === 'isActive') {
        return mult * ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
      }
      const av = a[sk];
      const bv = b[sk];
      return mult * String(av ?? '').localeCompare(String(bv ?? ''), 'zh-Hant');
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

  const selected = useMemo(
    () => (selectedId ? rows.find((r) => r.id === selectedId) ?? null : null),
    [rows, selectedId],
  );

  const panelOpen = creating || selectedId != null;
  const orderedVisibleCols = useMemo(
    () => listCols.colOrder.filter((k) => listCols.visibleCols.includes(k)) as ListColKey[],
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
    setDetailTab('main');
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
        if (pathname != null && pathname.startsWith('/base/')) {
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
  }, [colPickerOpen, panelOpen, closeDetailFull, pathname, router, moveFocusedRow, focusedRowId, openDetail]);

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

  useEffect(() => {
    if (creating) {
      setDraft(emptyDraft());
      setDetailTab('main');
      return;
    }
    if (selected) setDraft(fromRow(selected));
  }, [creating, selectedId, selected]);

  const formValues = creating || editing ? draft : selected ? fromRow(selected) : emptyDraft();
  const readonlyFieldCls = 'bg-muted/40 text-muted-foreground cursor-default';
  const selectCls =
    'nx-native-select flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';
  const auditSource = selected;

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

  const patchActive = async (id: string, isActive: boolean) => {
    const res = await apiFetch(`${meta.basePath}/${encodeURIComponent(id)}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    await assertOk(res, 'nxui_base_bcor_active');
    return (await res.json()) as unknown;
  };

  const onBulkActive = async (active: boolean) => {
    if (checked.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const id of checked) {
        const dto = await patchActive(id, active);
        const row = dtoToRow(dto as Parameters<typeof dtoToRow>[0]);
        setRows((prev) => prev.map((r) => (r.id === id ? row : r)));
      }
      setChecked(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : '批次更新失敗');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = () => {
    if (!selected) return;
    setEditing(true);
    setDraft(fromRow(selected));
  };

  const onCancel = () => {
    if (creating) {
      closeDetailFull();
      return;
    }
    setEditing(false);
  };

  const onSave = async () => {
    const codeFormat = draft.codeFormat.trim();
    const brandSort = draft.brandSort.trim();
    if (!codeFormat || !brandSort) return;
    const s1 = parseSeg(draft.seg1);
    const s2 = parseSeg(draft.seg2);
    const s3 = parseSeg(draft.seg3);
    const s4 = parseSeg(draft.seg4);
    const s5 = parseSeg(draft.seg5);
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        const partBrandId = draft.partBrandId.trim();
        if (!partBrandId) {
          setSaving(false);
          return;
        }
        const res = await apiFetch(meta.basePath, {
          method: 'POST',
          body: JSON.stringify({
            partBrandId,
            seg1: s1,
            seg2: s2,
            seg3: s3,
            seg4: s4,
            seg5: s5,
            codeFormat,
            brandSort,
            isActive: draft.isActive,
          }),
        });
        await assertOk(res, 'base.brandCodeRole_create');
        const dto = (await res.json()) as Parameters<typeof dtoToRow>[0];
        const row = dtoToRow(dto);
        setRows((prev) => [...prev, row].sort((a, b) => a.partBrandDisplay.localeCompare(b.partBrandDisplay, 'zh-Hant')));
        setCreating(false);
        setEditing(false);
        setSelectedId(row.id);
        setFocusedRowId(row.id);
        return;
      }
      if (!selectedId || !selected) return;
      const res = await apiFetch(`${meta.basePath}/${encodeURIComponent(selectedId)}`, {
        method: 'PUT',
        body: JSON.stringify({
          seg1: s1,
          seg2: s2,
          seg3: s3,
          seg4: s4,
          seg5: s5,
          codeFormat,
          brandSort,
          isActive: draft.isActive,
        }),
      });
      await assertOk(res, 'base.brandCodeRole_update');
      const dto = (await res.json()) as Parameters<typeof dtoToRow>[0];
      setRows((prev) => prev.map((r) => (r.id === selectedId ? dtoToRow(dto) : r)));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const sortIcon = (key: ListColKey) => {
    if (sort.key !== key) return <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />;
    return sort.dir === 'asc' ? (
      <ArrowUp className="size-3.5" aria-hidden />
    ) : (
      <ArrowDown className="size-3.5" aria-hidden />
    );
  };

  const renderBodyCell = (row: BcrRow, key: ListColKey) => {
    switch (key) {
      case 'partBrandDisplay':
        return (
          <td key={key} className="max-w-[200px] truncate px-2 py-2.5 text-sm text-foreground">
            {row.partBrandDisplay}
          </td>
        );
      case 'seg1':
      case 'seg2':
      case 'seg3':
      case 'seg4':
      case 'seg5':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs tabular-nums text-muted-foreground">
            {row[key]}
          </td>
        );
      case 'codeFormat':
      case 'brandSort':
        return (
          <td key={key} className="max-w-[140px] truncate px-2 py-2.5 text-xs font-mono text-muted-foreground">
            {row[key] || '\u2014'}
          </td>
        );
      case 'isActive':
        return <MasterActiveListCell key={key} isActive={row.isActive} />;
      case 'createdAt':
      case 'updatedAt':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs text-muted-foreground">
            {formatDt(row[key])}
          </td>
        );
      case 'createdByPerson':
      case 'updatedByPerson':
        return (
          <td key={key} className="max-w-[180px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row[key]}
          </td>
        );
      default:
        return <td key={key} />;
    }
  };

  const tableMinW = Math.max(360, 40 + orderedVisibleCols.length * 96 + 48);
  const activeFilterSummary =
    activeFilter === 'all' ? '狀態：全部' : activeFilter === 'active' ? '狀態：啟用' : '狀態：停用';

  const detailTitle = creating ? meta.addLabel : auditSource?.partBrandDisplay ?? meta.hubName;

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
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
              onBulkEnable={() => void onBulkActive(true)}
              onBulkDisable={() => void onBulkActive(false)}
              addExtraDisabled={brandsLoading}
            />

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9 shrink-0"
              onClick={() => void reload()}
              disabled={loading}
              aria-label="重新載入"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
            </Button>

            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={meta.keywordPlaceholder}
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
                <DropdownMenuRadioGroup value={activeFilter} onValueChange={(v) => setActiveFilter(v as ActiveFilter)}>
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
                    onClick={() => setColPref({ visibleCols: [...ALL_LIST_COLS], colOrder: [...ALL_LIST_COLS] })}
                  >
                    重置
                  </Button>
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {listCols.colOrder.map((key) => {
                    const k = key as ListColKey;
                    const def = COL_DEF[k];
                    const colChecked = listCols.visibleCols.includes(key);
                    const locked = Boolean(def?.locked);
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
                          const from = e.dataTransfer.getData('text/plain');
                          if (!from || from === key || !ALL_COLS_STR.includes(from)) return;
                          setColPref((p) => {
                            const norm = normalizeColPref(p, ALL_COLS_STR);
                            const fromIdx = norm.colOrder.indexOf(from);
                            const toIdx = norm.colOrder.indexOf(key);
                            if (fromIdx < 0 || toIdx < 0) return p;
                            return normalizeColPref(
                              { ...norm, colOrder: arrayMove(norm.colOrder, fromIdx, toIdx) },
                              ALL_COLS_STR,
                            );
                          });
                        }}
                      >
                        <label className="flex flex-1 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="size-3.5 rounded border border-input accent-primary"
                            checked={locked ? true : colChecked}
                            disabled={locked}
                            onChange={() => {
                              if (locked) return;
                              setColPref((p) => {
                                const norm = normalizeColPref(p, ALL_COLS_STR);
                                const has = norm.visibleCols.includes(key);
                                const nextVis = has ? norm.visibleCols.filter((x) => x !== key) : [...norm.visibleCols, key];
                                return normalizeColPref({ ...norm, visibleCols: nextVis }, ALL_COLS_STR);
                              });
                            }}
                          />
                          <span>{def?.label ?? key}</span>
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
              ariaLabel={`${meta.hubName}列表，方向鍵選取列，Enter 開啟明細，雙擊開啟明細`}
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
                            aria-label={'選取 ' + row.partBrandDisplay}
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
        titleId={meta.titleId}
        title={detailTitle}
        subtitle={!creating && auditSource ? auditSource.codeFormat : null}
        showPrevNext={!creating && selectedIdxSorted >= 0}
        onPrev={goDetailPrev}
        onNext={goDetailNext}
        disablePrev={selectedIdxSorted <= 0}
        disableNext={selectedIdxSorted >= sortedRows.length - 1}
      >
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
            <div className="space-y-3 pb-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`${meta.titleId}-brand`}>零件品牌</Label>
                  {creating ? (
                    <select
                      id={`${meta.titleId}-brand`}
                      className={cn(selectCls, !editing && readonlyFieldCls)}
                      disabled={!editing}
                      value={formValues.partBrandId}
                      onChange={(e) => setDraft((d) => ({ ...d, partBrandId: e.target.value }))}
                    >
                      <option value="">— 請選擇零件品牌 —</option>
                      {brandOpts.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={`${meta.titleId}-brand`}
                      readOnly
                      value={selected?.partBrandDisplay ?? '\u2014'}
                      className={readonlyFieldCls}
                    />
                  )}
                </div>
                {(['seg1', 'seg2', 'seg3', 'seg4', 'seg5'] as const).map((sk, i) => (
                  <div key={sk} className="space-y-2">
                    <Label htmlFor={`${meta.titleId}-${sk}`}>第{i + 1}段字數限制</Label>
                    <Input
                      id={`${meta.titleId}-${sk}`}
                      type="number"
                      inputMode="numeric"
                      value={formValues[sk]}
                      onChange={(e) => setDraft((d) => ({ ...d, [sk]: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                    />
                  </div>
                ))}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`${meta.titleId}-fmt`}>組合格式</Label>
                  <Input
                    id={`${meta.titleId}-fmt`}
                    value={formValues.codeFormat}
                    onChange={(e) => setDraft((d) => ({ ...d, codeFormat: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`${meta.titleId}-sort`}>排序順序</Label>
                  <Input
                    id={`${meta.titleId}-sort`}
                    value={formValues.brandSort}
                    onChange={(e) => setDraft((d) => ({ ...d, brandSort: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                    autoComplete="off"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2 sm:col-span-2">
                  <input
                    id={`${meta.titleId}-active`}
                    type="checkbox"
                    className="size-4 rounded border border-input accent-primary"
                    checked={formValues.isActive}
                    disabled={!editing && !creating}
                    onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  />
                  <Label htmlFor={`${meta.titleId}-active`} className="font-normal">
                    啟用
                  </Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-3 outline-none">
            <div className="space-y-3 pb-2">
              <div className="space-y-2">
                <Label>建立時間</Label>
                <Input readOnly value={auditSource ? formatDt(auditSource.createdAt) : '\u2014'} className={readonlyFieldCls} />
              </div>
              <div className="space-y-2">
                <Label>建立人員</Label>
                <Input readOnly value={auditSource?.createdByPerson ?? '\u2014'} className={readonlyFieldCls} />
              </div>
              <div className="space-y-2">
                <Label>修改時間</Label>
                <Input readOnly value={auditSource ? formatDt(auditSource.updatedAt) : '\u2014'} className={readonlyFieldCls} />
              </div>
              <div className="space-y-2">
                <Label>修改人員</Label>
                <Input readOnly value={auditSource?.updatedByPerson ?? '\u2014'} className={readonlyFieldCls} />
              </div>
              {creating ? <p className="text-xs text-muted-foreground">建立完成後將顯示稽核欄位。</p> : null}
            </div>
          </TabsContent>
        </Tabs>

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
          ) : selected ? (
            <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
              編輯
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">填寫資料後儲存。</p>
          )}
        </div>

        {!creating && !editing && selected ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="fixed bottom-5 right-5 z-40 size-12 rounded-full shadow-lg sm:hidden"
            onClick={onEdit}
            aria-label="編輯"
          >
            <Pencil className="size-5" />
          </Button>
        ) : null}
      </BaseMasterModalFrame>
    </div>
  );
}
