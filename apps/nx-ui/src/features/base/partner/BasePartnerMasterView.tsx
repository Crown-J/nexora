/**
 * 交易對象主檔（partner）：partner_type 六分類 = C 保養廠 / O 同行 / S 供應商 / T 外包物流 / B 銀行 / V 一般廠商
 * LIST + 置中彈窗明細；GET/POST/PUT/PATCH /nx01/partners
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
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { fetchAllPages } from '@data/api/fetchAllPages';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import { formatAuditPersonLabel } from '@/features/base/users/mock-data';
import {
  createPartner,
  listPartners,
  recalcPartnerSupplierGrade,
  setPartnerActive,
  updatePartner,
  type PartnerDto,
  type PartnerType,
} from '@data/endpoints/base/api/partner';
import { listCustomerGrades, type CustomerGradeDto } from '@data/endpoints/base/api/customer-grade';
import { BaseMasterModalFrame } from '@/features/base/shell/BaseMasterModalFrame';
import { MasterActiveListCell } from '@/features/base/shell/MasterActiveListCell';
import { MasterListScrollRegion } from '@/features/base/shell/MasterListScrollRegion';
import { MasterToolbarAddOrBulkActive } from '@/features/base/shell/MasterToolbarAddOrBulkActive';
import { isMasterListKeyboardBlocked } from '@/features/base/shell/baseMasterListKeyboard';
import { useMasterListRowSelection } from '@/features/base/shell/useMasterListRowSelection';

// partner 改制七分類（W4 [3-5] 2026-06-06 加 L 散客）
const PARTNER_TYPE_LABEL: Record<string, string> = {
  C: '保養廠',
  O: '同行',
  S: '供應商',
  T: '外包物流',
  V: '一般廠商',
  B: '銀行',
  L: '散客',
};

function partnerTypeLabel(t: string): string {
  const k = String(t ?? '').trim().toUpperCase();
  return PARTNER_TYPE_LABEL[k] ?? k;
}

/** 表單選項：新七分類（W4 [3-5] 加 L 散客） */
const PARTNER_TYPE_FORM_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: 'C', label: 'C　保養廠' },
  { value: 'O', label: 'O　同行' },
  { value: 'S', label: 'S　供應商' },
  { value: 'T', label: 'T　外包物流' },
  { value: 'V', label: 'V　一般廠商' },
  { value: 'B', label: 'B　銀行' },
  { value: 'L', label: 'L　散客' },
];

const PAY_DOM_OPTIONS: { value: string; label: string }[] = [
  { value: 'PREPAY', label: 'PREPAY 先付款' },
  { value: 'NET30', label: 'NET30 月結30天' },
  { value: 'NET60', label: 'NET60 月結60天' },
  { value: 'NET90', label: 'NET90 月結90天' },
];

const PAY_IMP_OPTIONS: { value: string; label: string }[] = [
  { value: 'TT', label: 'TT 電匯' },
  { value: 'LC', label: 'LC 信用狀' },
  { value: 'DP', label: 'DP 付款交單' },
  { value: 'DA', label: 'DA 承兌交單' },
];

const CREDIT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'N', label: 'N 正常' },
  { value: 'W', label: 'W 僅收現金' },
  { value: 'F', label: 'F 凍結' },
];

const INCOTERM_OPTIONS: { value: string; label: string }[] = [
  { value: 'FOB', label: 'FOB' },
  { value: 'CIF', label: 'CIF' },
  { value: 'EXW', label: 'EXW' },
  { value: 'DDP', label: 'DDP' },
];

const TYPE_FILTER_OPTIONS: { value: PartnerTypeFilter; label: string }[] = [
  { value: 'all', label: '類型：全部' },
  { value: 'C', label: 'C　保養廠' },
  { value: 'O', label: 'O　同行' },
  { value: 'S', label: 'S　供應商' },
  { value: 'T', label: 'T　外包物流' },
  { value: 'V', label: 'V　一般廠商' },
  { value: 'B', label: 'B　銀行' },
];

