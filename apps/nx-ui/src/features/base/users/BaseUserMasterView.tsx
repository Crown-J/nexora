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
  Maximize2,
  Minimize2,
  Pencil,
  RefreshCw,
  X,
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
import type { BaseUserRow } from './mock-data';
import { assignUserRole, listUserRoles } from '@/features/base/api/user-role';
import { listRoles, type RoleDto } from '@/features/base/api/role';
import { createUser, listUsers, setUserActive, updateUser, type UserDto } from '@/features/base/api/user';

type ListColKey =
  | 'username'
  | 'displayName'
  | 'email'
  | 'phone'
  | 'isActive'
  | 'lastLoginAt'
  | 'createdAt'
  | 'createdBy'
  | 'createdByName'
  | 'updatedAt'
  | 'updatedBy'
  | 'updatedByName';
type SortKey = ListColKey;
type SortDir = 'asc' | 'desc';

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

const LIST_COL_PREF_VERSION = 3;
const LIST_COL_PREF_KEY = 'base.user.listcols';

const ALL_LIST_COLS: ListColKey[] = [
  'username',
  'displayName',
  'email',
  'phone',
  'isActive',
  'lastLoginAt',
  'createdAt',
  'createdBy',
  'createdByName',
  'updatedAt',
  'updatedBy',
  'updatedByName',
];

const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  username: { label: '帳號', locked: true },
  displayName: { label: '姓名' },
  email: { label: 'Email' },
  phone: { label: '電話' },
  isActive: { label: '狀態' },
  lastLoginAt: { label: '最後登入' },
  createdAt: { label: '建立時間' },
  createdBy: { label: '建立人ID' },
  createdByName: { label: '建立人' },
  updatedAt: { label: '修改時間' },
  updatedBy: { label: '修改人ID' },
  updatedByName: { label: '修改人' },
};

type UserListColPref = { visibleCols: ListColKey[]; colOrder: ListColKey[] };

const DEFAULT_COL_PREF: UserListColPref = {
  visibleCols: [...ALL_LIST_COLS],
  colOrder: [...ALL_LIST_COLS],
};

function normalizeColPref(raw: UserListColPref): UserListColPref {
  const order = ALL_LIST_COLS.filter((k) => raw.colOrder.includes(k));
  for (const k of ALL_LIST_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => ALL_LIST_COLS.includes(k));
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
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    jobTitle: u.jobTitle ?? '—',
    email: u.email ?? '',
    phone: u.phone ?? '',
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    createdBy: u.createdBy ?? null,
    createdByName: u.createdByName ?? '—',
    updatedAt: u.updatedAt,
    updatedBy: u.updatedBy ?? null,
    updatedByName: u.updatedByName ?? '—',
  };
}

