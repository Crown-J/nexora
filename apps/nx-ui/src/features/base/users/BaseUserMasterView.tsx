/**
 * File: apps/nx-ui/src/features/base/users/BaseUserMasterView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Base user master-detail：連線 nx-api GET/POST/PUT/PATCH /user，職務顯示來自角色主檔（user.jobTitle）
 * - 版型：LIST + 置中彈窗明細；單擊列僅選取變色、雙擊開啟明細；↑↓／Enter、Esc 階層返回（明細→/base→由 hub 頁至 /home）
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import { formatAuditPersonLabel, formatWarehouseLabel, type BaseUserRow } from './mock-data';
import { BaseMasterModalFrame } from '@/features/base/shell/BaseMasterModalFrame';
import { MasterActiveListCell } from '@/features/base/shell/MasterActiveListCell';
import { MasterListScrollRegion } from '@/features/base/shell/MasterListScrollRegion';
import { MasterToolbarAddOrBulkActive } from '@/features/base/shell/MasterToolbarAddOrBulkActive';
import { isMasterListKeyboardBlocked } from '@/features/base/shell/baseMasterListKeyboard';
import { useMasterListRowSelection } from '@/features/base/shell/useMasterListRowSelection';
import {
  assignUserRole,
  listUserRoles,
  revokeUserRole,
  setUserRolePrimary,
  type UserRoleDto,
} from '@/features/base/api/user-role';
import {
  assignUserWarehouse,
  listUserWarehouses,
  revokeUserWarehouse,
  type UserWarehouseDto,
} from '@/features/base/api/user-warehouse';
import { listRoles, type RoleDto } from '@/features/base/api/role';
import { listWarehouses, type WarehouseDto } from '@/features/base/api/warehouse';
import { createUser, listUsers, setUserActive, updateUser, type UserDto } from '@/features/base/api/user';

type ListColKey =
  | 'username'
  | 'displayName'
  | 'jobTitle'
  | 'email'
  | 'phone'
  | 'warehouseLabel'
  | 'isActive'
  | 'lastLoginAt'
  | 'createdAt'
  | 'createdByPerson'
  | 'updatedAt'
  | 'updatedByPerson';
type SortKey = ListColKey;
type SortDir = 'asc' | 'desc';

type ActiveFilter = 'all' | 'active' | 'inactive';

type EditableDraft = {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  isActive: boolean;
  password: string;
  newPassword: string;
  primaryRoleId: string;
};

const PAGE_SIZE = 10;

const LIST_COL_PREF_VERSION = 7;
const LIST_COL_PREF_KEY = 'base.user.listcols';

const ALL_LIST_COLS: ListColKey[] = [
  'username',
  'displayName',
  'jobTitle',
  'email',
  'phone',
  'warehouseLabel',
  'isActive',
  'lastLoginAt',
  'createdAt',
  'createdByPerson',
  'updatedAt',
  'updatedByPerson',
];

const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  username: { label: '帳號', locked: true },
  displayName: { label: '姓名' },
  jobTitle: { label: '職務' },
  email: { label: '信箱' },
  phone: { label: '電話' },
  warehouseLabel: { label: '隸屬倉庫' },
  isActive: { label: '啟用' },
  lastLoginAt: { label: '最後一次登入' },
  createdAt: { label: '建立時間' },
  createdByPerson: { label: '建立人員' },
  updatedAt: { label: '修改時間' },
  updatedByPerson: { label: '修改人員' },
};

type UserListColPref = { visibleCols: ListColKey[]; colOrder: ListColKey[] };

const DEFAULT_COL_PREF: UserListColPref = {
  visibleCols: [...ALL_LIST_COLS],
  colOrder: [...ALL_LIST_COLS],
};

/** 舊版欄位 key（v3）→ 合併後之建立／修改人員欄 */
function mapLegacyListColKey(k: string): ListColKey | null {
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

function normalizeColPref(raw: UserListColPref): UserListColPref {
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
  if (!vis.includes('username')) vis = ['username', ...vis];
  return { colOrder: order, visibleCols: vis };
}

function emptyDraft(defaultRoleId: string): EditableDraft {
  return {
    username: '',
    displayName: '',
    email: '',
    phone: '',
    isActive: true,
    password: '',
    newPassword: '',
    primaryRoleId: defaultRoleId,
  };
}

function rowFromUser(u: BaseUserRow): EditableDraft {
  return {
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    phone: u.phone,
    isActive: u.isActive,
    password: '',
    newPassword: '',
    primaryRoleId: '',
  };
}

function dtoToRow(u: UserDto): BaseUserRow {
  const cbName = u.createdByName ?? null;
  const ubName = u.updatedByName ?? null;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    jobTitle: u.jobTitle ?? '—',
    warehouseLabel: (() => {
      const s = (u.warehouseSummary ?? '').trim();
      if (s) return s;
      const leg = formatWarehouseLabel(u.warehouseCode, u.warehouseName);
      return leg !== '\u2014' ? leg : '\u2014';
    })(),
    email: u.email ?? '',
    phone: u.phone ?? '',
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    createdBy: u.createdBy ?? null,
    createdByUsername: u.createdByUsername ?? null,
    createdByName: cbName ?? '—',
    createdByPerson: formatAuditPersonLabel(u.createdByUsername, cbName),
    updatedAt: u.updatedAt,
    updatedBy: u.updatedBy ?? null,
    updatedByUsername: u.updatedByUsername ?? null,
    updatedByName: ubName,
    updatedByPerson: formatAuditPersonLabel(u.updatedByUsername, ubName),
  };
}

