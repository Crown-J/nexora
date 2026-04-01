/**
 * File: apps/nx-ui/src/features/base/users/BaseUserMasterView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Base user master-detail：連線 nx-api GET/POST/PUT/PATCH /user，職務顯示來自角色主檔（user.jobTitle）
 * - 版型：LIST + SLIDE（明細 fixed 覆蓋列表＋可全螢幕；手機全幅詳情）；欄位顯示可記憶於本機
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Maximize2,
  Minimize2,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import type { BaseUserRow } from './mock-data';
import { assignUserRole, listUserRoles } from '@/features/base/api/user-role';
import { listRoles, type RoleDto } from '@/features/base/api/role';
import { createUser, listUsers, setUserActive, updateUser, type UserDto } from '@/features/base/api/user';

type ListColKey = 'username' | 'displayName' | 'jobTitle' | 'isActive' | 'lastLoginAt';
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

const LIST_COL_PREF_VERSION = 1;
const LIST_COL_PREF_KEY = 'base.user.listcols';

const ALL_LIST_COLS: ListColKey[] = ['username', 'displayName', 'jobTitle', 'isActive', 'lastLoginAt'];

const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  username: { label: '帳號', locked: true },
  displayName: { label: '姓名' },
  jobTitle: { label: '職務' },
  isActive: { label: '狀態' },
  lastLoginAt: { label: '最後登入' },
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
    createdByName: u.createdByName ?? '—',
    updatedAt: u.updatedAt,
    updatedByName: u.updatedByName ?? '—',
  };
}

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

export function BaseUserMasterView() {
  const [users, setUsers] = useState<BaseUserRow[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [jobPick, setJobPick] = useState<string>('');
  const [fUsername, setFUsername] = useState('');
  const [fDisplayName, setFDisplayName] = useState('');
  const [fJobTitle, setFJobTitle] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'username', dir: 'asc' });
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
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
        const blob = (u.username + ' ' + u.displayName + ' ' + u.email + ' ' + u.phone).toLowerCase();
        if (!blob.includes(k)) return false;
      }
      if (fUsername.trim() && !u.username.toLowerCase().includes(fUsername.trim().toLowerCase())) return false;
      if (fDisplayName.trim() && !u.displayName.includes(fDisplayName.trim())) return false;
      if (fJobTitle.trim() && !u.jobTitle.includes(fJobTitle.trim())) return false;
      return true;
    });
  }, [users, keyword, jobPick, fUsername, fDisplayName, fJobTitle]);

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

  const filterKey = `${keyword}|${jobPick}|${fUsername}|${fDisplayName}|${fJobTitle}`;
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

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      closeDetailFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, closeDetailFull]);

  useEffect(() => {
    setDetailFullscreen(false);
  }, [selectedId, creating]);

  const goDetailPrev = useCallback(() => {
    if (creating || selectedIdxSorted <= 0) return;
    const prev = sortedRows[selectedIdxSorted - 1];
    if (!prev) return;
    setSelectedId(prev.id);
    setEditing(false);
    setCreating(false);
  }, [creating, selectedIdxSorted, sortedRows]);

  const goDetailNext = useCallback(() => {
    if (creating || selectedIdxSorted < 0 || selectedIdxSorted >= sortedRows.length - 1) return;
    const next = sortedRows[selectedIdxSorted + 1];
    if (!next) return;
    setSelectedId(next.id);
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
          <td key={key} className="max-w-[180px] truncate px-2 py-2.5 text-muted-foreground">
            {row.jobTitle}
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
      default:
        return null;
    }
  };

  const filterTh = (key: ListColKey) => {
    if (key === 'username') {
      return (
        <th key={`f-${key}`} className="p-2">
          <Input
            value={fUsername}
            onChange={(e) => setFUsername(e.target.value)}
            placeholder="篩選"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      );
    }
    if (key === 'displayName') {
      return (
        <th key={`f-${key}`} className="p-2">
          <Input
            value={fDisplayName}
            onChange={(e) => setFDisplayName(e.target.value)}
            placeholder="篩選"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      );
    }
    if (key === 'jobTitle') {
      return (
        <th key={`f-${key}`} className="p-2">
          <Input
            value={fJobTitle}
            onChange={(e) => setFJobTitle(e.target.value)}
            placeholder="篩選"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      );
    }
    return <th key={`f-${key}`} className="p-2" />;
  };

  const tableMinW = Math.max(360, 40 + orderedVisibleCols.length * 112 + 48);

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋與篩選</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="bu-keyword">關鍵字</Label>
              <Input
                id="bu-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="帳號、姓名、Email、電話…"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 lg:hidden">
              <Label htmlFor="bu-job">職務（主角色）</Label>
              <select
                id="bu-job"
                className={selectCls}
                value={jobPick}
                onChange={(e) => setJobPick(e.target.value)}
              >
                <option value="">全部</option>
                {jobTitleOptions.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="glass-card flex min-h-[min(420px,70dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 shadow-sm lg:min-h-[420px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
            <nav
              className="hidden shrink-0 flex-col gap-0.5 border-b border-border/60 p-3 lg:flex lg:w-36 lg:border-b-0 lg:border-r lg:py-4"
              aria-label="依職務篩選"
            >
              <button
                type="button"
                onClick={() => setJobPick('')}
                className={cn(
                  'rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  jobPick === '' ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-secondary/60',
                )}
              >
                全部
              </button>
              {jobTitleOptions.map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setJobPick(j)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    jobPick === j ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-secondary/60',
                  )}
                >
                  {j}
                </button>
              ))}
            </nav>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
              <div className="relative flex flex-wrap items-center gap-2 border-b border-border/60 pb-3" ref={colPickerWrapRef}>
                <Button type="button" size="sm" variant="default" onClick={onAdd} disabled={loading || saving}>
                  新增
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void onBulkActive(false)}
                  disabled={checked.size === 0 || saving}
                >
                  停用
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void onBulkActive(true)}
                  disabled={checked.size === 0 || saving}
                >
                  啟用
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
                  aria-label="列表欄位設定"
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

                <div className="flex flex-wrap items-center gap-1 border-l border-border/60 pl-2 ml-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 px-2"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="上一頁"
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
                    aria-label="下一頁"
                  >
                    下一頁
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {loading ? '載入中…' : `共 ${sortedRows.length} 筆 · 本頁 ${pageRows.length} 筆`}
                </span>
              </div>

              <ScrollArea className="mt-3 min-h-0 flex-1 pr-2">
                <div className="w-full overflow-x-auto">
                  <table
                    className="w-full border-collapse text-sm"
                    style={{ minWidth: tableMinW }}
                  >
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-left text-muted-foreground">
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
                      <tr className="border-b border-border/60 bg-secondary/20">
                        <th className="p-2" />
                        {orderedVisibleCols.map((key) => filterTh(key))}
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td
                          className="bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground"
                          colSpan={2 + orderedVisibleCols.length}
                        >
                          使用者
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
              </ScrollArea>
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
            className={cn(
              'glass-card flex flex-col overflow-y-auto overscroll-contain border-border/80 bg-background shadow-2xl transition-[transform,opacity,box-shadow] duration-300 ease-out',
              detailFullscreen
                ? 'fixed left-1/2 top-1/2 z-50 w-[min(92vw,42rem)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-2xl max-h-[min(85dvh,calc(100dvh-3.5rem-6.5rem))] sm:w-[min(90vw,48rem)]'
                : 'fixed inset-0 z-50 max-h-[100dvh] rounded-none border-0 max-lg:border-0 lg:inset-auto lg:right-4 lg:top-24 lg:bottom-4 lg:left-auto lg:h-auto lg:max-h-[calc(100vh-7rem)] lg:w-[min(440px,calc(100vw-2rem))] lg:rounded-2xl lg:border lg:shadow-2xl',
            )}
            aria-modal="true"
            role="dialog"
            aria-labelledby="bu-detail-title"
          >
        <div
          className={cn(
            'flex min-w-0 flex-col',
            'min-h-0 flex-1 p-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-4',
            detailFullscreen &&
              'w-full max-w-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6',
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 pb-3 lg:border-0 lg:pb-0">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0 lg:hidden"
                aria-label="返回列表"
                onClick={closeDetailFull}
              >
                <ArrowLeft className="size-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
                <h2
                  id="bu-detail-title"
                  className="mt-0.5 truncate text-base font-semibold text-foreground lg:text-sm"
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
                    className="hidden size-8 lg:inline-flex"
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
                    className="hidden size-8 lg:inline-flex"
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
                aria-label={detailFullscreen ? '結束全螢幕' : '全螢幕明細'}
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
              <div className="space-y-3 pb-28 lg:pb-6">
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
              <div className="space-y-3 pb-28 lg:pb-6">
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
                  <Label htmlFor="bu-d-created-by">建立人員</Label>
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
                  <Label htmlFor="bu-d-updated-by">最後修改人員</Label>
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
