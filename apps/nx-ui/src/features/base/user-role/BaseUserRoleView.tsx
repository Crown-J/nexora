/**
 * File: apps/nx-ui/src/features/base/user-role/BaseUserRoleView.tsx
 *
 * Purpose:
 * - 使用者職務設定：左側職務列表 + 右側依職務管理成員（user_role 關聯新增／移除／主要職務）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LookupAutocomplete } from '@/shared/ui/lookup/LookupAutocomplete';
import { cn } from '@/lib/utils';
import type { BaseUserRow } from '@/features/base/users/mock-data';
import { assignUserRole, listUserRoles, revokeUserRole, setUserRolePrimary } from '@/features/base/api/user-role';
import { listRoles, type RoleDto } from '@/features/base/api/role';
import { listUsers } from '@/features/base/api/user';
import type { BaseRoleMemberRow, BaseRoleRow } from '@/features/base/role/mock-data';

function roleDtoToRow(r: RoleDto): BaseRoleRow {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? '',
    sortOrder: r.sortNo,
    isActive: r.isActive,
    isSystem: r.isSystem,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    createdBy: r.createdBy ?? null,
    createdByName: r.createdByName ?? undefined,
    updatedBy: r.updatedBy ?? null,
    updatedByName: r.updatedByName ?? undefined,
  };
}

export function BaseUserRoleView() {
  const [roles, setRoles] = useState<BaseRoleRow[]>([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [membersByRole, setMembersByRole] = useState<Record<string, BaseRoleMemberRow[]>>({});
  const [pickerUsers, setPickerUsers] = useState<BaseUserRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState('');
  const [userOpen, setUserOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const reloadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [rr, ur] = await Promise.all([
        listRoles({ page: 1, pageSize: 200 }),
        listUsers({ page: 1, pageSize: 500 }),
      ]);
      const rows = rr.items.map(roleDtoToRow).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
      setRoles(rows);
      setPickerUsers(
        ur.items.map((u) => ({
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
        })),
      );
      setSelectedId((cur) => {
        if (cur && rows.some((r) => r.id === cur)) return cur;
        return rows[0]?.id ?? null;
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '載入失敗');
      setRoles([]);
      setPickerUsers([]);
    }
  }, []);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const loadMembers = useCallback(async (roleId: string) => {
    const res = await listUserRoles({ roleId, isActive: true, page: 1, pageSize: 500 });
    const list: BaseRoleMemberRow[] = res.items.map((x) => ({
      id: x.id,
      userId: x.userId,
      isPrimary: x.isPrimary,
    }));
    setMembersByRole((prev) => ({ ...prev, [roleId]: list }));
  }, []);

  const selectedRole = useMemo(
    () => (selectedId ? roles.find((r) => r.id === selectedId) ?? null : null),
    [roles, selectedId],
  );

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => {
      const blob = `${r.code} ${r.name}`.toLowerCase();
      return blob.includes(q);
    });
  }, [roles, roleSearch]);

  const currentMembers = useMemo(() => {
    if (!selectedId) return [];
    return membersByRole[selectedId] ?? [];
  }, [membersByRole, selectedId]);

  const userById = useMemo(() => {
    const m = new Map<string, BaseUserRow>();
    pickerUsers.forEach((u) => m.set(u.id, u));
    return m;
  }, [pickerUsers]);

  const memberRowsForDisplay = useMemo(() => {
    const ms = currentMembers;
    const k = memberSearch.trim().toLowerCase();
    if (!k) return ms;
    return ms.filter((row) => {
      const u = userById.get(row.userId);
      if (!u) return false;
      const blob = `${u.username} ${u.displayName}`.toLowerCase();
      return blob.includes(k);
    });
  }, [currentMembers, memberSearch, userById]);

  const assignedUserIds = useMemo(() => new Set(currentMembers.map((m) => m.userId)), [currentMembers]);

  const userOptions = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return pickerUsers
      .filter((u) => {
        if (!u.isActive) return false;
        if (assignedUserIds.has(u.id)) return false;
        if (!q) return true;
        const blob = `${u.username} ${u.displayName} ${u.email}`.toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 12);
  }, [assignedUserIds, userQuery, pickerUsers]);

  useEffect(() => {
    if (!selectedId) return;
    void loadMembers(selectedId);
  }, [selectedId, loadMembers]);

  const onSelectRole = (r: BaseRoleRow) => {
    setSelectedId(r.id);
    setUserQuery('');
    setUserOpen(false);
    setMemberSearch('');
  };

  const assignUser = async (userId: string) => {
    if (!selectedId) return;
    setUserQuery('');
    setUserOpen(false);
    setLoadError(null);
    try {
      const list = membersByRole[selectedId] ?? [];
      await assignUserRole({
        userId,
        roleId: selectedId,
        isPrimary: list.length === 0,
      });
      await loadMembers(selectedId);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '指派失敗');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!selectedId) return;
    setLoadError(null);
    try {
      await revokeUserRole(memberId);
      await loadMembers(selectedId);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '移除失敗');
    }
  };

  const togglePrimary = async (memberId: string) => {
    if (!selectedId) return;
    const raw = [...(membersByRole[selectedId] ?? [])];
    const target = raw.find((m) => m.id === memberId);
    if (!target) return;
    const nextPrimary = !target.isPrimary;
    setLoadError(null);
    try {
      await setUserRolePrimary(memberId, nextPrimary);
      await loadMembers(selectedId);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '更新失敗');
    }
  };

  const leftTitle = selectedRole ? `職務列表（已選：${selectedRole.name}）` : '職務列表';

  const lookupInputCls =
    'border-border bg-background/80 text-foreground placeholder:text-muted-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';
  const lookupPanelCls =
    'border-border bg-popover/95 text-popover-foreground backdrop-blur-md shadow-lg top-[42px]';

  return (
    <div className="space-y-4">
      {loadError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-stretch">
        <section className="glass-card flex max-h-[min(720px,calc(100vh-220px))] min-h-[420px] flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs tracking-[0.35em] text-muted-foreground">ROLES</p>
                <h2 className="mt-1 text-sm font-semibold text-foreground">{leftTitle}</h2>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              新增或編輯職務代碼／名稱請至{' '}
              <Link href="/base/role" className="font-medium text-primary underline-offset-4 hover:underline">
                職務主檔
              </Link>
              。
            </p>
          </div>
          <Input
            id="ur-role-search"
            value={roleSearch}
            onChange={(e) => setRoleSearch(e.target.value)}
            placeholder="搜尋職務（代碼／名稱）"
            className="mb-3"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setRoleSearch('');
            }}
          />
          <ScrollArea className="min-h-0 flex-1 pr-2">
            <div className="space-y-2 pb-1">
              {filteredRoles.map((r) => {
                const active = selectedId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectRole(r)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'border-primary/40 border-l-4 border-l-primary bg-primary/10 pl-2.5 text-foreground shadow-sm ring-1 ring-primary/20'
                        : 'border-border/80 bg-muted/15 text-foreground hover:bg-muted/30',
                    )}
                  >
                    <div className="font-semibold leading-snug">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.code}</div>
                  </button>
                );
              })}
              {filteredRoles.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                  無符合的職務。請至職務主檔建立職務。
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </section>

        <section className="glass-card flex min-h-[min(720px,calc(100vh-220px))] min-h-0 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="mb-3 border-b border-border/60 pb-3">
            <p className="text-xs tracking-[0.35em] text-muted-foreground">MEMBERS</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">匯入使用者</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedRole ? (
                <>
                  目前職務：<span className="font-medium text-foreground">{selectedRole.name}</span>（{selectedRole.code}）
                </>
              ) : (
                '請從左側選擇職務。'
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">由使用者主檔（啟用中）選入，即時寫入 user_role。</p>
          </div>

          {!selectedId ? (
            <p className="text-sm text-muted-foreground">尚無可選職務。</p>
          ) : (
            <>
              <div className="mb-3">
                <LookupAutocomplete<BaseUserRow>
                  value={userQuery}
                  onChange={setUserQuery}
                  options={userOptions}
                  open={userOpen}
                  onOpenChange={setUserOpen}
                  placeholder="搜尋使用者（帳號／顯示名稱）"
                  emptyText="沒有符合或未啟用的使用者"
                  getKey={(u) => u.id}
                  inputClassName={lookupInputCls}
                  panelClassName={lookupPanelCls}
                  renderOption={(u) => (
                    <>
                      <div>
                        <div className="font-semibold text-foreground">{u.username}</div>
                        <div className="text-xs text-muted-foreground">{u.displayName}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{u.isActive ? '啟用' : '停用'}</div>
                    </>
                  )}
                  onPick={(u) => assignUser(u.id)}
                />
              </div>

              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="在已匯入名單內搜尋（帳號／顯示名稱）"
                  className="max-w-md"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setMemberSearch('');
                  }}
                />
                <span className="text-xs tabular-nums text-muted-foreground">共 {memberRowsForDisplay.length} 人</span>
              </div>

              <ScrollArea className="min-h-0 flex-1 pr-2">
                <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
                  {memberRowsForDisplay.map((row) => {
                    const u = userById.get(row.userId);
                    const label = u ? `${u.username} · ${u.displayName}` : row.userId;
                    return (
                      <div
                        key={row.id}
                        className={cn(
                          'flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-sm',
                          row.isPrimary
                            ? 'border-primary/35 bg-primary/10 text-foreground'
                            : 'border-border/80 bg-card/60 text-foreground',
                        )}
                        title={label}
                      >
                        <span className="max-w-[220px] truncate">{label}</span>
                        <button
                          type="button"
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40',
                            row.isPrimary
                              ? 'bg-primary/20 text-primary hover:bg-primary/25'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                          )}
                          onClick={() => togglePrimary(row.id)}
                          title="切換主要職務"
                        >
                          {row.isPrimary ? 'PRIMARY' : '設為主要'}
                        </button>
                        <button
                          type="button"
                          className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                          onClick={() => removeMember(row.id)}
                          title="移除"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  {memberRowsForDisplay.length === 0 ? (
                    <span className="text-xs text-muted-foreground">尚無成員，請用上方搜尋加入。</span>
                  ) : null}
                </div>
              </ScrollArea>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
