/**
 * 零件主檔：LIST + 置中彈窗明細（版型對齊 /base/user）；GET/POST/PUT /part
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
import { listBrand } from '@/features/nx00/brand/api/brand';
import type { BrandDto } from '@/features/nx00/brand/types';
import { useBrandCodeRuleLookup } from '@/features/nx00/lookup/hooks/useBrandCodeRuleLookup';
import { createPart, listPart, setPartActive, updatePart } from '@/features/nx00/part/api/part';
import type { PartDto } from '@/features/nx00/part/types';
import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { BasePartRow } from './mock-data';
import { BaseMasterModalFrame } from '@/features/base/shell/BaseMasterModalFrame';
import { MasterActiveListCell } from '@/features/base/shell/MasterActiveListCell';
import { MasterListScrollRegion } from '@/features/base/shell/MasterListScrollRegion';
import { MasterToolbarAddOrBulkActive } from '@/features/base/shell/MasterToolbarAddOrBulkActive';
import { isMasterListKeyboardBlocked } from '@/features/base/shell/baseMasterListKeyboard';
import { useMasterListRowSelection } from '@/features/base/shell/useMasterListRowSelection';

const PAGE_SIZE = 10;
const LIST_COL_PREF_KEY = 'base.part.listcols';
const LIST_COL_PREF_VERSION = 4;

type ListColKey =
  | 'sku'
  | 'codeRuleName'
  | 'secCode'
  | 'name'
  | 'brandName'
  | 'partType'
  | 'isOem'
  | 'seg1'
  | 'seg2'
  | 'seg3'
  | 'seg4'
  | 'seg5'
  | 'partGroupDisplay'
  | 'countryDisplay'
  | 'spec'
  | 'uom'
  | 'isActive'
  | 'createdAt'
  | 'createdByPerson'
  | 'updatedAt'
  | 'updatedByPerson';
type SortKey = ListColKey;
type SortDir = 'asc' | 'desc';

type ActiveFilter = 'all' | 'active' | 'inactive';
type OemFilter = 'all' | 'oem' | 'aftermarket';

const ALL_LIST_COLS: ListColKey[] = [
  'sku',
  'codeRuleName',
  'secCode',
  'name',
  'brandName',
  'partType',
  'isOem',
  'seg1',
  'seg2',
  'seg3',
  'seg4',
  'seg5',
  'partGroupDisplay',
  'countryDisplay',
  'spec',
  'uom',
  'isActive',
  'createdAt',
  'createdByPerson',
  'updatedAt',
  'updatedByPerson',
];

const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  sku: { label: '基準料號', locked: true },
  codeRuleName: { label: '編碼規則' },
  secCode: { label: '廠牌料號' },
  name: { label: '品名' },
  brandName: { label: '廠牌' },
  partType: { label: '零件類型' },
  isOem: { label: '正廠件' },
  seg1: { label: '第一區間碼' },
  seg2: { label: '第二區間碼' },
  seg3: { label: '第三區間碼' },
  seg4: { label: '第四區間碼' },
  seg5: { label: '第五區間碼' },
  partGroupDisplay: { label: '零件族群' },
  countryDisplay: { label: '產地' },
  spec: { label: '規格' },
  uom: { label: '單位' },
  isActive: { label: '啟用' },
  createdAt: { label: '建立時間' },
  createdByPerson: { label: '建立人員' },
  updatedAt: { label: '修改時間' },
  updatedByPerson: { label: '修改人員' },
};

type PartListColPref = { visibleCols: ListColKey[]; colOrder: ListColKey[] };
const DEFAULT_COL_PREF: PartListColPref = {
  visibleCols: [...ALL_LIST_COLS],
  colOrder: [...ALL_LIST_COLS],
};

function normalizeColPref(raw: PartListColPref): PartListColPref {
  const order = ALL_LIST_COLS.filter((k) => raw.colOrder.includes(k));
  for (const k of ALL_LIST_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => ALL_LIST_COLS.includes(k));
  if (!vis.includes('sku')) vis = ['sku', ...vis];
  return { colOrder: order, visibleCols: vis };
}

const PART_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '（未指定）' },
  { value: 'A', label: 'A 專用型' },
  { value: 'B', label: 'B 通用型' },
  { value: 'C', label: 'C 組合型' },
  { value: 'D', label: 'D 拆解型' },
];

function partTypeLabel(t: string | null | undefined): string {
  if (!t) return '';
  const hit = PART_TYPE_OPTIONS.find((o) => o.value === t);
  return hit?.label ?? t;
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

type Draft = {
  codeRuleId: string;
  sku: string;
  name: string;
  spec: string;
  unit: string;
  isActive: boolean;
  partBrandId: string | null;
  isOem: boolean;
  partType: string | null;
  secCode: string;
  seg1: string;
  seg2: string;
  seg3: string;
  seg4: string;
  seg5: string;
  countryId: string | null;
  partGroupId: string | null;
};

function emptyDraft(): Draft {
  return {
    codeRuleId: '',
    sku: '',
    name: '',
    spec: '',
    unit: 'pcs',
    isActive: true,
    partBrandId: null,
    isOem: true,
    partType: null,
    secCode: '',
    seg1: '',
    seg2: '',
    seg3: '',
    seg4: '',
    seg5: '',
    countryId: null,
    partGroupId: null,
  };
}

function fromRow(r: BasePartRow): Draft {
  return {
    codeRuleId: r.codeRuleId,
    sku: r.sku,
    name: r.name,
    spec: r.spec,
    unit: r.unit,
    isActive: r.isActive,
    partBrandId: r.partBrandId,
    isOem: r.isOem,
    partType: r.partType,
    secCode: r.secCode ?? '',
    seg1: r.seg1 ?? '',
    seg2: r.seg2 ?? '',
    seg3: r.seg3 ?? '',
    seg4: r.seg4 ?? '',
    seg5: r.seg5 ?? '',
    countryId: r.countryId,
    partGroupId: r.partGroupId,
  };
}

function dtoToRow(p: PartDto): BasePartRow {
  const cbName = p.createdByName ?? null;
  const ubName = p.updatedByName ?? null;
  return {
    id: p.id,
    codeRuleId: p.codeRuleId,
    codeRuleName: p.codeRuleName ?? null,
    sku: p.code,
    name: p.name,
    spec: p.spec ?? '',
    unit: p.uom,
    isActive: p.isActive,
    partBrandId: p.partBrandId ?? null,
    brandCode: p.brandCode ?? null,
    brandName: p.brandName ?? null,
    isOem: p.isOem,
    partType: p.partType ?? null,
    secCode: p.secCode ?? null,
    seg1: p.seg1 ?? null,
    seg2: p.seg2 ?? null,
    seg3: p.seg3 ?? null,
    seg4: p.seg4 ?? null,
    seg5: p.seg5 ?? null,
    countryId: p.countryId ?? null,
    countryCode: p.countryCode ?? null,
    countryName: p.countryName ?? null,
    partGroupId: p.partGroupId ?? null,
    partGroupCode: p.partGroupCode ?? null,
    partGroupName: p.partGroupName ?? null,
    createdAt: p.createdAt,
    createdBy: p.createdBy ?? null,
    createdByUsername: p.createdByUsername ?? null,
    createdByName: cbName,
    createdByPerson: formatAuditPersonLabel(p.createdByUsername ?? null, cbName),
    updatedAt: p.updatedAt,
    updatedBy: p.updatedBy ?? null,
    updatedByUsername: p.updatedByUsername ?? null,
    updatedByName: ubName,
    updatedByPerson: formatAuditPersonLabel(p.updatedByUsername ?? null, ubName),
  };
}

function brandLabel(r: BasePartRow): string {
  return r.brandName || r.brandCode || '';
}

function countryDisplay(r: BasePartRow): string {
  const a = [r.countryCode, r.countryName].filter(Boolean);
  return a.length ? a.join(' ') : '';
}

function partGroupDisplay(r: BasePartRow): string {
  return r.partGroupCode || r.partGroupName || '';
}

export function BasePartMasterView() {
  const router = useRouter();
  const pathname = usePathname();
  const ruleLookup = useBrandCodeRuleLookup();
  const [rows, setRows] = useState<BasePartRow[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [oemFilter, setOemFilter] = useState<OemFilter>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'sku', dir: 'asc' });
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [countries, setCountries] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [partGroups, setPartGroups] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
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

  const { value: colPref, setValue: setColPref } = useListLocalPref<PartListColPref>(
    LIST_COL_PREF_KEY,
    LIST_COL_PREF_VERSION,
    DEFAULT_COL_PREF,
  );
  const listCols = useMemo(() => normalizeColPref(colPref), [colPref]);

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const r = await listBrand({ page: 1, pageSize: 2000 });
      setBrands([...r.items].sort((a, b) => a.sortNo - b.sortNo || a.code.localeCompare(b.code, 'en')));
    } catch {
      setBrands([]);
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  const loadLookups = useCallback(async () => {
    setLookupsLoading(true);
    try {
      const cQs = buildQueryString({ page: '1', pageSize: '500' });
      const gQs = buildQueryString({ page: '1', pageSize: '500' });
      const [cRes, gRes] = await Promise.all([
        apiFetch(`/country${cQs}`, { method: 'GET' }),
        apiFetch(`/part-group${gQs}`, { method: 'GET' }),
      ]);
      await assertOk(cRes, 'nxui_part_master_country');
      await assertOk(gRes, 'nxui_part_master_part_group');
      const cj = (await cRes.json()) as { items: Array<{ id: string; code: string; name: string }> };
      const gj = (await gRes.json()) as { items: Array<{ id: string; code: string; name: string }> };
      setCountries([...(cj.items ?? [])].sort((a, b) => a.code.localeCompare(b.code, 'en')));
      setPartGroups([...(gj.items ?? [])].sort((a, b) => a.code.localeCompare(b.code, 'en')));
    } catch {
      setCountries([]);
      setPartGroups([]);
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listPart({ page: 1, pageSize: 500 });
      setRows(r.items.map(dtoToRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrands();
    void loadLookups();
  }, [loadBrands, loadLookups]);

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
      if (oemFilter === 'oem' && !r.isOem) return false;
      if (oemFilter === 'aftermarket' && r.isOem) return false;
      if (k) {
        const blob =
          `${r.sku} ${r.codeRuleName ?? ''} ${r.name} ${r.spec} ${brandLabel(r)} ${partTypeLabel(r.partType)} ${r.secCode ?? ''} ${countryDisplay(r)} ${partGroupDisplay(r)} ${r.seg1 ?? ''} ${r.seg2 ?? ''} ${r.seg3 ?? ''} ${r.seg4 ?? ''} ${r.seg5 ?? ''} ${r.unit} ${r.createdByPerson} ${r.updatedByPerson}`.toLowerCase();
        if (!blob.includes(k)) return false;
      }
      return true;
    });
  }, [rows, keyword, activeFilter, oemFilter]);

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sk = sort.key;
    const out = [...filtered];
    out.sort((a, b) => {
      const cmpNullLast = (x: string | null, y: string | null, inner: () => number) => {
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return inner();
      };
      switch (sk) {
        case 'sku':
          return mult * a.sku.localeCompare(b.sku, 'zh-Hant');
        case 'codeRuleName':
          return mult * (a.codeRuleName ?? '').localeCompare(b.codeRuleName ?? '', 'zh-Hant');
        case 'name':
          return mult * a.name.localeCompare(b.name, 'zh-Hant');
        case 'brandName':
          return mult * brandLabel(a).localeCompare(brandLabel(b), 'zh-Hant');
        case 'isOem':
          return mult * ((a.isOem ? 1 : 0) - (b.isOem ? 1 : 0));
        case 'partType':
          return mult * (partTypeLabel(a.partType).localeCompare(partTypeLabel(b.partType), 'zh-Hant'));
        case 'secCode':
          return mult * (a.secCode ?? '').localeCompare(b.secCode ?? '', 'en');
        case 'seg1':
        case 'seg2':
        case 'seg3':
        case 'seg4':
        case 'seg5':
          return mult * (a[sk] ?? '').localeCompare(b[sk] ?? '', 'en');
        case 'countryDisplay':
          return mult * countryDisplay(a).localeCompare(countryDisplay(b), 'zh-Hant');
        case 'partGroupDisplay':
          return mult * partGroupDisplay(a).localeCompare(partGroupDisplay(b), 'zh-Hant');
        case 'spec':
          return mult * (a.spec ?? '').localeCompare(b.spec ?? '', 'zh-Hant');
        case 'uom':
          return mult * a.unit.localeCompare(b.unit, 'zh-Hant');
        case 'isActive':
          return mult * ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
        case 'createdAt':
          return mult * String(a.createdAt).localeCompare(String(b.createdAt));
        case 'updatedAt':
          return cmpNullLast(a.updatedAt, b.updatedAt, () => mult * String(a.updatedAt).localeCompare(String(b.updatedAt)));
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

  const filterKey = `${keyword}|${activeFilter}|${oemFilter}`;
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

  const onBulkActive = async (active: boolean) => {
    if (checked.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const id of checked) {
        const dto = await setPartActive(id, active);
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

  const performSave = async () => {
    const sku = draft.sku.trim();
    if (!sku) return;
    const crid = draft.codeRuleId.trim();
    if (creating && !crid) {
      setError('請選擇編碼規則（codeRuleId）');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const trimOrNull = (s: string) => {
        const t = s.trim();
        return t === '' ? null : t;
      };
      const body = {
        code: sku,
        name: draft.name.trim() || sku,
        spec: draft.spec.trim() || null,
        uom: draft.unit.trim() || 'pcs',
        isActive: draft.isActive,
        partBrandId: draft.partBrandId,
        isOem: draft.isOem,
        partType: draft.partType,
        secCode: trimOrNull(draft.secCode),
        seg1: trimOrNull(draft.seg1),
        seg2: trimOrNull(draft.seg2),
        seg3: trimOrNull(draft.seg3),
        seg4: trimOrNull(draft.seg4),
        seg5: trimOrNull(draft.seg5),
        countryId: draft.countryId,
        partGroupId: draft.partGroupId,
      };
      if (creating) {
        const dto = await createPart({ ...body, codeRuleId: crid });
        const row = dtoToRow(dto);
        setRows((prev) => [...prev, row]);
        setCreating(false);
        setEditing(false);
        setSelectedId(row.id);
        setFocusedRowId(row.id);
        return;
      }
      if (!selectedId) return;
      const dto = await updatePart(selectedId, { ...body, codeRuleId: crid });
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

  const cellDash = (v: string | null | undefined) => (v && String(v).trim() !== '' ? v : '\u2014');

  const renderBodyCell = (row: BasePartRow, key: ListColKey) => {
    switch (key) {
      case 'sku':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 font-mono text-xs text-foreground">
            {row.sku}
          </td>
        );
      case 'codeRuleName':
        return (
          <td key={key} className="max-w-[160px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {cellDash(row.codeRuleName)}
          </td>
        );
      case 'name':
        return (
          <td key={key} className="max-w-[200px] truncate px-2 py-2.5 text-foreground">
            {row.name}
          </td>
        );
      case 'brandName':
        return (
          <td key={key} className="max-w-[140px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {cellDash(brandLabel(row))}
          </td>
        );
      case 'isOem':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs text-muted-foreground">
            {row.isOem ? '是' : '否'}
          </td>
        );
      case 'partType':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {cellDash(partTypeLabel(row.partType))}
          </td>
        );
      case 'secCode':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 font-mono text-xs text-muted-foreground">
            {cellDash(row.secCode)}
          </td>
        );
      case 'seg1':
      case 'seg2':
      case 'seg3':
      case 'seg4':
      case 'seg5':
        return (
          <td key={key} className="max-w-[72px] truncate px-2 py-2.5 font-mono text-xs text-muted-foreground">
            {cellDash(row[key])}
          </td>
        );
      case 'countryDisplay':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {cellDash(countryDisplay(row))}
          </td>
        );
      case 'partGroupDisplay':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {cellDash(partGroupDisplay(row))}
          </td>
        );
      case 'spec':
        return (
          <td key={key} className="max-w-[160px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {cellDash(row.spec)}
          </td>
        );
      case 'uom':
        return (
          <td key={key} className="max-w-[64px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.unit || '\u2014'}
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

  const tableMinW = Math.max(360, 40 + orderedVisibleCols.length * 104 + 48);
  const activeFilterSummary =
    activeFilter === 'all' ? '狀態：全部' : activeFilter === 'active' ? '狀態：啟用' : '狀態：停用';
  const oemFilterSummary =
    oemFilter === 'all' ? '正廠件：全部' : oemFilter === 'oem' ? '正廠件：是' : '正廠件：否';

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
              addExtraDisabled={lookupsLoading}
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
              placeholder="基準料號、品名、規格、廠牌、區間碼…"
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
                  aria-label="依正廠件篩選"
                >
                  <span className="truncate">{oemFilterSummary}</span>
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
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">正廠件</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={oemFilter} onValueChange={(v) => setOemFilter(v as OemFilter)}>
                  <DropdownMenuRadioItem value="all">全部</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oem">是（正廠）</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="aftermarket">否（副廠）</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

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
              ariaLabel="零件列表，方向鍵選取列，Enter 開啟明細，雙擊開啟明細"
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
                            aria-label={'選取 ' + row.sku}
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
        titleId="bp-detail-title"
        title={creating ? '新增零件' : auditSource?.sku ?? '零件明細'}
        subtitle={!creating && auditSource ? auditSource.name : null}
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
                  <TabsTrigger value="audit" className="flex-none" disabled={creating}>
                    稽核
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="main" className="mt-3 outline-none">
                  <div className="space-y-3 pb-2">
                    <div className="space-y-2">
                      <Label htmlFor="bp-coderule">編碼規則</Label>
                      <select
                        id="bp-coderule"
                        className={cn(selectCls, !creating && !editing && readonlyFieldCls)}
                        value={formValues.codeRuleId}
                        disabled={!creating && !editing || ruleLookup.loading}
                        onChange={(e) => setDraft((d) => ({ ...d, codeRuleId: e.target.value }))}
                      >
                        <option value="">— 請選擇 —</option>
                        {(ruleLookup.options ?? []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {ruleLookup.error ? (
                        <p className="text-xs text-destructive">規則清單載入失敗：{ruleLookup.error}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-sku">基準料號</Label>
                      <Input
                        id="bp-sku"
                        value={formValues.sku}
                        onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
                        readOnly={!creating && !editing}
                        className={!creating && !editing ? readonlyFieldCls : undefined}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-seccode">廠牌料號</Label>
                      <Input
                        id="bp-seccode"
                        value={formValues.secCode}
                        onChange={(e) => setDraft((d) => ({ ...d, secCode: e.target.value }))}
                        readOnly={!creating && !editing}
                        className={!creating && !editing ? readonlyFieldCls : undefined}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-name">品名</Label>
                      <Input
                        id="bp-name"
                        value={formValues.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        readOnly={!creating && !editing}
                        className={!creating && !editing ? readonlyFieldCls : undefined}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-brand">廠牌</Label>
                      <select
                        id="bp-brand"
                        className={cn(selectCls, !creating && !editing && readonlyFieldCls)}
                        value={formValues.partBrandId ?? ''}
                        disabled={!creating && !editing || brandsLoading}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, partBrandId: e.target.value === '' ? null : e.target.value }))
                        }
                      >
                        <option value="">（未指定）</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.code} — {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-ptype">零件類型</Label>
                      <select
                        id="bp-ptype"
                        className={cn(selectCls, !creating && !editing && readonlyFieldCls)}
                        value={formValues.partType ?? ''}
                        disabled={!creating && !editing}
                        onChange={(e) => setDraft((d) => ({ ...d, partType: e.target.value === '' ? null : e.target.value }))}
                      >
                        {PART_TYPE_OPTIONS.map((o) => (
                          <option key={o.value || 'empty'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label htmlFor="bp-oem" className="flex items-center gap-2 text-sm">
                      <input
                        id="bp-oem"
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={formValues.isOem}
                        disabled={!creating && !editing}
                        onChange={(e) => setDraft((d) => ({ ...d, isOem: e.target.checked }))}
                      />
                      正廠件
                    </label>
                    <div className="grid gap-3 sm:grid-cols-5">
                      {(['seg1', 'seg2', 'seg3', 'seg4', 'seg5'] as const).map((k, i) => (
                        <div key={k} className="space-y-2">
                          <Label htmlFor={`bp-${k}`}>{`第${i + 1}區間碼`}</Label>
                          <Input
                            id={`bp-${k}`}
                            value={formValues[k]}
                            onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                            readOnly={!creating && !editing}
                            className={cn(!creating && !editing && readonlyFieldCls, 'font-mono text-xs')}
                            maxLength={10}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-pg">零件族群</Label>
                      <select
                        id="bp-pg"
                        className={cn(selectCls, !creating && !editing && readonlyFieldCls)}
                        value={formValues.partGroupId ?? ''}
                        disabled={!creating && !editing || lookupsLoading}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, partGroupId: e.target.value === '' ? null : e.target.value }))
                        }
                      >
                        <option value="">（未指定）</option>
                        {partGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.code} — {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-country">產地</Label>
                      <select
                        id="bp-country"
                        className={cn(selectCls, !creating && !editing && readonlyFieldCls)}
                        value={formValues.countryId ?? ''}
                        disabled={!creating && !editing || lookupsLoading}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, countryId: e.target.value === '' ? null : e.target.value }))
                        }
                      >
                        <option value="">（未指定）</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-spec">規格</Label>
                      <Input
                        id="bp-spec"
                        value={formValues.spec}
                        onChange={(e) => setDraft((d) => ({ ...d, spec: e.target.value }))}
                        readOnly={!creating && !editing}
                        className={!creating && !editing ? readonlyFieldCls : undefined}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-unit">單位</Label>
                      <Input
                        id="bp-unit"
                        value={formValues.unit}
                        onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                        readOnly={!creating && !editing}
                        className={!creating && !editing ? readonlyFieldCls : undefined}
                      />
                    </div>
                    <label htmlFor="bp-active" className="flex items-center gap-2 text-sm">
                      <input
                        id="bp-active"
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={formValues.isActive}
                        disabled={!creating && !editing}
                        onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                      />
                      啟用
                    </label>
                  </div>
                </TabsContent>

                <TabsContent value="audit" className="mt-3 space-y-2 text-sm outline-none">
                  <div className="space-y-3 pb-2">
                    <div className="space-y-2">
                      <Label htmlFor="bp-created-at">建立時間</Label>
                      <Input
                        id="bp-created-at"
                        readOnly
                        value={auditSource ? formatDt(auditSource.createdAt) : '\u2014'}
                        className={readonlyFieldCls}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-created-by">建立人員</Label>
                      <Input
                        id="bp-created-by"
                        readOnly
                        value={auditSource?.createdByPerson ?? '\u2014'}
                        className={readonlyFieldCls}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-updated-at">修改時間</Label>
                      <Input
                        id="bp-updated-at"
                        readOnly
                        value={auditSource ? formatDt(auditSource.updatedAt) : '\u2014'}
                        className={readonlyFieldCls}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bp-updated-by">修改人員</Label>
                      <Input
                        id="bp-updated-by"
                        readOnly
                        value={auditSource?.updatedByPerson ?? '\u2014'}
                        className={readonlyFieldCls}
                      />
                    </div>
                    {creating ? <p className="text-xs text-muted-foreground">建立完成後將顯示稽核欄位。</p> : null}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                {creating || editing ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!draft.sku.trim()) return;
                        void performSave();
                      }}
                      disabled={saving}
                    >
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
