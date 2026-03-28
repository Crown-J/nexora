/**
 * File: apps/nx-ui/src/features/base/users/BaseUserMasterView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Base user master-detail view with search, filters, sorting, pagination, and mock data (no API).
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  MOCK_BASE_USERS,
  MOCK_CURRENT_OPERATOR_NAME,
  MOCK_JOB_TITLES,
  type BaseUserRow,
} from './mock-data';

type SortKey = 'username' | 'displayName' | 'jobTitle' | 'isActive' | 'lastLoginAt';
type SortDir = 'asc' | 'desc';

/** 可透過表單編輯的欄位（帳號僅新增時可填） */
type EditableDraft = {
  username: string;
  displayName: string;
  jobTitle: string;
  email: string;
  phone: string;
  isActive: boolean;
};

const PAGE_SIZE = 10;

function emptyDraft(): EditableDraft {
  return {
    username: '',
    displayName: '',
    jobTitle: MOCK_JOB_TITLES[0] ?? '',
    email: '',
    phone: '',
    isActive: true,
  };
}

function rowFromUser(u: BaseUserRow): EditableDraft {
  return {
    username: u.username,
    displayName: u.displayName,
    jobTitle: u.jobTitle,
    email: u.email,
    phone: u.phone,
    isActive: u.isActive,
  };
}

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

