/**
 * 汽車廠牌／零件廠牌主檔：LIST + 置中彈窗明細（版型對齊 BasePartMasterView／BaseRoleMasterView）
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
import { createBrand, listBrand, setBrandActive, updateBrand } from '@/features/nx00/brand/api/brand';
import { createCarBrand, listCarBrand, setCarBrandActive, updateCarBrand } from '@/features/nx00/car-brand/api/car-brand';
import type { BrandDto } from '@/features/nx00/brand/types';
import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import { BaseMasterModalFrame } from '@/features/base/shell/BaseMasterModalFrame';
import { MasterActiveListCell } from '@/features/base/shell/MasterActiveListCell';
import { MasterListScrollRegion } from '@/features/base/shell/MasterListScrollRegion';
import { MasterToolbarAddOrBulkActive } from '@/features/base/shell/MasterToolbarAddOrBulkActive';
import { isMasterListKeyboardBlocked } from '@/features/base/shell/baseMasterListKeyboard';
import { useMasterListRowSelection } from '@/features/base/shell/useMasterListRowSelection';

export type BrandLikeVariant = 'car' | 'part';

type BrandLikeRow = {
  id: string;
  code: string;
  name: string;
  countryId: string | null;
  countryCode: string | null;
  countryName: string | null;
  remark: string | null;
  isActive: boolean;
  sortNo: number;
  createdAt: string;
  createdByPerson: string;
  updatedAt: string;
  updatedByPerson: string;
};

type ListColKey =
  | 'code'
  | 'name'
  | 'countryDisplay'
  | 'remark'
  | 'isActive'
  | 'createdAt'
  | 'createdByPerson'
  | 'updatedAt'
  | 'updatedByPerson';
type SortKey = ListColKey;
type SortDir = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';

type Draft = {
  code: string;
  name: string;
  countryId: string | null;
  remark: string;
  isActive: boolean;
  sortNo: string;
};

const PAGE_SIZE = 10;

const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  code: { label: '廠牌代碼', locked: true },
  name: { label: '廠牌名稱' },
  countryDisplay: { label: '廠牌國家' },
  remark: { label: '備註' },
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

function dtoToRow(d: BrandDto): BrandLikeRow {
  const cc = d.countryCode ?? d.originCountry ?? null;
  const cn = d.countryName ?? null;
  const cbName = d.createdByName ?? null;
  const ubName = d.updatedByName ?? null;
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    countryId: d.countryId ?? null,
    countryCode: cc,
    countryName: cn,
    remark: d.remark ?? null,
    isActive: d.isActive,
    sortNo: d.sortNo,
    createdAt: d.createdAt,
    createdByPerson: formatAuditPersonLabel(d.createdByUsername ?? null, cbName),
    updatedAt: d.updatedAt ?? '',
    updatedByPerson: formatAuditPersonLabel(d.updatedByUsername ?? null, ubName),
  };
}

function countryDisplay(r: BrandLikeRow): string {
  const a = [r.countryCode, r.countryName].filter(Boolean);
  return a.length ? a.join(' ') : '';
}

function emptyDraft(): Draft {
  return { code: '', name: '', countryId: null, remark: '', isActive: true, sortNo: '100' };
}

function fromRow(r: BrandLikeRow): Draft {
  return {
    code: r.code,
    name: r.name,
    countryId: r.countryId,
    remark: r.remark ?? '',
    isActive: r.isActive,
    sortNo: String(r.sortNo),
  };
}

function isRadixFilterMenuOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector(
    '[data-slot="dropdown-menu-content"][data-state="open"], [data-slot="dropdown-menu-sub-content"][data-state="open"]',
  );
}

function metaFor(variant: BrandLikeVariant) {
  if (variant === 'car') {
    return {
      listPrefKey: 'base.car-brand.listcols',
      listPrefVersion: 1,
      titleId: 'cb-detail-title',
      hubName: '汽車廠牌',
      otherBrandLabel: '零件廠牌',
      otherBrandHref: '/base/part-brand',
    };
  }
  return {
    listPrefKey: 'base.part-brand.listcols',
    listPrefVersion: 1,
    titleId: 'pb-detail-title',
    hubName: '零件廠牌',
    otherBrandLabel: '汽車廠牌',
    otherBrandHref: '/base/car-brand',
  };
}

const ALL_LIST_COLS: ListColKey[] = [
  'code',
  'name',
  'countryDisplay',
  'remark',
  'isActive',
  'createdAt',
  'createdByPerson',
  'updatedAt',
  'updatedByPerson',
];

type ListColPref = { visibleCols: ListColKey[]; colOrder: ListColKey[] };
const DEFAULT_COL_PREF: ListColPref = { visibleCols: [...ALL_LIST_COLS], colOrder: [...ALL_LIST_COLS] };

function normalizeColPref(raw: ListColPref): ListColPref {
  const order = ALL_LIST_COLS.filter((k) => raw.colOrder.includes(k));
  for (const k of ALL_LIST_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => ALL_LIST_COLS.includes(k));
  if (!vis.includes('code')) vis = ['code', ...vis];
  return { colOrder: order, visibleCols: vis };
}

export function BaseBrandLikeMasterView({ variant }: { variant: BrandLikeVariant }) {
  const router = useRouter();
  const pathname = usePathname();
  const m = metaFor(variant);

  const [rows, setRows] = useState<BrandLikeRow[]>([]);
  const [countries, setCountries] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'code', dir: 'asc' });
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
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

  const { value: colPref, setValue: setColPref } = useListLocalPref<ListColPref>(
    m.listPrefKey,
    m.listPrefVersion,
    DEFAULT_COL_PREF,
  );
  const listCols = useMemo(() => normalizeColPref(colPref), [colPref]);

  const loadCountries = useCallback(async () => {
    setCountriesLoading(true);
    try {
      const qs = buildQueryString({ page: '1', pageSize: '500' });
      const res = await apiFetch(`/country${qs}`, { method: 'GET' });
      await assertOk(res, 'nxui_brand_like_country');
      const j = (await res.json()) as { items: Array<{ id: string; code: string; name: string }> };
      setCountries([...(j.items ?? [])].sort((a, b) => a.code.localeCompare(b.code, 'en')));
    } catch {
      setCountries([]);
    } finally {
      setCountriesLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listFn = variant === 'car' ? listCarBrand : listBrand;
      const r = await listFn({ page: 1, pageSize: 500 });
      setRows(r.items.map(dtoToRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [variant]);

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

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
    return rows.filter((r) => {
      if (activeFilter === 'active' && !r.isActive) return false;
      if (activeFilter === 'inactive' && r.isActive) return false;
      if (!k) return true;
      const blob = `${r.code} ${r.name} ${countryDisplay(r)} ${r.remark ?? ''} ${r.createdByPerson} ${r.updatedByPerson}`.toLowerCase();
      return blob.includes(k);
    });
  }, [rows, keyword, activeFilter]);

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
        case 'countryDisplay':
          return mult * countryDisplay(a).localeCompare(countryDisplay(b), 'zh-Hant');
        case 'remark':
          return mult * (a.remark ?? '').localeCompare(b.remark ?? '', 'zh-Hant');
        case 'isActive':
          return mult * ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
        case 'createdAt':
          return mult * String(a.createdAt).localeCompare(String(b.createdAt));
        case 'updatedAt':
          return mult * String(a.updatedAt).localeCompare(String(b.updatedAt));
        case 'createdByPerson':
          return mult * a.createdByPerson.localeCompare(b.createdByPerson, 'zh-Hant');
        case 'updatedByPerson':
          return mult * a.updatedByPerson.localeCompare(b.updatedByPerson, 'zh-Hant');
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

  const selected = useMemo(
    () => (selectedId ? rows.find((r) => r.id === selectedId) ?? null : null),
    [rows, selectedId],
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

  const onBulkActive = async (active: boolean) => {
    if (checked.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const setFn = variant === 'car' ? setCarBrandActive : setBrandActive;
      for (const id of checked) {
        const dto = await setFn(id, active);
        const row = dtoToRow(dto);
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
    const code = draft.code.trim().toUpperCase();
    const name = draft.name.trim();
    if (!code || !name) return;
    const sortN = Number.parseInt(draft.sortNo, 10);
    const sortNo = Number.isFinite(sortN) ? sortN : 0;
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        const createFn = variant === 'car' ? createCarBrand : createBrand;
        const dto = await createFn({
          code,
          name,
          countryId: draft.countryId,
          remark: draft.remark.trim() || null,
          isActive: draft.isActive,
          sortNo,
        });
        const row = dtoToRow(dto);
        setRows((prev) => [...prev, row].sort((a, b) => a.sortNo - b.sortNo || a.code.localeCompare(b.code, 'zh-Hant')));
        setCreating(false);
        setEditing(false);
        setSelectedId(row.id);
        setFocusedRowId(row.id);
        return;
      }
      if (!selectedId || !selected) return;
      const updateFn = variant === 'car' ? updateCarBrand : updateBrand;
      const dto = await updateFn(selectedId, {
        code,
        name,
        countryId: draft.countryId,
        remark: draft.remark.trim() || null,
        isActive: draft.isActive,
        sortNo,
      });
      const row = dtoToRow(dto);
      setRows((prev) => prev.map((r) => (r.id === selectedId ? row : r)));
      setEditing(false);
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

  const renderBodyCell = (row: BrandLikeRow, key: ListColKey) => {
    switch (key) {
      case 'code':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 font-mono text-xs text-foreground">
            {row.code}
          </td>
        );
      case 'name':
        return (
          <td key={key} className="max-w-[200px] truncate px-2 py-2.5 text-foreground">
            {row.name}
          </td>
        );
      case 'countryDisplay':
        return (
          <td key={key} className="max-w-[160px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {countryDisplay(row) || '\u2014'}
          </td>
        );
      case 'remark':
        return (
          <td key={key} className="max-w-[200px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.remark?.trim() ? row.remark : '\u2014'}
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
        return null;
    }
  };

  const tableMinW = Math.max(360, 40 + orderedVisibleCols.length * 108 + 48);
  const activeFilterSummary =
    activeFilter === 'all' ? '狀態：全部' : activeFilter === 'active' ? '狀態：啟用' : '狀態：停用';

  const addLabel = variant === 'car' ? '新增汽車廠牌' : '新增零件廠牌';
  const detailTitle = creating ? addLabel : auditSource?.name ?? m.hubName;

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          切換至{' '}
          <Link href={m.otherBrandHref} className="font-medium text-primary underline-offset-4 hover:underline">
            {m.otherBrandLabel}
          </Link>
          主檔。
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
              addExtraDisabled={countriesLoading}
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
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="廠牌代碼、名稱、國家、備註…"
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
                    const def = COL_DEF[key];
                    const colChecked = listCols.visibleCols.includes(key);
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
                            checked={locked ? true : colChecked}
                            disabled={locked}
                            onChange={() => {
                              if (locked) return;
                              setColPref((p) => {
                                const norm = normalizeColPref(p);
                                const has = norm.visibleCols.includes(key);
                                const nextVis = has ? norm.visibleCols.filter((k) => k !== key) : [...norm.visibleCols, key];
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
              ariaLabel={`${m.hubName}列表，方向鍵選取列，Enter 開啟明細，雙擊開啟明細`}
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
        titleId={m.titleId}
        title={detailTitle}
        subtitle={!creating && auditSource ? auditSource.code : null}
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
                <Label htmlFor={`${m.titleId}-code`}>廠牌代碼</Label>
                <Input
                  id={`${m.titleId}-code`}
                  value={formValues.code}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                  readOnly={!editing && !creating}
                  className={!editing && !creating ? readonlyFieldCls : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${m.titleId}-name`}>廠牌名稱</Label>
                <Input
                  id={`${m.titleId}-name`}
                  value={formValues.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  readOnly={!editing && !creating}
                  className={!editing && !creating ? readonlyFieldCls : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${m.titleId}-country`}>廠牌國家</Label>
                <select
                  id={`${m.titleId}-country`}
                  className={cn(selectCls, !editing && !creating && readonlyFieldCls)}
                  disabled={!editing && !creating}
                  value={formValues.countryId ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      countryId: e.target.value === '' ? null : e.target.value,
                    }))
                  }
                >
                  <option value="">（未指定）</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${m.titleId}-sort`}>排序</Label>
                <Input
                  id={`${m.titleId}-sort`}
                  inputMode="numeric"
                  value={formValues.sortNo}
                  onChange={(e) => setDraft((d) => ({ ...d, sortNo: e.target.value }))}
                  readOnly={!editing && !creating}
                  className={!editing && !creating ? readonlyFieldCls : undefined}
                />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <input
                  id={`${m.titleId}-active`}
                  type="checkbox"
                  className="size-4 rounded border border-input accent-primary"
                  checked={formValues.isActive}
                  disabled={!editing && !creating}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
                <Label htmlFor={`${m.titleId}-active`} className="font-normal">
                  啟用
                </Label>
              </div>
            </div>
            <div className="flex min-h-[160px] flex-col space-y-2">
              <Label htmlFor={`${m.titleId}-remark`}>備註</Label>
              <Textarea
                id={`${m.titleId}-remark`}
                value={formValues.remark}
                onChange={(e) => setDraft((d) => ({ ...d, remark: e.target.value }))}
                readOnly={!editing && !creating}
                className={cn('min-h-[120px] flex-1 resize-y', !editing && !creating && readonlyFieldCls)}
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

export function BaseCarBrandMasterView() {
  return <BaseBrandLikeMasterView variant="car" />;
}

export function BasePartBrandMasterView() {
  return <BaseBrandLikeMasterView variant="part" />;
}
