/**
 * 倉庫主檔／庫位主檔：與汽車／零件廠牌相同 LIST + 置中彈窗明細
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import { formatAuditPersonLabel } from '@/features/base/users/mock-data';
import {
  createWarehouse,
  listWarehouses,
  setWarehouseActive,
  updateWarehouse,
  type WarehouseDto,
} from '@/features/base/api/warehouse';
import {
  createLocation,
  listLocation,
  setLocationActive,
  updateLocation,
} from '@/features/nx00/location/api/location';
import type { LocationDto } from '@/features/nx00/location/types';
import { BaseMasterModalFrame } from '@/features/base/shell/BaseMasterModalFrame';
import { MasterActiveListCell } from '@/features/base/shell/MasterActiveListCell';
import { MasterListScrollRegion } from '@/features/base/shell/MasterListScrollRegion';
import { MasterToolbarAddOrBulkActive } from '@/features/base/shell/MasterToolbarAddOrBulkActive';
import { isMasterListKeyboardBlocked } from '@/features/base/shell/baseMasterListKeyboard';
import { useMasterListRowSelection } from '@/features/base/shell/useMasterListRowSelection';

export type WarehouseLikeVariant = 'warehouse' | 'location';

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  remark: string | null;
  isActive: boolean;
  sortNo: number;
  createdAt: string;
  createdByPerson: string;
  updatedAt: string;
  updatedByPerson: string;
};

type LocationRow = {
  id: string;
  warehouseId: string;
  warehouseDisplay: string;
  code: string;
  name: string | null;
  zone: string | null;
  rack: string | null;
  levelNo: number | null;
  binNo: string | null;
  remark: string | null;
  isActive: boolean;
  sortNo: number;
  createdAt: string;
  createdByPerson: string;
  updatedAt: string;
  updatedByPerson: string;
};

type WhDraft = { code: string; name: string; remark: string; isActive: boolean; sortNo: string };
type LocDraft = WhDraft & {
  warehouseId: string;
  zone: string;
  rack: string;
  levelNo: string;
  binNo: string;
};

type SortDir = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZE = 10;

const WH_COLS = [
  'code',
  'name',
  'remark',
  'isActive',
  'createdAt',
  'createdByPerson',
  'updatedAt',
  'updatedByPerson',
] as const;
type WhListKey = (typeof WH_COLS)[number];

const LOC_COLS = [
  'warehouseDisplay',
  'code',
  'name',
  'zone',
  'rack',
  'levelNo',
  'binNo',
  'remark',
  'isActive',
  'createdAt',
  'createdByPerson',
  'updatedAt',
  'updatedByPerson',
] as const;
type LocListKey = (typeof LOC_COLS)[number];

const WH_COL_DEF: Record<WhListKey, { label: string; locked?: boolean }> = {
  code: { label: '倉庫代碼', locked: true },
  name: { label: '倉庫名稱' },
  remark: { label: '備註' },
  isActive: { label: '啟用' },
  createdAt: { label: '建立時間' },
  createdByPerson: { label: '建立人員' },
  updatedAt: { label: '修改時間' },
  updatedByPerson: { label: '修改人員' },
};

const LOC_COL_DEF: Record<LocListKey, { label: string; locked?: boolean }> = {
  warehouseDisplay: { label: '倉庫', locked: true },
  code: { label: '庫位代碼', locked: true },
  name: { label: '庫位名稱' },
  zone: { label: '區域' },
  rack: { label: '架號' },
  levelNo: { label: '層數' },
  binNo: { label: '格數' },
  remark: { label: '備註' },
  isActive: { label: '啟用' },
  createdAt: { label: '建立時間' },
  createdByPerson: { label: '建立人員' },
  updatedAt: { label: '修改時間' },
  updatedByPerson: { label: '修改人員' },
};

type ListColPref = { visibleCols: string[]; colOrder: string[] };

function normalizeWhPref(raw: ListColPref): ListColPref {
  const order = WH_COLS.filter((k) => raw.colOrder.includes(k));
  for (const k of WH_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => WH_COLS.includes(k as WhListKey));
  if (!vis.includes('code')) vis = ['code', ...vis];
  return { colOrder: order, visibleCols: vis };
}

function normalizeLocPref(raw: ListColPref): ListColPref {
  const order = LOC_COLS.filter((k) => raw.colOrder.includes(k));
  for (const k of LOC_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => LOC_COLS.includes(k as LocListKey));
  if (!vis.includes('warehouseDisplay')) vis = ['warehouseDisplay', ...vis];
  return { colOrder: order, visibleCols: vis };
}

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

function dtoToWhRow(d: WarehouseDto): WarehouseRow {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    remark: d.remark ?? null,
    isActive: d.isActive,
    sortNo: d.sortNo,
    createdAt: d.createdAt,
    createdByPerson: formatAuditPersonLabel(d.createdByUsername ?? null, d.createdByName ?? null),
    updatedAt: d.updatedAt,
    updatedByPerson: formatAuditPersonLabel(d.updatedByUsername ?? null, d.updatedByName ?? null),
  };
}

function whDisplay(wc: string | null | undefined, wn: string | null | undefined): string {
  const a = [(wc ?? '').trim(), (wn ?? '').trim()].filter(Boolean);
  return a.length ? a.join(' ') : '';
}

function dtoToLocRow(d: LocationDto): LocationRow {
  const wd = whDisplay(d.warehouseCode ?? null, d.warehouseName ?? null);
  return {
    id: d.id,
    warehouseId: d.warehouseId,
    warehouseDisplay: wd || '\u2014',
    code: d.code,
    name: d.name ?? null,
    zone: d.zone ?? null,
    rack: d.rack ?? null,
    levelNo: d.levelNo ?? null,
    binNo: d.binNo ?? null,
    remark: d.remark ?? null,
    isActive: d.isActive,
    sortNo: d.sortNo,
    createdAt: d.createdAt,
    createdByPerson: formatAuditPersonLabel(d.createdByUsername ?? null, d.createdByName ?? null),
    updatedAt: d.updatedAt ?? '',
    updatedByPerson: formatAuditPersonLabel(d.updatedByUsername ?? null, d.updatedByName ?? null),
  };
}

function emptyWhDraft(): WhDraft {
  return { code: '', name: '', remark: '', isActive: true, sortNo: '0' };
}

function emptyLocDraft(): LocDraft {
  return { ...emptyWhDraft(), warehouseId: '', zone: '', rack: '', levelNo: '', binNo: '' };
}

function whFromRow(r: WarehouseRow): WhDraft {
  return {
    code: r.code,
    name: r.name,
    remark: r.remark ?? '',
    isActive: r.isActive,
    sortNo: String(r.sortNo),
  };
}

function locFromRow(r: LocationRow): LocDraft {
  return {
    ...whFromRow({
      id: r.id,
      code: r.code,
      name: r.name ?? '',
      remark: r.remark,
      isActive: r.isActive,
      sortNo: r.sortNo,
      createdAt: r.createdAt,
      createdByPerson: r.createdByPerson,
      updatedAt: r.updatedAt,
      updatedByPerson: r.updatedByPerson,
    }),
    warehouseId: r.warehouseId,
    zone: r.zone ?? '',
    rack: r.rack ?? '',
    levelNo: r.levelNo != null ? String(r.levelNo) : '',
    binNo: r.binNo ?? '',
  };
}

function isRadixFilterMenuOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector(
    '[data-slot="dropdown-menu-content"][data-state="open"], [data-slot="dropdown-menu-sub-content"][data-state="open"]',
  );
}

function metaFor(variant: WarehouseLikeVariant) {
  if (variant === 'warehouse') {
    return {
      listPrefKey: 'base.warehouse.listcols',
      listPrefVersion: 2,
      titleId: 'wh-detail-title',
      hubName: '倉庫主檔',
      otherLabel: '庫位主檔',
      otherHref: '/base/location',
      defaultSortKey: 'code' as string,
      ALL_COLS: WH_COLS as readonly string[],
      COL_DEF: WH_COL_DEF as Record<string, { label: string; locked?: boolean }>,
      defaultPref: { visibleCols: [...WH_COLS], colOrder: [...WH_COLS] },
      normalize: normalizeWhPref,
      kwPh: '倉庫代碼、名稱、備註…',
      addLabel: '新增倉庫',
    };
  }
  return {
    listPrefKey: 'base.location.listcols',
    listPrefVersion: 2,
    titleId: 'loc-detail-title',
    hubName: '庫位主檔',
    otherLabel: '倉庫主檔',
    otherHref: '/base/warehouse',
    defaultSortKey: 'warehouseDisplay',
    ALL_COLS: LOC_COLS as readonly string[],
    COL_DEF: LOC_COL_DEF as Record<string, { label: string; locked?: boolean }>,
    defaultPref: { visibleCols: [...LOC_COLS], colOrder: [...LOC_COLS] },
    normalize: normalizeLocPref,
    kwPh: '倉庫、庫位代碼、區域、架號…',
    addLabel: '新增庫位',
  };
}

export function BaseWarehouseLikeMasterView({ variant }: { variant: WarehouseLikeVariant }) {
  const router = useRouter();
  const pathname = usePathname();
  const m = useMemo(() => metaFor(variant), [variant]);

  const [whRows, setWhRows] = useState<WarehouseRow[]>([]);
  const [locRows, setLocRows] = useState<LocationRow[]>([]);
  const rows = variant === 'warehouse' ? whRows : locRows;
  const setRows = variant === 'warehouse' ? setWhRows : setLocRows;

  const [warehouses, setWarehouses] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(variant === 'location');

  const [keyword, setKeyword] = useState('');
  /** 庫位列表：依倉庫篩選；空字串 = 全部 */
  const [warehouseFilterId, setWarehouseFilterId] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>(() => ({
    key: m.defaultSortKey,
    dir: 'asc',
  }));
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [whDraft, setWhDraft] = useState<WhDraft>(() => emptyWhDraft());
  const [locDraft, setLocDraft] = useState<LocDraft>(() => emptyLocDraft());
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

  const { value: colPref, setValue: setColPref } = useListLocalPref<ListColPref>(
    m.listPrefKey,
    m.listPrefVersion,
    m.defaultPref,
  );
  const listCols = useMemo(() => m.normalize(colPref), [colPref, m]);

  const loadWarehouses = useCallback(async () => {
    if (variant !== 'location') return;
    setWarehousesLoading(true);
    try {
      const r = await listWarehouses({ page: 1, pageSize: 500 });
      setWarehouses([...r.items].sort((a, b) => a.code.localeCompare(b.code, 'en')));
    } catch {
      setWarehouses([]);
    } finally {
      setWarehousesLoading(false);
    }
  }, [variant]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (variant === 'warehouse') {
        const r = await listWarehouses({ page: 1, pageSize: 500 });
        setWhRows(r.items.map(dtoToWhRow));
      } else {
        const r = await listLocation({ page: 1, pageSize: 500 });
        setLocRows(r.items.map(dtoToLocRow));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [variant]);

  useEffect(() => {
    void loadWarehouses();
  }, [loadWarehouses]);

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

  const toggleSort = (key: string) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (variant === 'warehouse') {
      return whRows.filter((r) => {
        if (activeFilter === 'active' && !r.isActive) return false;
        if (activeFilter === 'inactive' && r.isActive) return false;
        if (!k) return true;
        const blob = `${r.code} ${r.name} ${r.remark ?? ''} ${r.createdByPerson} ${r.updatedByPerson}`.toLowerCase();
        return blob.includes(k);
      });
    }
    return locRows.filter((r) => {
      if (warehouseFilterId && r.warehouseId !== warehouseFilterId) return false;
      if (activeFilter === 'active' && !r.isActive) return false;
      if (activeFilter === 'inactive' && r.isActive) return false;
      if (!k) return true;
      const blob =
        `${r.warehouseDisplay} ${r.code} ${r.name ?? ''} ${r.zone ?? ''} ${r.rack ?? ''} ${r.levelNo ?? ''} ${r.binNo ?? ''} ${r.remark ?? ''} ${r.createdByPerson} ${r.updatedByPerson}`.toLowerCase();
      return blob.includes(k);
    });
  }, [variant, whRows, locRows, keyword, activeFilter, warehouseFilterId]);

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sk = sort.key;
    const out = [...filtered];
    if (variant === 'warehouse') {
      out.sort((a, b) => {
        const ra = a as WarehouseRow;
        const rb = b as WarehouseRow;
        if (sk === 'isActive') return mult * ((ra.isActive ? 1 : 0) - (rb.isActive ? 1 : 0));
        if (sk === 'code') return mult * ra.code.localeCompare(rb.code, 'zh-Hant');
        if (sk === 'name') return mult * ra.name.localeCompare(rb.name, 'zh-Hant');
        if (sk === 'remark') return mult * (ra.remark ?? '').localeCompare(rb.remark ?? '', 'zh-Hant');
        if (sk === 'createdAt' || sk === 'updatedAt') {
          return mult * String(ra[sk as keyof WarehouseRow]).localeCompare(String(rb[sk as keyof WarehouseRow]));
        }
        if (sk === 'createdByPerson' || sk === 'updatedByPerson') {
          return mult * String(ra[sk as keyof WarehouseRow]).localeCompare(String(rb[sk as keyof WarehouseRow]), 'zh-Hant');
        }
        return 0;
      });
    } else {
      out.sort((a, b) => {
        const ra = a as LocationRow;
        const rb = b as LocationRow;
        if (sk === 'isActive') return mult * ((ra.isActive ? 1 : 0) - (rb.isActive ? 1 : 0));
        if (sk === 'levelNo') {
          const av = ra.levelNo ?? -1;
          const bv = rb.levelNo ?? -1;
          return mult * (av - bv);
        }
        const sa = String(ra[sk as keyof LocationRow] ?? '');
        const sb = String(rb[sk as keyof LocationRow] ?? '');
        return mult * sa.localeCompare(sb, 'zh-Hant');
      });
    }
    return out;
  }, [filtered, sort, variant]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, safePage]);

  const pageRowIds = useMemo(() => pageRows.map((r) => (r as WarehouseRow | LocationRow).id), [pageRows]);
  const {
    checked,
    setChecked,
    headerCheckboxRef,
    toggleOne,
    toggleAllVisible,
    hasSelection: hasListSelection,
  } = useMasterListRowSelection(pageRowIds);

  const filterKey = `${keyword}|${activeFilter}|${variant === 'location' ? warehouseFilterId : ''}`;
  const prevFilterKeyRef = useRef('');
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPage(1);
      return;
    }
    setPage((p) => Math.min(p, totalPages));
  }, [filterKey, totalPages]);

  const selectedWh = useMemo(
    () => (selectedId ? whRows.find((r) => r.id === selectedId) ?? null : null),
    [whRows, selectedId],
  );
  const selectedLoc = useMemo(
    () => (selectedId ? locRows.find((r) => r.id === selectedId) ?? null : null),
    [locRows, selectedId],
  );
  const selected = variant === 'warehouse' ? selectedWh : selectedLoc;

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
      if (variant === 'warehouse') setWhDraft(emptyWhDraft());
      else setLocDraft(emptyLocDraft());
      setDetailTab('main');
      return;
    }
    if (variant === 'warehouse' && selectedWh) setWhDraft(whFromRow(selectedWh));
    if (variant === 'location' && selectedLoc) setLocDraft(locFromRow(selectedLoc));
  }, [creating, selectedId, selectedWh, selectedLoc, variant]);

  const readonlyFieldCls = 'bg-muted/40 text-muted-foreground cursor-default';
  const selectCls =
    'nx-native-select flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

  const whForm = creating || editing ? whDraft : selectedWh ? whFromRow(selectedWh) : emptyWhDraft();
  const locForm = creating || editing ? locDraft : selectedLoc ? locFromRow(selectedLoc) : emptyLocDraft();

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
    if (variant === 'warehouse') setWhDraft(emptyWhDraft());
    else setLocDraft(emptyLocDraft());
  };

  const onBulkActive = async (active: boolean) => {
    if (checked.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      if (variant === 'warehouse') {
        for (const id of checked) {
          const dto = await setWarehouseActive(id, active);
          const row = dtoToWhRow(dto);
          setWhRows((prev) => prev.map((r) => (r.id === id ? row : r)));
        }
      } else {
        for (const id of checked) {
          const dto = await setLocationActive(id, active);
          const row = dtoToLocRow(dto);
          setLocRows((prev) => prev.map((r) => (r.id === id ? row : r)));
        }
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
    if (variant === 'warehouse' && selectedWh) setWhDraft(whFromRow(selectedWh));
    if (variant === 'location' && selectedLoc) setLocDraft(locFromRow(selectedLoc));
  };

  const onCancel = () => {
    if (creating) {
      closeDetailFull();
      return;
    }
    setEditing(false);
  };

  const onSave = async () => {
    if (variant === 'warehouse') {
      const code = whForm.code.trim();
      const name = whForm.name.trim();
      if (!code || !name) return;
      const sortN = Number.parseInt(whForm.sortNo, 10);
      const sortNo = Number.isFinite(sortN) ? sortN : 0;
      setSaving(true);
      setError(null);
      try {
        if (creating) {
          const dto = await createWarehouse({
            code,
            name,
            remark: whForm.remark.trim() || null,
            sortNo,
            isActive: whForm.isActive,
          });
          const row = dtoToWhRow(dto);
          setWhRows((prev) =>
            [...prev, row].sort((a, b) => a.sortNo - b.sortNo || a.code.localeCompare(b.code, 'zh-Hant')),
          );
          setCreating(false);
          setEditing(false);
          setSelectedId(row.id);
          setFocusedRowId(row.id);
        } else if (selectedId && selectedWh) {
          const dto = await updateWarehouse(selectedId, {
            code,
            name,
            remark: whForm.remark.trim() || null,
            sortNo,
            isActive: whForm.isActive,
          });
          setWhRows((prev) => prev.map((r) => (r.id === selectedId ? dtoToWhRow(dto) : r)));
          setEditing(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '儲存失敗');
      } finally {
        setSaving(false);
      }
      return;
    }

    const code = locForm.code.trim();
    const nameTrim = locForm.name.trim();
    if (!code) return;
    const sortN = Number.parseInt(locForm.sortNo, 10);
    const sortNo = Number.isFinite(sortN) ? sortN : 0;
    const levelRaw = locForm.levelNo.trim();
    const levelNo =
      levelRaw === '' ? null : Number.isFinite(Number.parseInt(levelRaw, 10)) ? Number.parseInt(levelRaw, 10) : null;
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        const wid = locForm.warehouseId.trim();
        if (!wid) {
          setSaving(false);
          return;
        }
        const dto = await createLocation({
          warehouseId: wid,
          code,
          name: nameTrim || null,
          zone: locForm.zone.trim() || null,
          rack: locForm.rack.trim() || null,
          levelNo,
          binNo: locForm.binNo.trim() || null,
          remark: locForm.remark.trim() || null,
          sortNo,
          isActive: locForm.isActive,
        });
        const row = dtoToLocRow(dto);
        setLocRows((prev) =>
          [...prev, row].sort((a, b) =>
            a.warehouseDisplay.localeCompare(b.warehouseDisplay, 'zh-Hant') || a.code.localeCompare(b.code, 'zh-Hant'),
          ),
        );
        setCreating(false);
        setEditing(false);
        setSelectedId(row.id);
        setFocusedRowId(row.id);
      } else if (selectedId && selectedLoc) {
        const dto = await updateLocation(selectedId, {
          code,
          name: nameTrim || null,
          zone: locForm.zone.trim() || null,
          rack: locForm.rack.trim() || null,
          levelNo,
          binNo: locForm.binNo.trim() || null,
          remark: locForm.remark.trim() || null,
          sortNo,
          isActive: locForm.isActive,
        });
        setLocRows((prev) => prev.map((r) => (r.id === selectedId ? dtoToLocRow(dto) : r)));
        setEditing(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const sortIcon = (key: string) => {
    if (sort.key !== key) return <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />;
    return sort.dir === 'asc' ? (
      <ArrowUp className="size-3.5" aria-hidden />
    ) : (
      <ArrowDown className="size-3.5" aria-hidden />
    );
  };

  const renderBodyCell = (row: WarehouseRow | LocationRow, key: string) => {
    if (variant === 'warehouse') {
      const r = row as WarehouseRow;
      switch (key) {
        case 'code':
          return (
            <td key={key} className="max-w-[120px] truncate px-2 py-2.5 font-mono text-xs text-foreground">
              {r.code}
            </td>
          );
        case 'name':
          return (
            <td key={key} className="max-w-[200px] truncate px-2 py-2.5 text-foreground">
              {r.name}
            </td>
          );
        case 'remark':
          return (
            <td key={key} className="max-w-[200px] truncate px-2 py-2.5 text-xs text-muted-foreground">
              {r.remark?.trim() ? r.remark : '\u2014'}
            </td>
          );
        case 'isActive':
          return <MasterActiveListCell key={key} isActive={r.isActive} />;
        case 'createdAt':
        case 'updatedAt':
          return (
            <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs text-muted-foreground">
              {formatDt(r[key])}
            </td>
          );
        case 'createdByPerson':
        case 'updatedByPerson':
          return (
            <td key={key} className="max-w-[180px] truncate px-2 py-2.5 text-xs text-muted-foreground">
              {r[key]}
            </td>
          );
        default:
          return null;
      }
    }
    const r = row as LocationRow;
    switch (key) {
      case 'warehouseDisplay':
        return (
          <td key={key} className="max-w-[180px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {r.warehouseDisplay}
          </td>
        );
      case 'code':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 font-mono text-xs text-foreground">
            {r.code}
          </td>
        );
      case 'name':
        return (
          <td key={key} className="max-w-[160px] truncate px-2 py-2.5 text-foreground">
            {r.name?.trim() ? r.name : '\u2014'}
          </td>
        );
      case 'zone':
      case 'rack':
      case 'binNo':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {(r[key] ?? '').toString().trim() ? String(r[key]) : '\u2014'}
          </td>
        );
      case 'levelNo':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs tabular-nums text-muted-foreground">
            {r.levelNo != null ? r.levelNo : '\u2014'}
          </td>
        );
      case 'remark':
        return (
          <td key={key} className="max-w-[160px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {r.remark?.trim() ? r.remark : '\u2014'}
          </td>
        );
      case 'isActive':
        return <MasterActiveListCell key={key} isActive={r.isActive} />;
      case 'createdAt':
      case 'updatedAt':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs text-muted-foreground">
            {formatDt(r[key])}
          </td>
        );
      case 'createdByPerson':
      case 'updatedByPerson':
        return (
          <td key={key} className="max-w-[180px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {r[key]}
          </td>
        );
      default:
        return null;
    }
  };

  const tableMinW = Math.max(360, 40 + orderedVisibleCols.length * 108 + 48);
  const activeFilterSummary =
    activeFilter === 'all' ? '狀態：全部' : activeFilter === 'active' ? '狀態：啟用' : '狀態：停用';

  const warehouseFilterSummary = useMemo(() => {
    if (!warehouseFilterId) return '倉庫：全部';
    const w = warehouses.find((x) => x.id === warehouseFilterId);
    return w ? `倉庫：${w.code} ${w.name}`.trim() : '倉庫：已選擇';
  }, [warehouseFilterId, warehouses]);

  const detailTitle =
    variant === 'warehouse'
      ? creating
        ? m.addLabel
        : selectedWh?.name ?? m.hubName
      : creating
        ? m.addLabel
        : selectedLoc?.name?.trim()
          ? selectedLoc.name
          : selectedLoc?.code ?? m.hubName;

  const subtitle =
    variant === 'warehouse'
      ? !creating && selectedWh
        ? selectedWh.code
        : null
      : !creating && selectedLoc
        ? selectedLoc.code
        : null;

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          切換至{' '}
          <Link href={m.otherHref} className="font-medium text-primary underline-offset-4 hover:underline">
            {m.otherLabel}
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
              addExtraDisabled={variant === 'location' && warehousesLoading}
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
              placeholder={m.kwPh}
              autoComplete="off"
              className="h-9 min-w-[min(100%,10rem)] flex-1 basis-[min(100%,14rem)]"
            />

            {variant === 'location' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 justify-between gap-1 px-2.5 font-normal sm:min-w-40"
                    disabled={warehousesLoading}
                    aria-label="依倉庫篩選"
                  >
                    <span className="truncate">{warehouseFilterSummary}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="max-h-72 w-56 overflow-y-auto"
                  onCloseAutoFocus={(e) => {
                    e.preventDefault();
                    focusListKeyboardRegion();
                  }}
                >
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">依倉庫</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={warehouseFilterId || '__all__'}
                    onValueChange={(v) => setWarehouseFilterId(v === '__all__' ? '' : v)}
                  >
                    <DropdownMenuRadioItem value="__all__">全部倉庫</DropdownMenuRadioItem>
                    {warehouses.map((w) => (
                      <DropdownMenuRadioItem key={w.id} value={w.id}>
                        {w.code} {w.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

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
                    onClick={() => setColPref({ visibleCols: [...m.ALL_COLS], colOrder: [...m.ALL_COLS] })}
                  >
                    重置
                  </Button>
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {listCols.colOrder.map((key) => {
                    const def = m.COL_DEF[key];
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
                          if (!from || from === key || !m.ALL_COLS.includes(from)) return;
                          setColPref((p) => {
                            const norm = m.normalize(p);
                            const fromIdx = norm.colOrder.indexOf(from);
                            const toIdx = norm.colOrder.indexOf(key);
                            if (fromIdx < 0 || toIdx < 0) return norm;
                            return m.normalize({ ...norm, colOrder: arrayMove(norm.colOrder, fromIdx, toIdx) });
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
                                const norm = m.normalize(p);
                                const has = norm.visibleCols.includes(key);
                                const nextVis = has ? norm.visibleCols.filter((k) => k !== key) : [...norm.visibleCols, key];
                                return m.normalize({ ...norm, visibleCols: nextVis });
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
                          {m.COL_DEF[key]?.label ?? key}
                          {sortIcon(key)}
                        </button>
                      </th>
                    ))}
                    <th className="w-10 px-1 py-2.5" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const r = row as WarehouseRow | LocationRow;
                    const isFocused = r.id === focusedRowId;
                    const isOpenDetail = !creating && panelOpen && r.id === selectedId;
                    const isHighlighted = isFocused || isOpenDetail;
                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          'nx-master-tbody-row cursor-pointer transition-colors duration-150',
                          isHighlighted && 'nx-row-selected',
                          isHighlighted
                            ? 'bg-primary/20 ring-1 ring-inset ring-primary/40 shadow-[inset_0_1px_0_0_rgba(244,180,0,0.14)]'
                            : 'hover:bg-primary/12 hover:shadow-[inset_0_0_0_1px_rgba(244,180,0,0.2)]',
                        )}
                        onClick={() => onRowSingleClick(r.id)}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          onRowDoubleClick(r.id);
                        }}
                      >
                        <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="nx-master-row-checkbox"
                            checked={checked.has(r.id)}
                            onChange={(e) => toggleOne(r.id, e.target.checked)}
                            aria-label={'選取 ' + (variant === 'warehouse' ? (r as WarehouseRow).code : (r as LocationRow).code)}
                          />
                        </td>
                        {orderedVisibleCols.map((k) => renderBodyCell(r, k))}
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
        subtitle={subtitle}
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
              {variant === 'warehouse' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${m.titleId}-code`}>倉庫代碼</Label>
                    <Input
                      id={`${m.titleId}-code`}
                      value={whForm.code}
                      onChange={(e) => setWhDraft((d) => ({ ...d, code: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${m.titleId}-name`}>倉庫名稱</Label>
                    <Input
                      id={`${m.titleId}-name`}
                      value={whForm.name}
                      onChange={(e) => setWhDraft((d) => ({ ...d, name: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${m.titleId}-remark`}>備註</Label>
                    <Textarea
                      id={`${m.titleId}-remark`}
                      value={whForm.remark}
                      onChange={(e) => setWhDraft((d) => ({ ...d, remark: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={cn('min-h-[88px] resize-y', !editing && !creating && readonlyFieldCls)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${m.titleId}-sort`}>排序</Label>
                    <Input
                      id={`${m.titleId}-sort`}
                      inputMode="numeric"
                      value={whForm.sortNo}
                      onChange={(e) => setWhDraft((d) => ({ ...d, sortNo: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-2 sm:col-span-2">
                    <input
                      id={`${m.titleId}-active`}
                      type="checkbox"
                      className="size-4 rounded border border-input accent-primary"
                      checked={whForm.isActive}
                      disabled={!editing && !creating}
                      onChange={(e) => setWhDraft((d) => ({ ...d, isActive: e.target.checked }))}
                    />
                    <Label htmlFor={`${m.titleId}-active`} className="font-normal">
                      啟用
                    </Label>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${m.titleId}-wh`}>倉庫</Label>
                    {creating ? (
                      <select
                        id={`${m.titleId}-wh`}
                        className={cn(selectCls, !editing && readonlyFieldCls)}
                        disabled={!editing}
                        value={locForm.warehouseId}
                        onChange={(e) => setLocDraft((d) => ({ ...d, warehouseId: e.target.value }))}
                      >
                        <option value="">— 請選擇倉庫 —</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.code} {w.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={`${m.titleId}-wh`}
                        readOnly
                        value={selectedLoc?.warehouseDisplay ?? '\u2014'}
                        className={readonlyFieldCls}
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${m.titleId}-code`}>庫位代碼</Label>
                    <Input
                      id={`${m.titleId}-code`}
                      value={locForm.code}
                      onChange={(e) => setLocDraft((d) => ({ ...d, code: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${m.titleId}-name`}>庫位名稱</Label>
                    <Input
                      id={`${m.titleId}-name`}
                      value={locForm.name}
                      onChange={(e) => setLocDraft((d) => ({ ...d, name: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${m.titleId}-zone`}>區域</Label>
                    <Input
                      id={`${m.titleId}-zone`}
                      value={locForm.zone}
                      onChange={(e) => setLocDraft((d) => ({ ...d, zone: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${m.titleId}-rack`}>架號</Label>
                    <Input
                      id={`${m.titleId}-rack`}
                      value={locForm.rack}
                      onChange={(e) => setLocDraft((d) => ({ ...d, rack: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${m.titleId}-level`}>層數</Label>
                    <Input
                      id={`${m.titleId}-level`}
                      inputMode="numeric"
                      value={locForm.levelNo}
                      onChange={(e) => setLocDraft((d) => ({ ...d, levelNo: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${m.titleId}-bin`}>格數</Label>
                    <Input
                      id={`${m.titleId}-bin`}
                      value={locForm.binNo}
                      onChange={(e) => setLocDraft((d) => ({ ...d, binNo: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${m.titleId}-remark`}>備註</Label>
                    <Textarea
                      id={`${m.titleId}-remark`}
                      value={locForm.remark}
                      onChange={(e) => setLocDraft((d) => ({ ...d, remark: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={cn('min-h-[88px] resize-y', !editing && !creating && readonlyFieldCls)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${m.titleId}-sort`}>排序</Label>
                    <Input
                      id={`${m.titleId}-sort`}
                      inputMode="numeric"
                      value={locForm.sortNo}
                      onChange={(e) => setLocDraft((d) => ({ ...d, sortNo: e.target.value }))}
                      readOnly={!editing && !creating}
                      className={!editing && !creating ? readonlyFieldCls : undefined}
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-2 sm:col-span-2">
                    <input
                      id={`${m.titleId}-active`}
                      type="checkbox"
                      className="size-4 rounded border border-input accent-primary"
                      checked={locForm.isActive}
                      disabled={!editing && !creating}
                      onChange={(e) => setLocDraft((d) => ({ ...d, isActive: e.target.checked }))}
                    />
                    <Label htmlFor={`${m.titleId}-active`} className="font-normal">
                      啟用
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-3 outline-none">
            <div className="space-y-3 pb-2">
              <div className="space-y-2">
                <Label>建立時間</Label>
                <Input
                  readOnly
                  value={
                    variant === 'warehouse' && selectedWh
                      ? formatDt(selectedWh.createdAt)
                      : variant === 'location' && selectedLoc
                        ? formatDt(selectedLoc.createdAt)
                        : '\u2014'
                  }
                  className={readonlyFieldCls}
                />
              </div>
              <div className="space-y-2">
                <Label>建立人員</Label>
                <Input
                  readOnly
                  value={
                    variant === 'warehouse' && selectedWh
                      ? selectedWh.createdByPerson
                      : variant === 'location' && selectedLoc
                        ? selectedLoc.createdByPerson
                        : '\u2014'
                  }
                  className={readonlyFieldCls}
                />
              </div>
              <div className="space-y-2">
                <Label>修改時間</Label>
                <Input
                  readOnly
                  value={
                    variant === 'warehouse' && selectedWh
                      ? formatDt(selectedWh.updatedAt)
                      : variant === 'location' && selectedLoc
                        ? formatDt(selectedLoc.updatedAt)
                        : '\u2014'
                  }
                  className={readonlyFieldCls}
                />
              </div>
              <div className="space-y-2">
                <Label>修改人員</Label>
                <Input
                  readOnly
                  value={
                    variant === 'warehouse' && selectedWh
                      ? selectedWh.updatedByPerson
                      : variant === 'location' && selectedLoc
                        ? selectedLoc.updatedByPerson
                        : '\u2014'
                  }
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

export function BaseWarehouseMasterView() {
  return <BaseWarehouseLikeMasterView variant="warehouse" />;
}

export function BaseLocationMasterView() {
  return <BaseWarehouseLikeMasterView variant="location" />;
}
