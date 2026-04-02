/**
 * File: apps/nx-ui/src/features/base/user-role/BaseUserRoleView.tsx
 *
 * Purpose:
 * - 使用者職務設定：左側職務列表 + 右側依職務管理成員（user_role 新增／移除）
 * - 鍵盤：左側 ↑↓ 選職務、Enter 進使用者搜尋；搜尋框 ↑↓ 選下拉、Enter 加入；無關鍵字 Enter 進成員區；成員區 ↑↓、Delete 移除、↑ 回搜尋；Esc 右側→左側、左側再 Esc→/base
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LookupAutocomplete } from '@/shared/ui/lookup/LookupAutocomplete';
import { cn } from '@/lib/utils';
import { formatAuditPersonLabel, formatWarehouseLabel, type BaseUserRow } from '@/features/base/users/mock-data';
import { assignUserRole, listUserRoles, revokeUserRole } from '@/features/base/api/user-role';
import { listRoles, type RoleDto } from '@/features/base/api/role';
import { listUsers } from '@/features/base/api/user';
import type { BaseRoleMemberRow, BaseRoleRow } from '@/features/base/role/mock-data';

function roleDtoToRow(r: RoleDto): BaseRoleRow {
  const cbName = r.createdByName ?? null;
  const ubName = r.updatedByName ?? null;
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
    createdByUsername: r.createdByUsername ?? null,
    createdByName: cbName ?? undefined,
    createdByPerson: formatAuditPersonLabel(r.createdByUsername, cbName),
    updatedBy: r.updatedBy ?? null,
    updatedByUsername: r.updatedByUsername ?? null,
    updatedByName: ubName ?? undefined,
    updatedByPerson: formatAuditPersonLabel(r.updatedByUsername, ubName),
  };
}

export function BaseUserRoleView() {
  const router = useRouter();
  const pathname = usePathname();
  const [roles, setRoles] = useState<BaseRoleRow[]>([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [membersByRole, setMembersByRole] = useState<Record<string, BaseRoleMemberRow[]>>({});
  const [pickerUsers, setPickerUsers] = useState<BaseUserRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState('');
  const [userOpen, setUserOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFocusIdx, setMemberFocusIdx] = useState(-1);

  const roleListKbRef = useRef<HTMLDivElement | null>(null);
  const userPickInputRef = useRef<HTMLInputElement | null>(null);
  const membersKbRef = useRef<HTMLDivElement | null>(null);

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
        ur.items.map((u) => {
          const cbName = u.createdByName ?? null;
          const ubName = u.updatedByName ?? null;
          const whSummary = (u.warehouseSummary ?? '').trim();
          const whLegacy = formatWarehouseLabel(u.warehouseCode, u.warehouseName);
          return {
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            jobTitle: u.jobTitle ?? '—',
            warehouseLabel: whSummary || (whLegacy !== '\u2014' ? whLegacy : '\u2014'),
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
        }),
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
    const filtered = !k
      ? ms
      : ms.filter((row) => {
          const u = userById.get(row.userId);
          if (!u) return false;
          const blob = `${u.username} ${u.displayName}`.toLowerCase();
          return blob.includes(k);
        });
    const accountKey = (row: (typeof ms)[number]) => {
      const u = userById.get(row.userId);
      return (u?.username ?? row.userId).toLowerCase();
    };
    return [...filtered].sort((a, b) =>
      accountKey(a).localeCompare(accountKey(b), 'zh-Hant', { numeric: true, sensitivity: 'base' }),
    );
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

  useEffect(() => {
    setMemberFocusIdx((i) => {
      if (memberRowsForDisplay.length === 0) return -1;
      if (i < 0) return i;
      return Math.min(i, memberRowsForDisplay.length - 1);
    });
  }, [memberRowsForDisplay.length]);

  const onSelectRole = useCallback((r: BaseRoleRow) => {
    setSelectedId(r.id);
    setUserQuery('');
    setUserOpen(false);
    setMemberSearch('');
    setMemberFocusIdx(-1);
  }, []);

  const assignUser = async (userId: string) => {
    if (!selectedId) return;
    setUserQuery('');
    setUserOpen(false);
    setLoadError(null);
    try {
      await assignUserRole({
        userId,
        roleId: selectedId,
        isPrimary: false,
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

  const focusRoleListKb = useCallback(() => {
    requestAnimationFrame(() => roleListKbRef.current?.focus({ preventScroll: true }));
  }, []);

  const onRoleListKeyDownCapture = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredRoles.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        const idx = filteredRoles.findIndex((r) => r.id === selectedId);
        const pos = idx < 0 ? -1 : idx;
        const ni = Math.min(filteredRoles.length - 1, pos + 1);
        const next = filteredRoles[ni];
        if (next) onSelectRole(next);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        const idx = filteredRoles.findIndex((r) => r.id === selectedId);
        const pos = idx < 0 ? 0 : idx;
        const ni = Math.max(0, pos - 1);
        const next = filteredRoles[ni];
        if (next) onSelectRole(next);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        userPickInputRef.current?.focus();
        setUserOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        const onSubPage = pathname != null && pathname.startsWith('/base/');
        if (onSubPage) {
          e.preventDefault();
          e.stopPropagation();
          router.push('/base');
        }
      }
    },
    [filteredRoles, selectedId, pathname, router, onSelectRole],
  );

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
                <h2 className="mt-1 text-sm font-semibold text-foreground">職務列表</h2>
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
            <div
              ref={roleListKbRef}
              tabIndex={0}
              role="listbox"
              aria-label="職務列表，方向鍵選擇，Enter 進入右側使用者搜尋"
              className="min-h-[200px] space-y-2 rounded-md pb-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              onKeyDownCapture={onRoleListKeyDownCapture}
            >
              {filteredRoles.map((r) => {
                const active = selectedId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={active}
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
            <h2 className="mt-1 text-sm font-semibold text-foreground">隸屬使用者</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedRole ? (
                <span className="text-foreground/90">
                  {selectedRole.name} <span className="text-muted-foreground">（{selectedRole.code}）</span>
                </span>
              ) : (
                '請從左側選擇職務。'
              )}
            </p>
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
                  inputRef={userPickInputRef}
                  inputClassName={lookupInputCls}
                  panelClassName={lookupPanelCls}
                  panelArrowNavigation
                  escapePanelOnlyFirst
                  onEscapePanelAlreadyClosed={focusRoleListKb}
                  onEnterWhenEmptyQuery={() => {
                    setMemberFocusIdx(memberRowsForDisplay.length > 0 ? 0 : -1);
                    requestAnimationFrame(() => membersKbRef.current?.focus({ preventScroll: true }));
                  }}
                  renderOption={(u) => (
                    <>
                      <div>
                        <div className="font-semibold text-foreground">{u.username}</div>
                        <div className="text-xs text-muted-foreground">{u.displayName}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{u.isActive ? '啟用' : '停用'}</div>
                    </>
                  )}
                  onPick={(u) => void assignUser(u.id)}
                />
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="篩選名單內成員（帳號／姓名）"
                  className="h-8 max-w-xs flex-1 text-sm"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setMemberSearch('');
                  }}
                />
                <span className="text-xs tabular-nums text-muted-foreground">共 {memberRowsForDisplay.length} 人</span>
              </div>

              <ScrollArea className="min-h-0 flex-1 pr-2">
                <div
                  ref={membersKbRef}
                  tabIndex={0}
                  role="region"
                  aria-label="已匯入成員，方向鍵選擇，Delete 移除，Escape 回到職務列表"
                  className={cn(
                    'min-h-[140px] overflow-hidden rounded-lg border border-border/70 outline-none',
                    'bg-black/[0.2] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]',
                    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35',
                  )}
                  onKeyDown={(e) => {
                    if (memberRowsForDisplay.length === 0) {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        focusRoleListKb();
                      }
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      focusRoleListKb();
                      return;
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setMemberFocusIdx((i) => {
                        const base = i < 0 ? -1 : i;
                        return Math.min(memberRowsForDisplay.length - 1, base + 1);
                      });
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setMemberFocusIdx((i) => {
                        if (i <= 0) {
                          userPickInputRef.current?.focus();
                          return -1;
                        }
                        return i - 1;
                      });
                      return;
                    }
                    if (e.key === 'Delete') {
                      e.preventDefault();
                      if (memberFocusIdx >= 0 && memberFocusIdx < memberRowsForDisplay.length) {
                        const row = memberRowsForDisplay[memberFocusIdx];
                        if (row) void removeMember(row.id);
                      }
                    }
                  }}
                >
                  {memberRowsForDisplay.length > 0 ? (
                    <>
                      <div
                        className="grid grid-cols-[minmax(5.5rem,26%)_1fr_auto] gap-2 border-b border-border/50 bg-muted/25 px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground"
                        aria-hidden
                      >
                        <span>帳號</span>
                        <span>姓名</span>
                        <span className="w-9 text-center"> </span>
                      </div>
                      <ul className="m-0 list-none divide-y divide-border/40 p-0">
                        {memberRowsForDisplay.map((row, idx) => {
                          const u = userById.get(row.userId);
                          const hi = memberFocusIdx === idx;
                          return (
                            <li key={row.id} data-ur-member-chip>
                              <div
                                className={cn(
                                  'grid grid-cols-[minmax(5.5rem,26%)_1fr_auto] items-center gap-2 px-3 py-2 text-sm transition-colors',
                                  'hover:bg-white/[0.04]',
                                  hi
                                    ? 'border-l-[3px] border-l-primary bg-primary/10 pl-[calc(0.75rem-3px)]'
                                    : 'border-l-[3px] border-l-transparent',
                                )}
                              >
                                <span className="truncate font-mono text-xs text-muted-foreground tabular-nums">
                                  {u?.username ?? row.userId}
                                </span>
                                <span className="min-w-0 truncate text-foreground">{u?.displayName ?? '—'}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                                  aria-label={u ? `移除 ${u.username}` : '移除成員'}
                                  title="移除"
                                  onClick={() => removeMember(row.id)}
                                >
                                  <X className="size-4" aria-hidden />
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : (
                    <div className="flex min-h-[120px] items-center justify-center px-4 py-6 text-center text-sm text-muted-foreground">
                      尚無成員，請於上方搜尋並加入使用者。
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