function isListKeyboardBlocked(
  target: EventTarget | null,
  detailEl: HTMLElement | null,
  panelOpen: boolean,
): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (panelOpen && detailEl?.contains(target)) return true;
  return false;
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
  const [jobPick, setJobPick] = useState<string>('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'username', dir: 'asc' });
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
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

  const { value: colPref, setValue: setColPref } = useListLocalPref<UserListColPref>(
    LIST_COL_PREF_KEY,
    LIST_COL_PREF_VERSION,
    DEFAULT_COL_PREF,
  );
  const listCols = useMemo(() => normalizeColPref(colPref), [colPref]);

  const headerCheckboxRef = useRef<HTMLInputElement>(null);

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
      if (jobPick && u.jobTitle !== jobPick) return false;
      if (k) {
        const blob = (u.username + ' ' + u.displayName + ' ' + u.jobTitle + ' ' + u.email + ' ' + u.phone).toLowerCase();
        if (!blob.includes(k)) return false;
      }
      return true;
    });
  }, [users, keyword, jobPick]);

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
        case 'createdAt':
          return mult * String(a.createdAt).localeCompare(String(b.createdAt));
        case 'updatedAt':
          return cmpNullLast(a.updatedAt, b.updatedAt, () => mult * String(a.updatedAt ?? '').localeCompare(String(b.updatedAt ?? '')));
        case 'createdBy':
          return mult * (a.createdBy ?? '').localeCompare(b.createdBy ?? '');
        case 'createdByName':
          return mult * a.createdByName.localeCompare(b.createdByName, 'zh-Hant');
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

  const filterKey = `${keyword}|${jobPick}`;
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
      if (isListKeyboardBlocked(e.target, detailPanelRef.current, panelOpen)) return;
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

  const formValues = useMemo(() => {
    if (editing || creating) return draft;
    if (selected) return rowFromUser(selected);
    return emptyDraft(defaultRoleId);
  }, [editing, creating, draft, selected, defaultRoleId]);

  const pageRowIds = useMemo(() => pageRows.map((r) => r.id), [pageRows]);

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (!el) return;
    const checkedCount = pageRowIds.filter((id) => checked.has(id)).length;
    el.indeterminate = checkedCount > 0 && checkedCount < pageRowIds.length;
    el.checked = pageRowIds.length > 0 && checkedCount === pageRowIds.length;
  }, [pageRowIds, checked]);

  const toggleOne = (id: string, on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllVisible = (on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) pageRowIds.forEach((id) => next.add(id));
      else pageRowIds.forEach((id) => next.delete(id));
      return next;
    });
  };

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
      case 'isActive':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5">
            <span
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-md text-xs font-medium',
                row.isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/15 text-destructive',
              )}
              title={row.isActive ? '啟用' : '停用'}
            >
              {row.isActive ? '✓' : '×'}
            </span>
          </td>
        );
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

  const tableMinW = Math.max(360, 40 + orderedVisibleCols.length * 112 + 48);
  const hasListSelection = checked.size > 0;
  const jobFilterValue = jobPick === '' ? '__all__' : jobPick;

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

              {!hasListSelection ? (
                <Button type="button" size="sm" variant="default" onClick={onAdd} disabled={loading || saving}>
                  新增
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void onBulkActive(true)}
                    disabled={saving}
                  >
                    啟用
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void onBulkActive(false)}
                    disabled={saving}
                  >
                    停用
                  </Button>
                </>
              )}

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
                placeholder="帳號、姓名、Email、電話…"
                autoComplete="off"
                className="h-9 min-w-[min(100%,10rem)] flex-1 basis-[min(100%,14rem)]"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-[min(100%,11rem)] shrink-0 justify-between gap-1 px-2.5 font-normal sm:w-40"
                    aria-label="依職務篩選"
                  >
                    <span className="truncate">{jobPick === '' ? '職務：全部' : jobPick}</span>
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
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">依職務篩選</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={jobFilterValue}
                    onValueChange={(v) => setJobPick(v === '__all__' ? '' : v)}
                  >
                    <DropdownMenuRadioItem value="__all__">全部</DropdownMenuRadioItem>
                    {jobTitleOptions.map((j) => (
                      <DropdownMenuRadioItem key={j} value={j}>
                        {j}
                      </DropdownMenuRadioItem>
                    ))}
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

        <section className="glass-card nx-glass-raised flex min-h-[min(420px,70dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 lg:min-h-[420px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
              <div
                ref={listKeyboardRootRef}
                tabIndex={-1}
                role="region"
                aria-label="使用者列表，方向鍵選取列，Enter 開啟明細，雙擊開啟明細"
                className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-x-contain rounded-md pr-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              >
                <table
                  className="nx-master-table w-full border-collapse text-sm"
                  style={{ minWidth: tableMinW }}
                >
                    <thead>
                      <tr className="border-b border-primary/15 bg-black/[0.55] text-left text-muted-foreground shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.07)]">
                        <th className="w-10 px-2 py-2.5">
                          <input
                            ref={headerCheckboxRef}
                            type="checkbox"
                            className="size-4 rounded border border-input accent-primary"
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
                      {pageRows.map((row, rowIndex) => {
                        const isFocused = row.id === focusedRowId;
                        const isOpenDetail = !creating && panelOpen && row.id === selectedId;
                        const isHighlighted = isFocused || isOpenDetail;
                        const stripeLight = rowIndex % 2 === 0;
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              'cursor-pointer border-b border-white/[0.06] transition-colors duration-150',
                              isHighlighted && 'nx-row-selected',
                              isHighlighted
                                ? 'bg-primary/20 ring-1 ring-inset ring-primary/40 shadow-[inset_0_1px_0_0_rgba(244,180,0,0.14)]'
                                : cn(
                                    stripeLight
                                      ? 'bg-white/[0.04]'
                                      : 'bg-black/[0.42]',
                                    'hover:bg-primary/12 hover:shadow-[inset_0_0_0_1px_rgba(244,180,0,0.2)]',
                                  ),
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
                                className="size-4 rounded border border-input accent-primary"
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                closeDetailFull();
              }
            }}
            role="button"
            tabIndex={-1}
          />

          <aside
            ref={detailPanelRef}
            className={cn(
              'glass-card nx-glass-raised fixed left-1/2 top-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/80 shadow-2xl transition-[width,max-height] duration-200 ease-out',
              detailFullscreen
                ? 'h-[min(90dvh,calc(100dvh-1.5rem))] w-[min(92vw,calc(100vw-1rem))]'
                : 'max-h-[min(85dvh,calc(100dvh-2rem))] w-[min(80vw,calc(100vw-1.5rem))]',
            )}
            aria-modal="true"
            role="dialog"
            aria-labelledby="bu-detail-title"
          >
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-6',
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
                <h2
                  id="bu-detail-title"
                  className="mt-0.5 truncate text-base font-semibold text-foreground"
                >
                  {creating ? '新增使用者' : auditSource?.username ?? '使用者明細'}
                </h2>
                {!creating && auditSource ? (
                  <p className="truncate text-xs text-muted-foreground">{auditSource.displayName}</p>
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
                    className="inline-flex size-8"
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
                    className="inline-flex size-8"
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
                aria-label={detailFullscreen ? '恢復預設視窗大小' : '放大視窗'}
                title={detailFullscreen ? '恢復預設視窗大小' : '放大視窗'}
                onClick={() => setDetailFullscreen((v) => !v)}
              >
                {detailFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label="關閉詳情"
                onClick={closeDetailFull}
              >
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
              <div className="space-y-3 pb-2">
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
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="bu-d-job-ro">職務（主角色名稱）</Label>
                    <Input
                      id="bu-d-job-ro"
                      readOnly
                      value={auditSource?.jobTitle ?? '—'}
                      className={readonlyFieldCls}
                    />
                    <p className="text-[11px] text-muted-foreground">調整角色請至「職務」主檔指派成員。</p>
                  </div>
                )}
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
                  <Label htmlFor="bu-d-email">Email</Label>
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
              </div>
            </TabsContent>

            <TabsContent value="audit" className="mt-3 outline-none">
              <div className="space-y-3 pb-2">
                  <div className="space-y-2">
                  <Label htmlFor="bu-d-lastlogin">最後登入時間</Label>
                  <Input
                    id="bu-d-lastlogin"
                    readOnly
                    value={formatDt(auditSource?.lastLoginAt ?? null)}
                    className={readonlyFieldCls}
                  />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bu-d-created-by-id">建立人員（ID）</Label>
                    <Input
                      id="bu-d-created-by-id"
                      readOnly
                      value={auditSource?.createdBy ?? '\u2014'}
                      className={readonlyFieldCls}
                    />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="bu-d-created-by">建立人員（姓名）</Label>
                  <Input
                    id="bu-d-created-by"
                    readOnly
                    value={auditSource?.createdByName ?? '\u2014'}
                    className={readonlyFieldCls}
                  />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="bu-d-created-at">建立時間</Label>
                  <Input
                    id="bu-d-created-at"
                    readOnly
                    value={auditSource ? formatDt(auditSource.createdAt) : '\u2014'}
                    className={readonlyFieldCls}
                  />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="bu-d-updated-at">最後修改時間</Label>
                  <Input
                    id="bu-d-updated-at"
                    readOnly
                    value={auditSource ? formatDt(auditSource.updatedAt) : '\u2014'}
                    className={readonlyFieldCls}
                  />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bu-d-updated-by-id">最後修改人員（ID）</Label>
                    <Input
                      id="bu-d-updated-by-id"
                      readOnly
                      value={auditSource?.updatedBy ?? '\u2014'}
                      className={readonlyFieldCls}
                    />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="bu-d-updated-by">最後修改人員（姓名）</Label>
                  <Input
                    id="bu-d-updated-by"
                    readOnly
                    value={auditSource?.updatedByName ?? '\u2014'}
                    className={readonlyFieldCls}
                  />
                  </div>
                {creating ? (
                  <p className="text-xs text-muted-foreground">建立完成後將顯示稽核欄位。</p>
                ) : null}
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
              className="fixed bottom-6 right-5 z-[60] size-14 rounded-full shadow-lg lg:hidden"
              aria-label="編輯"
              onClick={onEdit}
            >
              <Pencil className="size-6" />
            </Button>
          ) : null}
        </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