/** 僅在 Radix 下拉內容仍為 open 時讓選單独占鍵盤；關閉後不再擋，避免焦點留在觸發鈕時無法選列 */
function isRadixJobFilterMenuOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector(
    '[data-slot="dropdown-menu-content"][data-state="open"], [data-slot="dropdown-menu-sub-content"][data-state="open"]',
  );
}

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

export function BaseUserMasterView() {
  const router = useRouter();
  const pathname = usePathname();
  const [users, setUsers] = useState<BaseUserRow[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [keyword, setKeyword] = useState('');
  /** 空集合＝不篩職務（顯示全部）；有值時僅顯示所選職務（複選 OR） */
  const [jobPicks, setJobPicks] = useState<Set<string>>(() => new Set());
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'username', dir: 'asc' });
  /** 列表鍵盤／單擊選取列（變色），開啟明細另用 selectedId */
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const defaultRoleId = roles[0]?.id ?? '';
  const [draft, setDraft] = useState<EditableDraft>(() => emptyDraft(''));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const [sideUserRoles, setSideUserRoles] = useState<UserRoleDto[]>([]);
  const [sideUserWarehouses, setSideUserWarehouses] = useState<UserWarehouseDto[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseDto[]>([]);
  const [sideLoading, setSideLoading] = useState(false);
  const [sideBusy, setSideBusy] = useState(false);
  const [sideErr, setSideErr] = useState<string | null>(null);
  const colPickerWrapRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLElement | null>(null);
  const listKeyboardRootRef = useRef<HTMLDivElement>(null);

  const focusListKeyboardRegion = useCallback(() => {
    requestAnimationFrame(() => {
      listKeyboardRootRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const { value: colPref, setValue: setColPref } = useListLocalPref<UserListColPref>(
    LIST_COL_PREF_KEY,
    LIST_COL_PREF_VERSION,
    DEFAULT_COL_PREF,
  );
  const listCols = useMemo(() => normalizeColPref(colPref), [colPref]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ur, rr] = await Promise.all([
        listUsers({ page: 1, pageSize: 500 }),
        listRoles({ page: 1, pageSize: 200 }),
      ]);
      setUsers(ur.items.map(dtoToRow));
      setRoles(rr.items.filter((r) => r.isActive));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setUsers([]);
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

  useEffect(() => {
    if (roles[0]?.id && !draft.primaryRoleId && creating) {
      setDraft((d) => ({ ...d, primaryRoleId: roles[0]!.id }));
    }
  }, [roles, creating, draft.primaryRoleId]);

  const jobTitleOptions = useMemo(() => {
    const s = new Set<string>();
    for (const u of users) {
      if (u.jobTitle && u.jobTitle !== '—') s.add(u.jobTitle);
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [users]);

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return users.filter((u) => {
      if (jobPicks.size > 0 && !jobPicks.has(u.jobTitle)) return false;
      if (activeFilter === 'active' && !u.isActive) return false;
      if (activeFilter === 'inactive' && u.isActive) return false;
      if (k) {
        const blob = (
          u.username +
          ' ' +
          u.displayName +
          ' ' +
          u.jobTitle +
          ' ' +
          u.email +
          ' ' +
          u.phone +
          ' ' +
          u.warehouseLabel
        ).toLowerCase();
        if (!blob.includes(k)) return false;
      }
      return true;
    });
  }, [users, keyword, jobPicks, activeFilter]);

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sortKey = sort.key;
    const out = [...filtered];
    out.sort((a, b) => {
      const cmpNullLast = (x: string | null, y: string | null, inner: () => number) => {
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return inner();
      };
      switch (sortKey) {
        case 'username':
          return mult * a.username.localeCompare(b.username, 'zh-Hant');
        case 'displayName':
          return mult * a.displayName.localeCompare(b.displayName, 'zh-Hant');
        case 'jobTitle':
          return mult * a.jobTitle.localeCompare(b.jobTitle, 'zh-Hant');
        case 'isActive': {
          const av = a.isActive ? 1 : 0;
          const bv = b.isActive ? 1 : 0;
          return mult * (av - bv);
        }
        case 'lastLoginAt':
          return cmpNullLast(a.lastLoginAt, b.lastLoginAt, () => mult * (a.lastLoginAt ?? '').localeCompare(b.lastLoginAt ?? ''));
        case 'email':
          return mult * a.email.localeCompare(b.email, 'zh-Hant');
        case 'phone':
          return mult * a.phone.localeCompare(b.phone, 'zh-Hant');
        case 'warehouseLabel':
          return mult * a.warehouseLabel.localeCompare(b.warehouseLabel, 'zh-Hant');
        case 'createdAt':
          return mult * String(a.createdAt).localeCompare(String(b.createdAt));
        case 'updatedAt':
          return cmpNullLast(a.updatedAt, b.updatedAt, () => mult * String(a.updatedAt ?? '').localeCompare(String(b.updatedAt ?? '')));
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

  const filterKey = `${keyword}|${[...jobPicks].sort().join('\u0001')}|${activeFilter}`;
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
    () => (selectedId ? users.find((u) => u.id === selectedId) ?? null : null),
    [users, selectedId],
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
    setSideUserRoles([]);
    setSideUserWarehouses([]);
    setWarehouseOptions([]);
    setSideErr(null);
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

  /** 預設選取第一列（鍵盤可立即使用）；篩選後若原列仍在清單則保留選取。新增模式不覆寫（維持 null）。 */
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
      if (isRadixJobFilterMenuOpen()) return;

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

  useEffect(() => {
    if (creating || !selectedId) {
      setSideUserRoles([]);
      setSideUserWarehouses([]);
      setWarehouseOptions([]);
      setSideLoading(false);
      setSideErr(null);
      return;
    }
    let alive = true;
    setSideLoading(true);
    setSideErr(null);
    void Promise.all([
      listUserRoles({ userId: selectedId, isActive: true, page: 1, pageSize: 200 }),
      listUserWarehouses({ userId: selectedId, isActive: true, page: 1, pageSize: 200 }),
      listWarehouses({ page: 1, pageSize: 500 }),
    ])
      .then(([ur, uw, wh]) => {
        if (!alive) return;
        setSideUserRoles(ur.items ?? []);
        setSideUserWarehouses(uw.items ?? []);
        setWarehouseOptions((wh.items ?? []).filter((w) => w.isActive));
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setSideErr(e instanceof Error ? e.message : '載入職務／倉庫失敗');
      })
      .finally(() => {
        if (!alive) return;
        setSideLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [creating, selectedId]);

  const refetchSidePanels = useCallback(async () => {
    if (!selectedId) return;
    const [ur, uw] = await Promise.all([
      listUserRoles({ userId: selectedId, isActive: true, page: 1, pageSize: 200 }),
      listUserWarehouses({ userId: selectedId, isActive: true, page: 1, pageSize: 200 }),
    ]);
    setSideUserRoles(ur.items ?? []);
    setSideUserWarehouses(uw.items ?? []);
  }, [selectedId]);

  const formValues = useMemo(() => {
    if (editing || creating) return draft;
    if (selected) return rowFromUser(selected);
    return emptyDraft(defaultRoleId);
  }, [editing, creating, draft, selected, defaultRoleId]);

  const pageRowIds = useMemo(() => pageRows.map((r) => r.id), [pageRows]);

  const {
    checked,
    setChecked,
    headerCheckboxRef,
    toggleOne,
    toggleAllVisible,
    hasSelection: hasListSelection,
  } = useMasterListRowSelection(pageRowIds);

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
    setDraft(emptyDraft(roles[0]?.id ?? ''));
  };

  const onBulkActive = async (active: boolean) => {
    if (checked.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const id of checked) {
        const dto = await setUserActive(id, active);
        const row = dtoToRow(dto);
        setUsers((prev) => prev.map((u) => (u.id === id ? row : u)));
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
    setDraft(rowFromUser(selected));
  };

  const onCancel = () => {
    if (creating) {
      setCreating(false);
      setEditing(false);
      return;
    }
    setEditing(false);
  };

  const onToggleUserRole = async (roleId: string) => {
    if (!selectedId || sideBusy) return;
    const existing = sideUserRoles.find((x) => x.roleId === roleId);
    setSideBusy(true);
    setSideErr(null);
    try {
      if (existing) {
        await revokeUserRole(existing.id);
      } else {
        const first = sideUserRoles.length === 0;
        await assignUserRole({ userId: selectedId, roleId, isPrimary: first });
      }
      await refetchSidePanels();
      await reload();
    } catch (e) {
      setSideErr(e instanceof Error ? e.message : '職務更新失敗');
    } finally {
      setSideBusy(false);
    }
  };

  const onSetPrimaryUserRole = async (userRoleId: string) => {
    if (!selectedId || sideBusy) return;
    setSideBusy(true);
    setSideErr(null);
    try {
      await setUserRolePrimary(userRoleId, true);
      await refetchSidePanels();
      await reload();
    } catch (e) {
      setSideErr(e instanceof Error ? e.message : '主職務更新失敗');
    } finally {
      setSideBusy(false);
    }
  };

  const onToggleUserWarehouse = async (warehouseId: string) => {
    if (!selectedId || sideBusy) return;
    const existing = sideUserWarehouses.find((x) => x.warehouseId === warehouseId);
    setSideBusy(true);
    setSideErr(null);
    try {
      if (existing) {
        await revokeUserWarehouse(existing.id);
      } else {
        await assignUserWarehouse({ userId: selectedId, warehouseId });
      }
      await refetchSidePanels();
      await reload();
    } catch (e) {
      setSideErr(e instanceof Error ? e.message : '倉庫更新失敗');
    } finally {
      setSideBusy(false);
    }
  };

  const onSave = async () => {
    if (creating) {
      const uname = draft.username.trim();
      if (!uname) return;
      const pw = draft.password.trim();
      if (pw.length < 6) {
        setError('密碼至少 6 碼');
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const created = await createUser({
          username: uname,
          password: pw,
          displayName: draft.displayName.trim() || uname,
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          isActive: draft.isActive,
        });
        if (draft.primaryRoleId) {
          const existing = await listUserRoles({
            userId: created.id,
            roleId: draft.primaryRoleId,
            isActive: true,
            pageSize: 5,
          });
          if (existing.total === 0) {
            await assignUserRole({
              userId: created.id,
              roleId: draft.primaryRoleId,
              isPrimary: true,
            });
          }
        }
        const refreshed = await listUsers({ page: 1, pageSize: 500 });
        setUsers(refreshed.items.map(dtoToRow));
        setSelectedId(created.id);
        setFocusedRowId(created.id);
        setCreating(false);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : '建立失敗');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!selectedId || !selected) return;
    setSaving(true);
    setError(null);
    try {
      const body: Parameters<typeof updateUser>[1] = {
        displayName: draft.displayName.trim() || selected.displayName,
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        isActive: draft.isActive,
      };
      if (draft.newPassword.trim().length >= 6) {
        body.password = draft.newPassword.trim();
      }
      const dto = await updateUser(selectedId, body);
      setUsers((prev) => prev.map((u) => (u.id === selectedId ? dtoToRow(dto) : u)));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失敗');
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

  const selectCls = cn(
    'nx-native-select h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs',
    'outline-none transition-[color,box-shadow]',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  );

  const readonlyFieldCls = 'bg-muted/40 text-muted-foreground cursor-default';

  const usernameEditable = creating;
  const auditSource = creating ? null : selected;

  const renderBodyCell = (row: BaseUserRow, key: ListColKey) => {
    switch (key) {
      case 'username':
        return (
          <td key={key} className="max-w-[200px] truncate px-2 py-2.5 font-mono text-xs text-foreground">
            {row.username}
          </td>
        );
      case 'displayName':
        return (
          <td key={key} className="max-w-[220px] truncate px-2 py-2.5 text-foreground">
            {row.displayName}
          </td>
        );
      case 'jobTitle':
        return (
          <td key={key} className="max-w-[180px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.jobTitle || '—'}
          </td>
        );
      case 'isActive':
        return <MasterActiveListCell key={key} isActive={row.isActive} />;
      case 'lastLoginAt':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5 text-xs text-muted-foreground tabular-nums">
            {formatDt(row.lastLoginAt)}
          </td>
        );
      case 'email':
        return (
          <td key={key} className="max-w-[180px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.email || '—'}
          </td>
        );
      case 'phone':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.phone || '—'}
          </td>
        );
      case 'warehouseLabel':
        return (
          <td key={key} className="max-w-[200px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.warehouseLabel}
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
            {row[key]}
          </td>
        );
      default:
        return null;
    }
  };

  const tableMinW = Math.max(360, 40 + orderedVisibleCols.length * 112 + 48);
  const jobFilterSummary =
    jobPicks.size === 0 ? '職務：全部' : jobPicks.size === 1 ? `職務：${[...jobPicks][0]}` : `職務：已選 ${jobPicks.size} 項`;

  const activeFilterSummary =
    activeFilter === 'all' ? '狀態：全部' : activeFilter === 'active' ? '狀態：啟用' : '狀態：停用';

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="glass-card nx-glass-raised rounded-2xl border border-border/80 p-3 sm:p-4">
          <div
            className={cn(
              'relative flex min-w-0 flex-wrap items-center gap-2',
              colPickerOpen && 'z-[100]',
            )}
            ref={colPickerWrapRef}
          >
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
                id="bu-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="帳號、姓名、職務、信箱、電話、隸屬倉庫…"
                autoComplete="off"
                className="h-9 min-w-[min(100%,10rem)] flex-1 basis-[min(100%,14rem)]"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-[min(100%,11rem)] shrink-0 justify-between gap-1 px-2.5 font-normal sm:min-w-44 sm:w-auto sm:max-w-[14rem]"
                    aria-label="依職務篩選（可複選）"
                  >
                    <span className="truncate">{jobFilterSummary}</span>
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
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">依職務篩選（可複選）</DropdownMenuLabel>
                  <DropdownMenuItem
                    className="text-xs"
                    onSelect={(e) => {
                      e.preventDefault();
                      setJobPicks(new Set());
                    }}
                  >
                    清除篩選（顯示全部）
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {jobTitleOptions.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">尚無職務資料</div>
                  ) : (
                    jobTitleOptions.map((j) => (
                      <DropdownMenuCheckboxItem
                        key={j}
                        checked={jobPicks.has(j)}
                        onCheckedChange={(checked) => {
                          setJobPicks((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(j);
                            else next.delete(j);
                            return next;
                          });
                        }}
                        onSelect={(e) => e.preventDefault()}
                        className="text-sm"
                      >
                        {j}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
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
                <div className="absolute left-0 right-0 top-full z-[110] mt-2 w-full min-w-[min(100%,320px)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg sm:left-auto sm:right-0 sm:w-[min(100vw-2rem,320px)]">
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
                              return {
                                ...norm,
                                colOrder: arrayMove(norm.colOrder, fromIdx, toIdx),
                              };
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

        <section className="glass-card nx-glass-raised relative z-0 flex min-h-[min(420px,70dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 lg:min-h-[420px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
              <MasterListScrollRegion
                scrollRef={listKeyboardRootRef}
                ariaLabel="使用者列表，方向鍵選取列，Enter 開啟明細，雙擊開啟明細"
              >
                <table
                  className="nx-master-table w-full border-collapse text-sm"
                  style={{ minWidth: tableMinW }}
                >
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
                                aria-label={'選取 ' + row.username}
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
        titleId="bu-detail-title"
        title={creating ? '新增使用者' : auditSource?.username ?? '使用者明細'}
        subtitle={!creating && auditSource ? auditSource.displayName : null}
        showPrevNext={!creating && selectedIdxSorted >= 0}
        onPrev={goDetailPrev}
        onNext={goDetailNext}
        disablePrev={selectedIdxSorted <= 0}
        disableNext={selectedIdxSorted >= sortedRows.length - 1}
      >
          <div className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,380px)]">
              <div className="min-w-0 space-y-3 pb-2 lg:max-w-xl">
                <div className="space-y-2">
                  <Label htmlFor="bu-d-username">帳號</Label>
                  <Input
                    id="bu-d-username"
                    value={usernameEditable ? formValues.username : auditSource?.username ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                    readOnly={!usernameEditable}
                    className={!usernameEditable ? readonlyFieldCls : undefined}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bu-d-display">姓名</Label>
                  <Input
                    id="bu-d-display"
                    value={formValues.displayName}
                    onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                {creating ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bu-d-pw">初始密碼（至少 6 碼）</Label>
                      <Input
                        id="bu-d-pw"
                        type="password"
                        value={formValues.password}
                        onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bu-d-prole">指派主角色</Label>
                      <select
                        id="bu-d-prole"
                        className={selectCls}
                        value={formValues.primaryRoleId}
                        onChange={(e) => setDraft((d) => ({ ...d, primaryRoleId: e.target.value }))}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}（{r.code}）
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}
                {editing && !creating ? (
                  <div className="space-y-2">
                    <Label htmlFor="bu-d-npw">新密碼（選填，至少 6 碼）</Label>
                    <Input
                      id="bu-d-npw"
                      type="password"
                      value={formValues.newPassword}
                      onChange={(e) => setDraft((d) => ({ ...d, newPassword: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                ) : null}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="bu-d-active"
                    type="checkbox"
                    className="size-4 rounded border border-input accent-primary"
                    checked={formValues.isActive}
                    disabled={!editing && !creating}
                    onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  />
                  <Label htmlFor="bu-d-active" className="font-normal">
                    啟用
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bu-d-email">信箱</Label>
                  <Input
                    id="bu-d-email"
                    type="email"
                    value={formValues.email}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bu-d-phone">電話</Label>
                  <Input
                    id="bu-d-phone"
                    value={formValues.phone}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                    readOnly={!editing && !creating}
                    className={!editing && !creating ? readonlyFieldCls : undefined}
                  />
                </div>
                {!creating && auditSource ? (
                  <p className="text-[11px] text-muted-foreground">
                    最後登入：{formatDt(auditSource.lastLoginAt ?? null)}
                  </p>
                ) : null}
              </div>

              {!creating && selectedId ? (
                <div className="flex min-h-0 flex-col gap-4 lg:max-h-[min(72vh,640px)]">
                  {sideErr ? <p className="text-xs text-destructive">{sideErr}</p> : null}
                  <section className="flex min-h-[200px] flex-1 flex-col rounded-xl border border-border/70 bg-muted/10 p-3 shadow-sm">
                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">擔任職務</h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">勾選指派或取消；「主」為列表上職務顯示依據。</p>
                    <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {sideLoading ? (
                        <p className="text-xs text-muted-foreground">載入中…</p>
                      ) : (
                        roles.map((r) => {
                          const ur = sideUserRoles.find((x) => x.roleId === r.id);
                          const assigned = Boolean(ur);
                          return (
                            <div
                              key={r.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2 py-2 text-sm"
                            >
                              <label className="flex flex-1 cursor-pointer items-center gap-2 min-w-[8rem]">
                                <input
                                  type="checkbox"
                                  className="size-4 rounded border border-input accent-primary"
                                  checked={assigned}
                                  disabled={sideBusy}
                                  onChange={() => void onToggleUserRole(r.id)}
                                />
                                <span className="truncate">
                                  {r.name}
                                  <span className="ml-1 font-mono text-xs text-muted-foreground">{r.code}</span>
                                </span>
                              </label>
                              {assigned && ur ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={ur.isPrimary ? 'default' : 'outline'}
                                  className="h-7 shrink-0 px-2 text-xs"
                                  disabled={sideBusy || ur.isPrimary}
                                  onClick={() => void onSetPrimaryUserRole(ur.id)}
                                >
                                  {ur.isPrimary ? '主職務' : '設為主職務'}
                                </Button>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="flex min-h-[200px] flex-1 flex-col rounded-xl border border-border/70 bg-muted/10 p-3 shadow-sm">
                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">隸屬倉庫</h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">可複選；變更後列表摘要會同步更新。</p>
                    <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {sideLoading ? (
                        <p className="text-xs text-muted-foreground">載入中…</p>
                      ) : warehouseOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">無啟用倉庫可指派。</p>
                      ) : (
                        warehouseOptions.map((w) => {
                          const uw = sideUserWarehouses.find((x) => x.warehouseId === w.id);
                          return (
                            <label
                              key={w.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="size-4 rounded border border-input accent-primary"
                                checked={Boolean(uw)}
                                disabled={sideBusy}
                                onChange={() => void onToggleUserWarehouse(w.id)}
                              />
                              <span className="truncate">
                                <span className="font-mono text-xs">{w.code}</span>
                                <span className="ml-1">{w.name}</span>
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </section>
                </div>
              ) : creating ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                  建立帳號後，可於此處指派多個職務與倉庫。
                </div>
              ) : null}
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