export function BaseUserMasterView() {
  const [users, setUsers] = useState<BaseUserRow[]>(() => [...MOCK_BASE_USERS]);
  const [keyword, setKeyword] = useState('');
  const [jobPick, setJobPick] = useState<string>('');
  const [fUsername, setFUsername] = useState('');
  const [fDisplayName, setFDisplayName] = useState('');
  const [fJobTitle, setFJobTitle] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'username', dir: 'asc' });
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(() => MOCK_BASE_USERS[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableDraft>(() => emptyDraft());
  const [page, setPage] = useState(1);

  const headerCheckboxRef = useRef<HTMLInputElement>(null);

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

  const formValues = useMemo(() => {
    if (editing || creating) return draft;
    if (selected) return rowFromUser(selected);
    return emptyDraft();
  }, [editing, creating, draft, selected]);

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

  const onBulkActive = (active: boolean) => {
    if (checked.size === 0) return;
    const now = new Date().toISOString();
    setUsers((prev) =>
      prev.map((u) =>
        checked.has(u.id)
          ? {
              ...u,
              isActive: active,
              updatedAt: now,
              updatedByName: MOCK_CURRENT_OPERATOR_NAME,
            }
          : u,
      ),
    );
    setChecked(new Set());
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

  const onSave = () => {
    if (creating) {
      const uname = draft.username.trim();
      if (!uname) return;
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? 'u-' + crypto.randomUUID()
          : 'u-' + String(Date.now());
      const now = new Date().toISOString();
      const row: BaseUserRow = {
        id,
        username: uname,
        displayName: draft.displayName.trim() || uname,
        jobTitle: draft.jobTitle,
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        isActive: draft.isActive,
        lastLoginAt: null,
        createdAt: now,
        createdByName: MOCK_CURRENT_OPERATOR_NAME,
        updatedAt: now,
        updatedByName: MOCK_CURRENT_OPERATOR_NAME,
      };
      setUsers((prev) => [...prev, row]);
      setSelectedId(id);
      setCreating(false);
      setEditing(false);
      return;
    }
    if (!selectedId || !selected) return;
    const now = new Date().toISOString();
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedId
          ? {
              ...u,
              displayName: draft.displayName.trim() || u.displayName,
              jobTitle: draft.jobTitle,
              email: draft.email.trim(),
              phone: draft.phone.trim(),
              isActive: draft.isActive,
              updatedAt: now,
              updatedByName: MOCK_CURRENT_OPERATOR_NAME,
            }
          : u,
      ),
    );
    setEditing(false);
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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,42%)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋與篩選</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bu-keyword">關鍵字</Label>
              <Input
                id="bu-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="帳號、姓名、Email、電話…"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bu-job">職務</Label>
              <select
                id="bu-job"
                className={selectCls}
                value={jobPick}
                onChange={(e) => setJobPick(e.target.value)}
              >
                <option value="">全部</option>
                {MOCK_JOB_TITLES.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="glass-card flex min-h-[420px] min-w-0 flex-1 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
            <Button type="button" size="sm" variant="default" onClick={onAdd}>
              新增
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onBulkActive(false)} disabled={checked.size === 0}>
              停用
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onBulkActive(true)} disabled={checked.size === 0}>
              啟用
            </Button>
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
              共 {sortedRows.length} 筆 · 本頁 {pageRows.length} 筆
            </span>
          </div>

          <ScrollArea className="mt-3 min-h-0 flex-1 pr-2">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="w-10 px-2 py-2">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        className="size-4 rounded border border-input accent-primary"
                        aria-label="全選本頁列"
                        onChange={(e) => toggleAllVisible(e.target.checked)}
                      />
                    </th>
                    <th className="px-2 py-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                        onClick={() => toggleSort('username')}
                      >
                        帳號
                        {sortIcon('username')}
                      </button>
                    </th>
                    <th className="px-2 py-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                        onClick={() => toggleSort('displayName')}
                      >
                        姓名
                        {sortIcon('displayName')}
                      </button>
                    </th>
                    <th className="px-2 py-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                        onClick={() => toggleSort('jobTitle')}
                      >
                        職務
                        {sortIcon('jobTitle')}
                      </button>
                    </th>
                    <th className="px-2 py-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                        onClick={() => toggleSort('isActive')}
                      >
                        狀態
                        {sortIcon('isActive')}
                      </button>
                    </th>
                    <th className="px-2 py-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                        onClick={() => toggleSort('lastLoginAt')}
                      >
                        最後登入
                        {sortIcon('lastLoginAt')}
                      </button>
                    </th>
                  </tr>
                  <tr className="border-b border-border/60 bg-secondary/20">
                    <th className="p-2" />
                    <th className="p-2">
                      <Input
                        value={fUsername}
                        onChange={(e) => setFUsername(e.target.value)}
                        placeholder="篩選"
                        className="h-8 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                    <th className="p-2">
                      <Input
                        value={fDisplayName}
                        onChange={(e) => setFDisplayName(e.target.value)}
                        placeholder="篩選"
                        className="h-8 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                    <th className="p-2">
                      <Input
                        value={fJobTitle}
                        onChange={(e) => setFJobTitle(e.target.value)}
                        placeholder="篩選"
                        className="h-8 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                    <th className="p-2" colSpan={2} />
                  </tr>
                </thead>
                <tbody>
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
                        <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="size-4 rounded border border-input accent-primary"
                            checked={checked.has(row.id)}
                            onChange={(e) => toggleOne(row.id, e.target.checked)}
                            aria-label={'選取 ' + row.username}
                          />
                        </td>
                        <td className="px-2 py-2 font-mono text-xs">{row.username}</td>
                        <td className="px-2 py-2">{row.displayName}</td>
                        <td className="px-2 py-2 text-muted-foreground">{row.jobTitle}</td>
                        <td className="px-2 py-2">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              row.isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {row.isActive ? '啟用' : '停用'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-xs text-muted-foreground tabular-nums">{formatDt(row.lastLoginAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </section>
      </div>

      <aside className="glass-card min-h-[min(520px,calc(100vh-14rem))] rounded-2xl border border-border/80 p-4 shadow-sm lg:sticky lg:top-24">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
        <h2 className="mt-1 text-sm font-semibold text-foreground">使用者明細</h2>

        <div className="mt-4 space-y-3">
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
          <div className="space-y-2">
            <Label htmlFor="bu-d-job">職務</Label>
            <select
              id="bu-d-job"
              className={selectCls}
              value={formValues.jobTitle}
              disabled={!editing && !creating}
              onChange={(e) => setDraft((d) => ({ ...d, jobTitle: e.target.value }))}
            >
              {MOCK_JOB_TITLES.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
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

          <div className="border-t border-border/60 pt-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">登入與稽核</p>
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
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {creating || editing ? (
            <>
              <Button type="button" size="sm" onClick={onSave}>
                儲存
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onCancel}>
                取消
              </Button>
            </>
          ) : selected ? (
            <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
              編輯
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">點選左側一列以檢視，或按「新增」。</p>
          )}
        </div>
      </aside>
    </div>
  );
}
