/**
 * 零件主檔：LIST + SLIDE（與 /base/user 相同互動）；GET/POST/PUT /part
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import { listBrand } from '@/features/nx00/brand/api/brand';
import type { BrandDto } from '@/features/nx00/brand/types';
import { listLookupCarBrand } from '@/features/nx00/lookup/api/lookup';
import { createPart, listPart, updatePart } from '@/features/nx00/part/api/part';
import type { PartDto } from '@/features/nx00/part/types';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { BaseMasterSlideAside, useMasterSlideDetailEffects } from '@/features/base/shell/BaseMasterSlideAside';
import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { BasePartRow } from './mock-data';

const PAGE_SIZE = 10;
const LIST_COL_PREF_KEY = 'base.part.listcols';
const LIST_COL_PREF_VERSION = 2;

type ListColKey =
  | 'sku'
  | 'name'
  | 'brandName'
  | 'carBrandName'
  | 'isOem'
  | 'partType'
  | 'secCode'
  | 'countryDisplay'
  | 'partGroupDisplay'
  | 'spec'
  | 'isActive';
type SortKey = ListColKey;
type SortDir = 'asc' | 'desc';

const ALL_LIST_COLS: ListColKey[] = [
  'sku',
  'name',
  'brandName',
  'carBrandName',
  'isOem',
  'partType',
  'secCode',
  'countryDisplay',
  'partGroupDisplay',
  'spec',
  'isActive',
];
const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  sku: { label: '料號', locked: true },
  name: { label: '品名' },
  brandName: { label: '零件廠牌' },
  carBrandName: { label: '汽車廠牌' },
  isOem: { label: '正副廠' },
  partType: { label: '類型' },
  secCode: { label: '副廠料號' },
  countryDisplay: { label: '產地' },
  partGroupDisplay: { label: '零件族群' },
  spec: { label: '規格' },
  isActive: { label: '狀態' },
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

type Draft = {
  sku: string;
  name: string;
  spec: string;
  unit: string;
  isActive: boolean;
  partBrandId: string | null;
  isOem: boolean;
  carBrandId: string | null;
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
    sku: '',
    name: '',
    spec: '',
    unit: 'pcs',
    isActive: true,
    partBrandId: null,
    isOem: true,
    carBrandId: null,
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
    sku: r.sku,
    name: r.name,
    spec: r.spec,
    unit: r.unit,
    isActive: r.isActive,
    partBrandId: r.partBrandId,
    isOem: r.isOem,
    carBrandId: r.carBrandId,
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
  return {
    id: p.id,
    sku: p.code,
    name: p.name,
    spec: p.spec ?? '',
    unit: p.uom,
    isActive: p.isActive,
    partBrandId: p.partBrandId ?? null,
    brandCode: p.brandCode ?? null,
    brandName: p.brandName ?? null,
    isOem: p.isOem,
    carBrandId: p.carBrandId ?? null,
    carBrandCode: p.carBrandCode ?? null,
    carBrandName: p.carBrandName ?? null,
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
    createdByName: p.createdByName ?? null,
    updatedAt: p.updatedAt,
    updatedBy: p.updatedBy ?? null,
    updatedByName: p.updatedByName ?? null,
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
  const [rows, setRows] = useState<BasePartRow[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [carBrands, setCarBrands] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [keyword, setKeyword] = useState('');
  const [oemPick, setOemPick] = useState<'all' | 'oem' | 'aftermarket'>('all');
  const [fSku, setFSku] = useState('');
  const [fName, setFName] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'sku', dir: 'asc' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [carBrandsLoading, setCarBrandsLoading] = useState(true);
  const [countries, setCountries] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [partGroups, setPartGroups] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('main');
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const colPickerWrapRef = useRef<HTMLDivElement>(null);

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

  const loadCarBrands = useCallback(async () => {
    setCarBrandsLoading(true);
    try {
      const items = await listLookupCarBrand({ isActive: true });
      setCarBrands([...items].sort((a, b) => a.code.localeCompare(b.code, 'en')));
    } catch {
      setCarBrands([]);
    } finally {
      setCarBrandsLoading(false);
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
    void loadCarBrands();
    void loadLookups();
  }, [loadBrands, loadCarBrands, loadLookups]);

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
      if (oemPick === 'oem' && !r.isOem) return false;
      if (oemPick === 'aftermarket' && r.isOem) return false;
      if (k) {
        const blob =
          `${r.sku} ${r.name} ${r.spec} ${brandLabel(r)} ${r.carBrandName ?? ''} ${partTypeLabel(r.partType)} ${r.secCode ?? ''} ${countryDisplay(r)} ${partGroupDisplay(r)}`.toLowerCase();
        if (!blob.includes(k)) return false;
      }
      if (fSku.trim() && !r.sku.toLowerCase().includes(fSku.trim().toLowerCase())) return false;
      if (fName.trim() && !r.name.includes(fName.trim())) return false;
      return true;
    });
  }, [rows, keyword, oemPick, fSku, fName]);

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sk = sort.key;
    const out = [...filtered];
    out.sort((a, b) => {
      switch (sk) {
        case 'sku':
          return mult * a.sku.localeCompare(b.sku, 'zh-Hant');
        case 'name':
          return mult * a.name.localeCompare(b.name, 'zh-Hant');
        case 'brandName':
          return mult * brandLabel(a).localeCompare(brandLabel(b), 'zh-Hant');
        case 'carBrandName':
          return mult * (a.carBrandName ?? '').localeCompare(b.carBrandName ?? '', 'zh-Hant');
        case 'isOem':
          return mult * ((a.isOem ? 1 : 0) - (b.isOem ? 1 : 0));
        case 'partType':
          return mult * (partTypeLabel(a.partType).localeCompare(partTypeLabel(b.partType), 'zh-Hant'));
        case 'secCode':
          return mult * (a.secCode ?? '').localeCompare(b.secCode ?? '', 'en');
        case 'countryDisplay':
          return mult * countryDisplay(a).localeCompare(countryDisplay(b), 'zh-Hant');
        case 'partGroupDisplay':
          return mult * partGroupDisplay(a).localeCompare(partGroupDisplay(b), 'zh-Hant');
        case 'spec':
          return mult * (a.spec ?? '').localeCompare(b.spec ?? '', 'zh-Hant');
        case 'isActive':
          return mult * ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
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

  const filterKey = `${keyword}|${oemPick}|${fSku}|${fName}`;
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
    setSaveConfirmOpen(false);
  }, []);

  useMasterSlideDetailEffects(panelOpen, closeDetailFull, detailFullscreen, setDetailFullscreen, [selectedId, creating]);

  const goDetailPrev = useCallback(() => {
    if (creating || selectedIdxSorted <= 0) return;
    const prev = sortedRows[selectedIdxSorted - 1];
    if (!prev) return;
    setSelectedId(prev.id);
    setCreating(false);
    setEditing(false);
  }, [creating, selectedIdxSorted, sortedRows]);

  const goDetailNext = useCallback(() => {
    if (creating || selectedIdxSorted < 0 || selectedIdxSorted >= sortedRows.length - 1) return;
    const next = sortedRows[selectedIdxSorted + 1];
    if (!next) return;
    setSelectedId(next.id);
    setCreating(false);
    setEditing(false);
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

  const onRowClick = (id: string) => {
    if (id === selectedId && !creating) {
      closeDetailFull();
      return;
    }
    setSelectedId(id);
    setCreating(false);
    setEditing(false);
  };

  const onAdd = () => {
    setSelectedId(null);
    setCreating(true);
    setEditing(true);
    setDraft(emptyDraft());
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
    setSaving(true);
    setError(null);
    setSaveConfirmOpen(false);
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
        carBrandId: draft.carBrandId,
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
        const dto = await createPart(body);
        const row = dtoToRow(dto);
        setRows((prev) => [...prev, row]);
        setCreating(false);
        setEditing(false);
        setSelectedId(row.id);
        return;
      }
      if (!selectedId) return;
      const dto = await updatePart(selectedId, body);
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

  const renderBodyCell = (row: BasePartRow, key: ListColKey) => {
    switch (key) {
      case 'sku':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 font-mono text-xs text-foreground">
            {row.sku}
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
            {brandLabel(row) || '—'}
          </td>
        );
      case 'carBrandName':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.carBrandName || row.carBrandCode || '—'}
          </td>
        );
      case 'isOem':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs text-muted-foreground">
            {row.isOem ? '正廠' : '副廠'}
          </td>
        );
      case 'partType':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {partTypeLabel(row.partType) || '—'}
          </td>
        );
      case 'secCode':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 font-mono text-xs text-muted-foreground">
            {row.secCode || '—'}
          </td>
        );
      case 'countryDisplay':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {countryDisplay(row) || '—'}
          </td>
        );
      case 'partGroupDisplay':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {partGroupDisplay(row) || '—'}
          </td>
        );
      case 'spec':
        return (
          <td key={key} className="max-w-[160px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.spec || '—'}
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
      default:
        return null;
    }
  };

  const filterTh = (key: ListColKey) => {
    if (key === 'sku') {
      return (
        <th key={`f-${key}`} className="p-2">
          <Input
            value={fSku}
            onChange={(e) => setFSku(e.target.value)}
            placeholder="篩選"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      );
    }
    if (key === 'name') {
      return (
        <th key={`f-${key}`} className="p-2">
          <Input
            value={fName}
            onChange={(e) => setFName(e.target.value)}
            placeholder="篩選"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      );
    }
    return <th key={`f-${key}`} className="p-2" />;
  };

  const tableMinW = Math.max(480, 32 + orderedVisibleCols.length * 104 + 40);

  return (
    <>
      <div className="relative flex flex-col gap-4">
        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋與篩選</h2>
          <div className="mt-4 max-w-md">
            <Label htmlFor="bp-keyword">關鍵字</Label>
            <Input
              id="bp-keyword"
              className="mt-2"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="料號、品名、規格、廠牌…"
              autoComplete="off"
            />
          </div>
        </section>

        <section className="glass-card flex min-h-[min(420px,70dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 shadow-sm lg:min-h-[420px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
            <nav
              className="hidden shrink-0 flex-col gap-0.5 border-b border-border/60 p-3 lg:flex lg:w-36 lg:border-b-0 lg:border-r lg:py-4"
              aria-label="正副廠篩選"
            >
              {(
                [
                  { k: 'all' as const, label: '全部' },
                  { k: 'oem' as const, label: '正廠' },
                  { k: 'aftermarket' as const, label: '副廠' },
                ] as const
              ).map(({ k, label }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOemPick(k)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    oemPick === k ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-secondary/60',
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
              <div className="mb-3 lg:hidden">
                <select
                  className="nx-native-select h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
                  value={oemPick}
                  onChange={(e) => setOemPick(e.target.value as typeof oemPick)}
                  aria-label="正副廠"
                >
                  <option value="all">全部</option>
                  <option value="oem">正廠</option>
                  <option value="aftermarket">副廠</option>
                </select>
              </div>

              <div className="relative flex flex-wrap items-center gap-2 border-b border-border/60 pb-3" ref={colPickerWrapRef}>
                <Button type="button" size="sm" variant="default" onClick={onAdd} disabled={loading || saving || lookupsLoading}>
                  新增
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void reload()} disabled={loading}>
                  重新載入
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 px-2"
                  onClick={() => setColPickerOpen((o) => !o)}
                  aria-expanded={colPickerOpen}
                >
                  <Columns3 className="size-4" aria-hidden />
                  欄位
                </Button>

                {colPickerOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,320px)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
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

                <div className="flex flex-wrap items-center gap-1 border-l border-border/60 pl-2 ml-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 px-2"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    上一頁
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground tabular-nums">
                    第 {safePage} / {totalPages} 頁
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 px-2"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    下一頁
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {loading ? '載入中…' : `共 ${sortedRows.length} 筆 · 本頁 ${pageRows.length} 筆`}
                </span>
              </div>

              <div className="mt-3 min-h-0 min-w-0 flex-1 overflow-auto overscroll-x-contain pr-2">
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
                      <tr className="border-b border-border/60 bg-secondary/20">
                        {orderedVisibleCols.map((key) => filterTh(key))}
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td
                          className="bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground"
                          colSpan={orderedVisibleCols.length + 1}
                        >
                          零件
                        </td>
                      </tr>
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
          </div>
        </section>
      </div>

      <BaseMasterSlideAside
        open={panelOpen}
        detailFullscreen={detailFullscreen}
        onToggleFullscreen={() => setDetailFullscreen((v) => !v)}
        onClose={closeDetailFull}
        titleId="bp-detail-title"
        title={creating ? '新增零件' : selected?.sku ?? '零件明細'}
        subtitle={!creating && selected ? selected.name : undefined}
        navPrev={
          !creating && selectedIdxSorted >= 0
            ? { onClick: goDetailPrev, disabled: selectedIdxSorted <= 0 }
            : undefined
        }
        navNext={
          !creating && selectedIdxSorted >= 0
            ? { onClick: goDetailNext, disabled: selectedIdxSorted >= sortedRows.length - 1 }
            : undefined
        }
        footer={
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
            {creating || editing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!draft.sku.trim()) return;
                    setSaveConfirmOpen(true);
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
        }
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
            <div className="space-y-3 pb-28 lg:pb-6">
              <div className="space-y-2">
                <Label htmlFor="bp-sku">料號</Label>
                <Input
                  id="bp-sku"
                  value={formValues.sku}
                  onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp-brand">零件廠牌</Label>
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
              <label htmlFor="bp-oem" className="flex items-center gap-2 text-sm">
                <input
                  id="bp-oem"
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={formValues.isOem}
                  disabled={!creating && !editing}
                  onChange={(e) => setDraft((d) => ({ ...d, isOem: e.target.checked }))}
                />
                正廠零件
              </label>
              <div className="space-y-2">
                <Label htmlFor="bp-car-brand">汽車廠牌</Label>
                <select
                  id="bp-car-brand"
                  className={cn(selectCls, !creating && !editing && readonlyFieldCls)}
                  value={formValues.carBrandId ?? ''}
                  disabled={!creating && !editing || carBrandsLoading}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, carBrandId: e.target.value === '' ? null : e.target.value }))
                  }
                >
                  <option value="">（未指定）</option>
                  {carBrands.map((b) => (
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
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, partType: e.target.value === '' ? null : e.target.value }))
                  }
                >
                  {PART_TYPE_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
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
              <div className="space-y-2">
                <Label htmlFor="bp-seccode">副廠料號（sec_code）</Label>
                <Input
                  id="bp-seccode"
                  value={formValues.secCode}
                  onChange={(e) => setDraft((d) => ({ ...d, secCode: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-5">
                {(['seg1', 'seg2', 'seg3', 'seg4', 'seg5'] as const).map((k, i) => (
                  <div key={k} className="space-y-2">
                    <Label htmlFor={`bp-${k}`}>分段 {i + 1}</Label>
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
                <Label htmlFor="bp-country">產地（國家）</Label>
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
            </div>
          </TabsContent>
          <TabsContent value="audit" className="mt-3 space-y-2 text-sm outline-none">
            {selected && !creating ? (
              <>
                <div className="flex justify-between gap-4 border-b border-border/40 py-2">
                  <span className="text-muted-foreground">建立時間</span>
                  <span className="text-right text-xs">{selected.createdAt || '—'}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/40 py-2">
                  <span className="text-muted-foreground">建立人</span>
                  <span className="text-right text-xs">{selected.createdByName || selected.createdBy || '—'}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/40 py-2">
                  <span className="text-muted-foreground">修改時間</span>
                  <span className="text-right text-xs">{selected.updatedAt || '—'}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/40 py-2">
                  <span className="text-muted-foreground">修改人</span>
                  <span className="text-right text-xs">{selected.updatedByName || selected.updatedBy || '—'}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">請選擇一筆資料以檢視稽核欄位。</p>
            )}
          </TabsContent>
        </Tabs>

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
      </BaseMasterSlideAside>

      <MasterSaveConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        onConfirm={() => void performSave()}
      />
    </>
  );
}