type PartnerTypeFilter = 'all' | 'C' | 'O' | 'S' | 'T' | 'V' | 'B';

function matchesPartnerTypeFilter(partnerType: string, f: PartnerTypeFilter): boolean {
  if (f === 'all') return true;
  const pt = String(partnerType ?? '').toUpperCase();
  return pt === f;
}

type PartnerRow = {
  id: string;
  code: string;
  name: string;
  partnerType: string;
  contactName: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  // 02 真正完工軌 2026-06-07：列表直接顯示一行地址（partner.list shippingOneLine）
  shippingOneLine: string | null;
  remark: string | null;
  taxId: string | null;
  paymentTermDomestic: string;
  customerGradeId: string | null;
  customerGradeLabel: string;
  creditLimit: string | null;
  creditStatus: string;
  paymentTermImport: string | null;
  incoterm: string | null;
  isActive: boolean;
  createdAt: string;
  createdByPerson: string;
  updatedAt: string;
  updatedByPerson: string;
};

type Draft = {
  code: string;
  name: string;
  partnerType: PartnerType;
  contactName: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  remark: string;
  taxId: string;
  paymentTermDomestic: string;
  customerGradeId: string;
  creditLimit: string;
  creditStatus: string;
  paymentTermImport: string;
  incoterm: string;
  isActive: boolean;
};

type SortDir = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZE = 10;

const LIST_COLS = [
  'code',
  'name',
  'partnerType',
  'taxId',
  'paymentTermDomestic',
  'customerGradeLabel',
  'creditStatus',
  'creditLimit',
  'contactName',
  'phone',
  'mobile',
  'email',
  'address',
  'remark',
  'isActive',
  'createdAt',
  'createdByPerson',
  'updatedAt',
  'updatedByPerson',
] as const;
type ListColKey = (typeof LIST_COLS)[number];

const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  code: { label: '對象代碼', locked: true },
  name: { label: '對象名稱' },
  partnerType: { label: '對象類型' },
  taxId: { label: '統編' },
  paymentTermDomestic: { label: '國內付款條件' },
  customerGradeLabel: { label: '客戶等級' },
  creditStatus: { label: '信用狀態' },
  creditLimit: { label: '信用額度' },
  contactName: { label: '聯絡人' },
  phone: { label: '電話' },
  mobile: { label: '手機' },
  email: { label: '信箱' },
  address: { label: '地址' },
  remark: { label: '備註' },
  isActive: { label: '啟用' },
  createdAt: { label: '建立時間' },
  createdByPerson: { label: '建立人員' },
  updatedAt: { label: '修改時間' },
  updatedByPerson: { label: '修改人員' },
};

type ListColPref = { visibleCols: string[]; colOrder: string[] };

const LIST_COL_PREF_KEY = 'base.partner.listcols';
const LIST_COL_PREF_VERSION = 4;
const DEFAULT_COL_PREF: ListColPref = { visibleCols: [...LIST_COLS], colOrder: [...LIST_COLS] };

function normalizeColPref(raw: ListColPref): ListColPref {
  const order = LIST_COLS.filter((k) => raw.colOrder.includes(k));
  for (const k of LIST_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => LIST_COLS.includes(k as ListColKey));
  if (!vis.includes('code')) vis = ['code', ...vis];
  return { colOrder: order, visibleCols: vis };
}

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

