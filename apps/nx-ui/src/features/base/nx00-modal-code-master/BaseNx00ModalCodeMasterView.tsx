/**
 * 國家／幣別／零件族群主檔：與汽車廠牌相同的 LIST + 置中彈窗明細（排序僅於「基本資料」）
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

export type Nx00ModalCodeVariant = 'country' | 'currency' | 'partGroup';

type CodeRow = {
  id: string;
  code: string;
  name: string;
  sortNo: number;
  isActive: boolean;
  symbol: string | null;
  decimalPlaces: number;
  createdAt: string;
  updatedAt: string;
  createdByPerson: string;
  updatedByPerson: string;
};

type CountryListKey =
  | 'code'
  | 'name'
  | 'isActive'
  | 'createdAt'
  | 'createdByPerson'
  | 'updatedAt'
  | 'updatedByPerson';
type CurrencyListKey = CountryListKey | 'symbol' | 'decimalPlaces';

type SortDir = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';

type CountryDraft = { code: string; name: string; sortNo: string; isActive: boolean };
type CurrencyDraft = CountryDraft & { symbol: string; decimalPlaces: string };

const PAGE_SIZE = 10;

const COUNTRY_COLS: CountryListKey[] = [
  'code',
  'name',
  'isActive',
  'createdAt',
  'createdByPerson',
  'updatedAt',
  'updatedByPerson',
];
const CURRENCY_COLS: CurrencyListKey[] = [
  'code',
  'name',
  'symbol',
  'decimalPlaces',
  'isActive',
  'createdAt',
  'createdByPerson',
  'updatedAt',
  'updatedByPerson',
];

const COUNTRY_COL_DEF: Record<CountryListKey, { label: string; locked?: boolean }> = {
  code: { label: '國家代碼', locked: true },
  name: { label: '國家名稱' },
  isActive: { label: '啟用' },
  createdAt: { label: '建立時間' },
  createdByPerson: { label: '建立人員' },
  updatedAt: { label: '修改時間' },
  updatedByPerson: { label: '修改人員' },
};

const CURRENCY_COL_DEF: Record<CurrencyListKey, { label: string; locked?: boolean }> = {
  code: { label: '幣別代碼', locked: true },
  name: { label: '幣別名稱' },
  symbol: { label: '幣別符號' },
  decimalPlaces: { label: '小數位數' },
  isActive: { label: '啟用' },
  createdAt: { label: '建立時間' },
  createdByPerson: { label: '建立人員' },
  updatedAt: { label: '修改時間' },
  updatedByPerson: { label: '修改人員' },
};

const PART_GROUP_COL_DEF: Record<CountryListKey, { label: string; locked?: boolean }> = {
  code: { label: '族群代碼', locked: true },
  name: { label: '族群名稱' },
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

function dtoToRowCountry(d: {
  id: string;
  code: string;
  name: string;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUsername?: string | null;
  createdByName?: string | null;
  updatedByUsername?: string | null;
  updatedByName?: string | null;
}): CodeRow {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    sortNo: d.sortNo,
    isActive: d.isActive,
    symbol: null,
    decimalPlaces: 0,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    createdByPerson: formatAuditPersonLabel(d.createdByUsername ?? null, d.createdByName ?? null),
    updatedByPerson: formatAuditPersonLabel(d.updatedByUsername ?? null, d.updatedByName ?? null),
  };
}

function dtoToRowCurrency(d: {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  decimalPlaces: number;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUsername?: string | null;
  createdByName?: string | null;
  updatedByUsername?: string | null;
  updatedByName?: string | null;
}): CodeRow {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    sortNo: d.sortNo,
    isActive: d.isActive,
    symbol: d.symbol ?? null,
    decimalPlaces: d.decimalPlaces,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    createdByPerson: formatAuditPersonLabel(d.createdByUsername ?? null, d.createdByName ?? null),
    updatedByPerson: formatAuditPersonLabel(d.updatedByUsername ?? null, d.updatedByName ?? null),
  };
}

function emptyDraftCountry(): CountryDraft {
  return { code: '', name: '', sortNo: '0', isActive: true };
}

function emptyDraftCurrency(): CurrencyDraft {
  return { ...emptyDraftCountry(), symbol: '', decimalPlaces: '2' };
}

function fromRowCountry(r: CodeRow): CountryDraft {
  return {
    code: r.code,
    name: r.name,
    sortNo: String(r.sortNo),
    isActive: r.isActive,
  };
}

function fromRowCurrency(r: CodeRow): CurrencyDraft {
  return {
    ...fromRowCountry(r),
    symbol: r.symbol ?? '',
    decimalPlaces: String(r.decimalPlaces),
  };
}

function isRadixFilterMenuOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector(
    '[data-slot="dropdown-menu-content"][data-state="open"], [data-slot="dropdown-menu-sub-content"][data-state="open"]',
  );
}

type ListColPref = { visibleCols: string[]; colOrder: string[] };

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

export function BaseNx00ModalCodeMasterView({ variant }: { variant: Nx00ModalCodeVariant }) {
  const router = useRouter();
  const pathname = usePathname();
  const isCurrency = variant === 'currency';

  const meta = useMemo(() => {
    if (variant === 'country') {
      return {
        basePath: '/country',
        listErrorCode: 'nxui_base_country_list',
        listPrefKey: 'base.country.modal.listcols',
        listPrefVersion: 1,
        titleId: 'nx-country-detail',
        hubName: '國家主檔',
        addLabel: '新增國家',
        keywordPlaceholder: '國家代碼、名稱…',
        ALL_COLS: COUNTRY_COLS as readonly string[],
        COL_DEF: COUNTRY_COL_DEF as Record<string, { label: string; locked?: boolean }>,
        defaultPref: { visibleCols: [...COUNTRY_COLS], colOrder: [...COUNTRY_COLS] },
      };
    }
    if (variant === 'partGroup') {
      return {
        basePath: '/part-group',
        listErrorCode: 'nxui_base_pagr_list',
        listPrefKey: 'base.partGroup.modal.listcols',
        listPrefVersion: 1,
        titleId: 'nx-part-group-detail',
        hubName: '零件族群主檔',
        addLabel: '新增族群',
        keywordPlaceholder: '族群代碼、名稱…',
        ALL_COLS: COUNTRY_COLS as readonly string[],
        COL_DEF: PART_GROUP_COL_DEF as Record<string, { label: string; locked?: boolean }>,
        defaultPref: { visibleCols: [...COUNTRY_COLS], colOrder: [...COUNTRY_COLS] },
      };
    }
    return {
      basePath: '/currency',
      listErrorCode: 'nxui_base_currency_list',
      listPrefKey: 'base.currency.modal.listcols',
      listPrefVersion: 1,
      titleId: 'nx-currency-detail',
      hubName: '幣別主檔',
      addLabel: '新增幣別',
      keywordPlaceholder: '幣別代碼、名稱、符號…',
      ALL_COLS: CURRENCY_COLS as readonly string[],
      COL_DEF: CURRENCY_COL_DEF as Record<string, { label: string; locked?: boolean }>,
      defaultPref: { visibleCols: [...CURRENCY_COLS], colOrder: [...CURRENCY_COLS] },
    };
  }, [variant]);

  const [rows, setRows] = useState<CodeRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: 'code', dir: 'asc' });
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftCountry, setDraftCountry] = useState<CountryDraft>(() => emptyDraftCountry());
  const [draftCurrency, setDraftCurrency] = useState<CurrencyDraft>(() => emptyDraftCurrency());
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
    meta.defaultPref,
  );
  const listCols = useMemo(
    () => normalizeColPref(colPrefRaw, meta.ALL_COLS),
    [colPrefRaw, meta.ALL_COLS],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString({ page: '1', pageSize: '500' });
      const res = await apiFetch(`${meta.basePath}${qs}`, { method: 'GET' });
      await assertOk(res, meta.listErrorCode);
      const data = (await res.json()) as { items: unknown[] };
      const items = data.items ?? [];
      if (isCurrency) {
        setRows(items.map((x) => dtoToRowCurrency(x as Parameters<typeof dtoToRowCurrency>[0])));
      } else {
        setRows(items.map((x) => dtoToRowCountry(x as Parameters<typeof dtoToRowCountry>[0])));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [meta.basePath, meta.listErrorCode, isCurrency]);

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
    return rows.filter((r) => {
      if (activeFilter === 'active' && !r.isActive) return false;
      if (activeFilter === 'inactive' && r.isActive) return false;
      if (!k) return true;
      const blob = isCurrency
        ? `${r.code} ${r.name} ${r.symbol ?? ''} ${r.decimalPlaces} ${r.createdByPerson} ${r.updatedByPerson}`.toLowerCase()
        : `${r.code} ${r.name} ${r.createdByPerson} ${r.updatedByPerson}`.toLowerCase();
      return blob.includes(k);
    });
  }, [rows, keyword, activeFilter, isCurrency]);

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sk = sort.key;
    const out = [...filtered];
    out.sort((a, b) => {
      if (sk === 'decimalPlaces' || sk === 'sortNo') {
        return mult * ((Number(a[sk as keyof CodeRow]) || 0) - (Number(b[sk as keyof CodeRow]) || 0));
      }
      if (sk === 'isActive') {
        return mult * ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
      }
      const av = a[sk as keyof CodeRow];
      const bv = b[sk as keyof CodeRow];
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
      if (isCurrency) setDraftCurrency(emptyDraftCurrency());
      else setDraftCountry(emptyDraftCountry());
      setDetailTab('main');
      return;
    }
    if (selected) {
      if (isCurrency) setDraftCurrency(fromRowCurrency(selected));
      else setDraftCountry(fromRowCountry(selected));
    }
  }, [creating, selectedId, selected, isCurrency]);

  const draft = isCurrency ? draftCurrency : draftCountry;

  const patchDraft = useCallback(
    (patch: Partial<CurrencyDraft>) => {
      if (isCurrency) {
        setDraftCurrency((p) => ({ ...p, ...patch }));
      } else {
        const { symbol: _sym, decimalPlaces: _dec, ...rest } = patch;
        setDraftCountry((p) => ({ ...p, ...rest }));
      }
    },
    [isCurrency],
  );

  const formValues =
    creating || editing
      ? draft
      : selected
        ? isCurrency
          ? fromRowCurrency(selected)
          : fromRowCountry(selected)
        : isCurrency
          ? emptyDraftCurrency()
          : emptyDraftCountry();

  const readonlyFieldCls = 'bg-muted/40 text-muted-foreground cursor-default';
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
    if (isCurrency) setDraftCurrency(emptyDraftCurrency());
    else setDraftCountry(emptyDraftCountry());
  };

  const patchActive = async (id: string, isActive: boolean) => {
    const res = await apiFetch(`${meta.basePath}/${encodeURIComponent(id)}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    await assertOk(res, `${variant}_active`);
    return (await res.json()) as unknown;
  };

  const onBulkActive = async (active: boolean) => {
    if (checked.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const id of checked) {
        const dto = await patchActive(id, active);
        const row = isCurrency
          ? dtoToRowCurrency(dto as Parameters<typeof dtoToRowCurrency>[0])
          : dtoToRowCountry(dto as Parameters<typeof dtoToRowCountry>[0]);
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
    if (isCurrency) setDraftCurrency(fromRowCurrency(selected));
    else setDraftCountry(fromRowCountry(selected));
  };

  const onCancel = () => {
    if (creating) {
      closeDetailFull();
      return;
    }
    setEditing(false);
  };

  const onSave = async () => {
    const rawCode = draft.code.trim();
    const code = variant === 'country' ? rawCode.toUpperCase() : rawCode;
    const name = draft.name.trim();
    if (!code || !name) return;
    const sortN = Number.parseInt(draft.sortNo, 10);
    const sortNo = Number.isFinite(sortN) ? sortN : 0;
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        if (isCurrency) {
          const dc = draft as CurrencyDraft;
          const dp = Number.parseInt(dc.decimalPlaces, 10);
          const decimalPlaces = Number.isFinite(dp) ? dp : 2;
          const res = await apiFetch(meta.basePath, {
            method: 'POST',
            body: JSON.stringify({
              code,
              name,
              symbol: dc.symbol.trim() || null,
              decimalPlaces,
              sortNo,
              isActive: draft.isActive,
            }),
          });
          await assertOk(res, 'base.currency_create');
          const dto = (await res.json()) as Parameters<typeof dtoToRowCurrency>[0];
          const row = dtoToRowCurrency(dto);
          setRows((prev) => [...prev, row].sort((a, b) => a.sortNo - b.sortNo || a.code.localeCompare(b.code, 'zh-Hant')));
          setCreating(false);
          setEditing(false);
          setSelectedId(row.id);
          setFocusedRowId(row.id);
        } else {
          const res = await apiFetch(meta.basePath, {
            method: 'POST',
            body: JSON.stringify({ code, name, sortNo, isActive: draft.isActive }),
          });
          await assertOk(res, variant === 'country' ? 'base.country_create' : 'base.partGroup_create');
          const dto = (await res.json()) as Parameters<typeof dtoToRowCountry>[0];
          const row = dtoToRowCountry(dto);
          setRows((prev) => [...prev, row].sort((a, b) => a.sortNo - b.sortNo || a.code.localeCompare(b.code, 'zh-Hant')));
          setCreating(false);
          setEditing(false);
          setSelectedId(row.id);
          setFocusedRowId(row.id);
        }
        return;
      }
      if (!selectedId || !selected) return;
      if (isCurrency) {
        const dc = draft as CurrencyDraft;
        const dp = Number.parseInt(dc.decimalPlaces, 10);
        const decimalPlaces = Number.isFinite(dp) ? dp : 2;
        const res = await apiFetch(`${meta.basePath}/${encodeURIComponent(selectedId)}`, {
          method: 'PUT',
          body: JSON.stringify({
            code,
            name,
            symbol: dc.symbol.trim() || null,
            decimalPlaces,
            sortNo,
            isActive: draft.isActive,
          }),
        });
        await assertOk(res, 'base.currency_update');
        const dto = (await res.json()) as Parameters<typeof dtoToRowCurrency>[0];
        setRows((prev) => prev.map((r) => (r.id === selectedId ? dtoToRowCurrency(dto) : r)));
      } else {
        const res = await apiFetch(`${meta.basePath}/${encodeURIComponent(selectedId)}`, {
          method: 'PUT',
          body: JSON.stringify({ code, name, sortNo, isActive: draft.isActive }),
        });
        await assertOk(res, variant === 'country' ? 'base.country_update' : 'base.partGroup_update');
        const dto = (await res.json()) as Parameters<typeof dtoToRowCountry>[0];
        setRows((prev) => prev.map((r) => (r.id === selectedId ? dtoToRowCountry(dto) : r)));
      }
      setEditing(false);
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

  const renderBodyCell = (row: CodeRow, key: string) => {
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
      case 'symbol':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 text-sm text-muted-foreground">
            {row.symbol?.trim() ? row.symbol : '\u2014'}
          </td>
        );
      case 'decimalPlaces':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs tabular-nums text-muted-foreground">
            {row.decimalPlaces}
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

  const tableMinW = Math.max(360, 40 + orderedVisibleCols.length * 108 + 48);
  const activeFilterSummary =
    activeFilter === 'all' ? '狀態：全部' : activeFilter === 'active' ? '狀態：啟用' : '狀態：停用';

  const detailTitle = creating ? meta.addLabel : auditSource?.name ?? meta.hubName;

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
              onBulkEnable={() => void onBulkActive(true)}
              onBulkDisable={() => void onBulkActive(false)}
              addExtraDisabled={false}
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
                    onClick={() =>
                      setColPref({
                        visibleCols: [...meta.ALL_COLS],
                        colOrder: [...meta.ALL_COLS],
                      } as never)
                    }
                  >
                    重置
                  </Button>
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {listCols.colOrder.map((key: string) => {
                    const def = meta.COL_DEF[key];
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
                          if (!from || from === key || !meta.ALL_COLS.includes(from)) return;
                          setColPref((p) => {
                            const norm = normalizeColPref(p, meta.ALL_COLS);
                            const fromIdx = norm.colOrder.indexOf(from);
                            const toIdx = norm.colOrder.indexOf(key);
                            if (fromIdx < 0 || toIdx < 0) return p;
                            return normalizeColPref(
                              { ...norm, colOrder: arrayMove(norm.colOrder, fromIdx, toIdx) },
                              meta.ALL_COLS,
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
                                const norm = normalizeColPref(p, meta.ALL_COLS);
                                const has = norm.visibleCols.includes(key);
                                const nextVis = has ? norm.visibleCols.filter((k) => k !== key) : [...norm.visibleCols, key];
                                return normalizeColPref({ ...norm, visibleCols: nextVis }, meta.ALL_COLS);
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
                          {meta.COL_DEF[key]?.label ?? key}
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
        titleId={meta.titleId}
        title={detailTitle}
        subtitle={!creating && auditSource ? auditSource.code : null}
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
                <div className="space-y-2">
                  <Label htmlFor={`${meta.titleId}-code`}>
                    {variant === 'country' ? '國家代碼' : variant === 'partGroup' ? '族群代碼' : '幣別代碼'}
                  </Label>
                  <Input
                    id={`${meta.titleId}-code`}
                    value={formValues.code}
                    onChange={(e) => patchDraft({ code: e.target.value })}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${meta.titleId}-name`}>
                    {variant === 'country' ? '國家名稱' : variant === 'partGroup' ? '族群名稱' : '幣別名稱'}
                  </Label>
                  <Input
                    id={`${meta.titleId}-name`}
                    value={formValues.name}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                    autoComplete="off"
                  />
                </div>
                {variant === 'currency' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`${meta.titleId}-symbol`}>幣別符號</Label>
                      <Input
                        id={`${meta.titleId}-symbol`}
                        value={(formValues as CurrencyDraft).symbol}
                        onChange={(e) => patchDraft({ symbol: e.target.value })}
                        readOnly={!editing && !creating}
                        className={!editing && !creating ? readonlyFieldCls : undefined}
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${meta.titleId}-dec`}>小數位數</Label>
                      <Input
                        id={`${meta.titleId}-dec`}
                        type="number"
                        inputMode="numeric"
                        value={(formValues as CurrencyDraft).decimalPlaces}
                        onChange={(e) => patchDraft({ decimalPlaces: e.target.value })}
                        readOnly={!editing && !creating}
                        className={!editing && !creating ? readonlyFieldCls : undefined}
                      />
                    </div>
                  </>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor={`${meta.titleId}-sort`}>排序</Label>
                  <Input
                    id={`${meta.titleId}-sort`}
                    inputMode="numeric"
                    value={formValues.sortNo}
                    onChange={(e) => patchDraft({ sortNo: e.target.value })}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                <div className="flex items-center gap-2 pb-2 sm:col-span-2">
                  <input
                    id={`${meta.titleId}-active`}
                    type="checkbox"
                    className="size-4 rounded border border-input accent-primary"
                    checked={formValues.isActive}
                    disabled={!editing && !creating}
                    onChange={(e) => patchDraft({ isActive: e.target.checked })}
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

export function BaseCountryModalMasterView() {
  return <BaseNx00ModalCodeMasterView variant="country" />;
}

export function BaseCurrencyModalMasterView() {
  return <BaseNx00ModalCodeMasterView variant="currency" />;
}

export function BasePartGroupModalMasterView() {
  return <BaseNx00ModalCodeMasterView variant="partGroup" />;
}