function dtoToRow(d: PartnerDto): PartnerRow {
  const gParts = [d.customerGradeCode, d.customerGradeName].filter(Boolean);
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    partnerType: d.partnerType,
    contactName: d.contactName ?? null,
    phone: d.phone ?? null,
    mobile: d.mobile ?? null,
    email: d.email ?? null,
    // 02 對齊第二批 A 軌 CP2 + 真正完工軌 2026-06-07：
    // address 純文字已 DROP；列表顯示用 partner.list 帶來的 shippingOneLine
    address: null,
    shippingOneLine: d.shippingOneLine ?? null,
    remark: d.remark ?? null,
    taxId: d.taxId ?? null,
    paymentTermDomestic: d.paymentTermDomestic ?? 'NET30',
    customerGradeId: d.customerGradeId ?? null,
    customerGradeLabel: gParts.length ? gParts.join(' ') : '',
    creditLimit: d.creditLimit ?? null,
    creditStatus: d.creditStatus ?? 'N',
    paymentTermImport: d.paymentTermImport ?? null,
    incoterm: d.incoterm ?? null,
    isActive: d.isActive,
    createdAt: d.createdAt,
    createdByPerson: formatAuditPersonLabel(d.createdByUsername ?? null, d.createdByName ?? null),
    updatedAt: d.updatedAt,
    updatedByPerson: formatAuditPersonLabel(d.updatedByUsername ?? null, d.updatedByName ?? null),
  };
}

function emptyDraft(): Draft {
  return {
    code: '',
    name: '',
    partnerType: 'C',
    contactName: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    remark: '',
    taxId: '',
    paymentTermDomestic: 'NET30',
    customerGradeId: '',
    creditLimit: '',
    creditStatus: 'N',
    paymentTermImport: 'TT',
    incoterm: 'FOB',
    isActive: true,
  };
}

function fromRow(r: PartnerRow): Draft {
  return {
    code: r.code,
    name: r.name,
    partnerType: (String(r.partnerType).toUpperCase() as PartnerType) || 'C',
    contactName: r.contactName ?? '',
    phone: r.phone ?? '',
    mobile: r.mobile ?? '',
    email: r.email ?? '',
    address: r.address ?? '',
    remark: r.remark ?? '',
    taxId: r.taxId ?? '',
    paymentTermDomestic: r.paymentTermDomestic || 'NET30',
    customerGradeId: r.customerGradeId ?? '',
    creditLimit: r.creditLimit ?? '',
    creditStatus: r.creditStatus || 'N',
    paymentTermImport: r.paymentTermImport ?? 'TT',
    incoterm: r.incoterm ?? 'FOB',
    isActive: r.isActive,
  };
}

function isRadixFilterMenuOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector(
    '[data-slot="dropdown-menu-content"][data-state="open"], [data-slot="dropdown-menu-sub-content"][data-state="open"]',
  );
}

export function BasePartnerMasterView() {
  const router = useRouter();
  const pathname = usePathname();

  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<PartnerTypeFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: 'code', dir: 'asc' });
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<CustomerGradeDto[]>([]);
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
    LIST_COL_PREF_KEY,
    LIST_COL_PREF_VERSION,
    DEFAULT_COL_PREF,
  );
  const listCols = useMemo(() => normalizeColPref(colPref), [colPref]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchAllPages((page, pageSize) => listPartners({ page, pageSize }), {
        pageSize: 100,
        maxPages: 50,
      });
      setRows(items.map(dtoToRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const gradeItems = await fetchAllPages(
          (page, pageSize) => listCustomerGrades({ page, pageSize, isActive: true }),
          { pageSize: 100, maxPages: 20 },
        );
        if (!alive) return;
        setGrades(gradeItems);
      } catch {
        if (!alive) return;
        setGrades([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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
      if (!matchesPartnerTypeFilter(r.partnerType, typeFilter)) return false;
      if (activeFilter === 'active' && !r.isActive) return false;
      if (activeFilter === 'inactive' && r.isActive) return false;
      if (!k) return true;
      const blob =
        `${r.code} ${r.name} ${partnerTypeLabel(r.partnerType)} ${r.taxId ?? ''} ${r.customerGradeLabel} ${r.remark ?? ''} ${r.contactName ?? ''} ${r.phone ?? ''} ${r.mobile ?? ''} ${r.email ?? ''} ${r.address ?? ''} ${r.createdByPerson} ${r.updatedByPerson}`.toLowerCase();
      return blob.includes(k);
    });
  }, [rows, keyword, typeFilter, activeFilter]);

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sk = sort.key;
    const out = [...filtered];
    out.sort((a, b) => {
      if (sk === 'isActive') return mult * ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
      if (sk === 'code') return mult * a.code.localeCompare(b.code, 'en');
      if (sk === 'name') return mult * a.name.localeCompare(b.name, 'zh-Hant');
      if (sk === 'partnerType')
        return mult * partnerTypeLabel(a.partnerType).localeCompare(partnerTypeLabel(b.partnerType), 'zh-Hant');
      if (sk === 'contactName')
        return mult * (a.contactName ?? '').localeCompare(b.contactName ?? '', 'zh-Hant');
      if (sk === 'phone') return mult * (a.phone ?? '').localeCompare(b.phone ?? '', 'zh-Hant');
      if (sk === 'mobile') return mult * (a.mobile ?? '').localeCompare(b.mobile ?? '', 'zh-Hant');
      if (sk === 'email') return mult * (a.email ?? '').localeCompare(b.email ?? '', 'zh-Hant');
      if (sk === 'address') return mult * (a.address ?? '').localeCompare(b.address ?? '', 'zh-Hant');
      if (sk === 'remark') return mult * (a.remark ?? '').localeCompare(b.remark ?? '', 'zh-Hant');
      if (sk === 'taxId') return mult * (a.taxId ?? '').localeCompare(b.taxId ?? '', 'en');
      if (sk === 'paymentTermDomestic')
        return mult * (a.paymentTermDomestic ?? '').localeCompare(b.paymentTermDomestic ?? '', 'en');
      if (sk === 'customerGradeLabel')
        return mult * (a.customerGradeLabel ?? '').localeCompare(b.customerGradeLabel ?? '', 'zh-Hant');
      if (sk === 'creditStatus') return mult * (a.creditStatus ?? '').localeCompare(b.creditStatus ?? '', 'en');
      if (sk === 'creditLimit') {
        const na = Number(a.creditLimit ?? 0);
        const nb = Number(b.creditLimit ?? 0);
        return mult * (na - nb);
      }
      if (sk === 'createdAt' || sk === 'updatedAt') {
        return mult * String(a[sk as keyof PartnerRow]).localeCompare(String(b[sk as keyof PartnerRow]));
      }
      if (sk === 'createdByPerson' || sk === 'updatedByPerson') {
        return mult * String(a[sk as keyof PartnerRow]).localeCompare(String(b[sk as keyof PartnerRow]), 'zh-Hant');
      }
      return 0;
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

  const filterKey = `${keyword}|${typeFilter}|${activeFilter}`;
  const prevFilterKeyRef = useRef('');
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPage(1);
      return;
    }
    setPage((p) => Math.min(p, totalPages));
  }, [filterKey, totalPages]);

  const selected = useMemo(() => (selectedId ? rows.find((r) => r.id === selectedId) ?? null : null), [rows, selectedId]);

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
        if (pathname != null && pathname.startsWith('/dashboard/base/')) {
          e.preventDefault();
          router.push('/dashboard/base');
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

  const readonlyFieldCls = 'bg-muted/40 text-muted-foreground cursor-default';
  const selectCls =
    'nx-native-select flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

  const formValues = creating || editing ? draft : selected ? fromRow(selected) : emptyDraft();

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
        const dto = await setPartnerActive(id, active);
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
    setSaving(true);
    setError(null);
    try {
      const creditNum = draft.creditLimit.trim() === '' ? undefined : Number(draft.creditLimit);
      const creditLimit = creditNum !== undefined && Number.isFinite(creditNum) ? creditNum : 0;
      const common = {
        partnerType: draft.partnerType,
        contactName: draft.contactName.trim() || null,
        phone: draft.phone.trim() || null,
        mobile: draft.mobile.trim() || null,
        email: draft.email.trim() || null,
        address: draft.address.trim() || null,
        remark: draft.remark.trim() || null,
        taxId: draft.taxId.trim() || null,
        paymentTermDomestic: draft.paymentTermDomestic,
        customerGradeId: draft.customerGradeId.trim() || null,
        creditLimit,
        creditStatus: draft.creditStatus,
        paymentTermImport: draft.paymentTermImport,
        incoterm: draft.incoterm,
        isActive: draft.isActive,
      };
      if (creating) {
        const dto = await createPartner({ code, name, ...common });
        const row = dtoToRow(dto);
        setRows((prev) => [...prev, row].sort((a, b) => a.code.localeCompare(b.code, 'en')));
        setCreating(false);
        setEditing(false);
        setSelectedId(row.id);
        setFocusedRowId(row.id);
      } else if (selectedId && selected) {
        const dto = await updatePartner(selectedId, { name, ...common });
        setRows((prev) => prev.map((r) => (r.id === selectedId ? dtoToRow(dto) : r)));
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

  const renderBodyCell = (row: PartnerRow, key: string) => {
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
      case 'partnerType':
        return (
          <td key={key} className="max-w-[140px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {partnerTypeLabel(row.partnerType)}
          </td>
        );
      case 'contactName':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.contactName?.trim() ? row.contactName : '\u2014'}
          </td>
        );
      case 'phone':
      case 'mobile':
      case 'email':
        return (
          <td key={key} className="max-w-[160px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {(row[key] ?? '').toString().trim() ? String(row[key]) : '\u2014'}
          </td>
        );
      case 'address':
        // 02 \u771f\u6b63\u5b8c\u5de5\u8ecc 2026-06-07 + \u7b2c\u4e09\u6279 T2\uff1a\u5217\u8868\u986f\u793a\u4e00\u884c\u5730\u5740 + \u806f\u7d61\u7a97\u53e3\u7ba1\u7406\u9023\u7d50
        return (
          <td key={key} className="max-w-[280px] px-2 py-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="truncate" title={row.shippingOneLine ?? ''}>
                {row.shippingOneLine?.trim() ? row.shippingOneLine : '\u2014'}
              </span>
              <a
                href={`/dashboard/base/partners/${row.id}/addresses`}
                className="shrink-0 text-[10px] text-[#22D88F] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                \u5730\u5740
              </a>
              <a
                href={`/dashboard/base/partners/${row.id}/contacts`}
                className="shrink-0 text-[10px] text-[#22D88F] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                \u7a97\u53e3
              </a>
            </div>
          </td>
        );
      case 'remark':
        return (
          <td key={key} className="max-w-[160px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.remark?.trim() ? row.remark : '\u2014'}
          </td>
        );
      case 'taxId':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 font-mono text-xs text-muted-foreground">
            {row.taxId?.trim() ? row.taxId : '\u2014'}
          </td>
        );
      case 'paymentTermDomestic':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 font-mono text-xs text-muted-foreground">
            {row.paymentTermDomestic || '\u2014'}
          </td>
        );
      case 'customerGradeLabel':
        return (
          <td key={key} className="max-w-[140px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.customerGradeLabel?.trim() ? row.customerGradeLabel : '\u2014'}
          </td>
        );
      case 'creditStatus':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {CREDIT_STATUS_OPTIONS.find((o) => o.value === row.creditStatus)?.label ?? row.creditStatus}
          </td>
        );
      case 'creditLimit':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 text-xs tabular-nums text-muted-foreground">
            {row.creditLimit != null && String(row.creditLimit).trim() !== '' ? row.creditLimit : '\u2014'}
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

  const ALL_COLS = LIST_COLS as readonly string[];
  const tableMinW = Math.max(360, 40 + orderedVisibleCols.length * 108 + 48);
  const activeFilterSummary =
    activeFilter === 'all' ? '狀態：全部' : activeFilter === 'active' ? '狀態：啟用' : '狀態：停用';
  const typeFilterSummary = TYPE_FILTER_OPTIONS.find((o) => o.value === typeFilter)?.label ?? '類型：全部';

  const detailTitle = creating ? '新增客戶' : selected?.name?.trim() ? selected.name : selected?.code ?? '客戶主檔';
  const subtitle = !creating && selected ? selected.code : null;
  const titleId = 'partner-detail-title';

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
              placeholder="客戶代碼、名稱、聯絡人、電話、地址…"
              autoComplete="off"
              className="h-9 min-w-[min(100%,10rem)] flex-1 basis-[min(100%,14rem)]"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 justify-between gap-1 px-2.5 font-normal sm:min-w-44"
                  aria-label="依客戶類型篩選"
                >
                  <span className="truncate">{typeFilterSummary}</span>
                  <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56"
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  focusListKeyboardRegion();
                }}
              >
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">客戶類型（partner_type）</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as PartnerTypeFilter)}
                >
                  {TYPE_FILTER_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem key={o.value} value={o.value}>
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
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
                    onClick={() => setColPref({ visibleCols: [...LIST_COLS], colOrder: [...LIST_COLS] })}
                  >
                    重置
                  </Button>
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {listCols.colOrder.map((key) => {
                    const def = COL_DEF[key as ListColKey];
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
                          if (!from || from === key || !ALL_COLS.includes(from)) return;
                          setColPref((p) => {
                            const norm = normalizeColPref(p);
                            const fromIdx = norm.colOrder.indexOf(from);
                            const toIdx = norm.colOrder.indexOf(key);
                            if (fromIdx < 0 || toIdx < 0) return norm;
                            return normalizeColPref({ ...norm, colOrder: arrayMove(norm.colOrder, fromIdx, toIdx) });
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
              ariaLabel="客戶主檔列表，方向鍵選取列，Enter 開啟明細，雙擊開啟明細"
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
                          {COL_DEF[key as ListColKey]?.label ?? key}
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
        titleId={titleId}
        title={detailTitle}
        subtitle={subtitle}
        showPrevNext={!creating && selectedIdxSorted >= 0}
        onPrev={goDetailPrev}
        onNext={goDetailNext}
        disablePrev={selectedIdxSorted <= 0}
        disableNext={selectedIdxSorted >= sortedRows.length - 1}
        modalSizeClassName="w-[min(92vw,44rem)]"
      >
        <div className="mt-4">
          <div className="mx-auto w-full max-w-2xl space-y-5 pb-2">
            <section className="rounded-xl border border-border/60 bg-muted/5 p-4 dark:bg-muted/10">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">基本資料</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-code`}>客戶代碼</Label>
                  <Input
                    id={`${titleId}-code`}
                    value={formValues.code}
                    onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-name`}>客戶名稱</Label>
                  <Input
                    id={`${titleId}-name`}
                    value={formValues.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="mt-3 max-w-xs space-y-2">
                <Label htmlFor={`${titleId}-pt`}>客戶類型</Label>
                <select
                  id={`${titleId}-pt`}
                  className={cn(selectCls, !editing && !creating && readonlyFieldCls)}
                  value={formValues.partnerType}
                  disabled={!editing && !creating}
                  onChange={(e) => setDraft((d) => ({ ...d, partnerType: e.target.value as PartnerType }))}
                >
                  {PARTNER_TYPE_FORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="rounded-xl border border-border/60 bg-muted/5 p-4 dark:bg-muted/10">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">聯絡方式</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-cn`}>聯絡人</Label>
                  <Input
                    id={`${titleId}-cn`}
                    value={formValues.contactName}
                    onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-phone`}>電話</Label>
                  <Input
                    id={`${titleId}-phone`}
                    value={formValues.phone}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-mobile`}>手機</Label>
                  <Input
                    id={`${titleId}-mobile`}
                    value={formValues.mobile}
                    onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-email`}>信箱</Label>
                  <Input
                    id={`${titleId}-email`}
                    type="email"
                    value={formValues.email}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`${titleId}-addr`}>地址</Label>
                  <Input
                    id={`${titleId}-addr`}
                    value={formValues.address}
                    onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                <div className="flex items-center gap-2 pb-1 sm:col-span-2">
                  <input
                    id={`${titleId}-active`}
                    type="checkbox"
                    className="size-4 rounded border border-input accent-primary"
                    checked={formValues.isActive}
                    disabled={!editing && !creating}
                    onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  />
                  <Label htmlFor={`${titleId}-active`} className="font-normal">
                    啟用
                  </Label>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border/60 bg-muted/5 p-4 dark:bg-muted/10">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                備註與財務條件（LITE-CORE）
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`${titleId}-remark`}>備註</Label>
                  <Input
                    id={`${titleId}-remark`}
                    value={formValues.remark}
                    onChange={(e) => setDraft((d) => ({ ...d, remark: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-tax`}>統一編號</Label>
                  <Input
                    id={`${titleId}-tax`}
                    value={formValues.taxId}
                    onChange={(e) => setDraft((d) => ({ ...d, taxId: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-cg`}>客戶等級</Label>
                  <select
                    id={`${titleId}-cg`}
                    className={cn(selectCls, !editing && !creating && readonlyFieldCls)}
                    value={formValues.customerGradeId}
                    disabled={!editing && !creating}
                    onChange={(e) => setDraft((d) => ({ ...d, customerGradeId: e.target.value }))}
                  >
                    <option value="">（未指定）</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} — {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-payd`}>國內付款條件</Label>
                  <select
                    id={`${titleId}-payd`}
                    className={cn(selectCls, !editing && !creating && readonlyFieldCls)}
                    value={formValues.paymentTermDomestic}
                    disabled={!editing && !creating}
                    onChange={(e) => setDraft((d) => ({ ...d, paymentTermDomestic: e.target.value }))}
                  >
                    {PAY_DOM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {editing && selectedId && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const updated = await recalcPartnerSupplierGrade(selectedId);
                          alert(`已依付款條件 ${updated.paymentTermDomestic} 重算供應商等級\n（須重新開啟此筆查看 supplierGradeId）`);
                          // 觸發 list refresh（簡化：reload row）
                          setRows((prev) => prev.map((r) => (r.id === selectedId ? { ...r, paymentTermDomestic: updated.paymentTermDomestic } : r)));
                        } catch (e) {
                          alert(`重算失敗：${(e as Error).message}`);
                        }
                      }}
                      className="rounded bg-amber-500/30 px-2 py-0.5 text-xs hover:bg-amber-500/50"
                      title="依付款條件 NET90→A / NET60→B / NET30→C / PREPAY→D 重算"
                    >
                      🏆 依付款條件重算供應商等級
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-cr`}>信用額度（0=不限制）</Label>
                  <Input
                    id={`${titleId}-cr`}
                    inputMode="decimal"
                    value={formValues.creditLimit}
                    onChange={(e) => setDraft((d) => ({ ...d, creditLimit: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : 'font-mono text-xs'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-cs`}>信用狀態</Label>
                  <select
                    id={`${titleId}-cs`}
                    className={cn(selectCls, !editing && !creating && readonlyFieldCls)}
                    value={formValues.creditStatus}
                    disabled={!editing && !creating}
                    onChange={(e) => setDraft((d) => ({ ...d, creditStatus: e.target.value }))}
                  >
                    {CREDIT_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-pim`}>進口付款條件</Label>
                  <select
                    id={`${titleId}-pim`}
                    className={cn(selectCls, !editing && !creating && readonlyFieldCls)}
                    value={formValues.paymentTermImport}
                    disabled={!editing && !creating}
                    onChange={(e) => setDraft((d) => ({ ...d, paymentTermImport: e.target.value }))}
                  >
                    {PAY_IMP_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${titleId}-inco`}>貿易條件</Label>
                  <select
                    id={`${titleId}-inco`}
                    className={cn(selectCls, !editing && !creating && readonlyFieldCls)}
                    value={formValues.incoterm}
                    disabled={!editing && !creating}
                    onChange={(e) => setDraft((d) => ({ ...d, incoterm: e.target.value }))}
                  >
                    {INCOTERM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
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
