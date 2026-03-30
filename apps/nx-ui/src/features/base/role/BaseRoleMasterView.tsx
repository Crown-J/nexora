/**
 * File: apps/nx-ui/src/features/base/role/BaseRoleMasterView.tsx
 *
 * Purpose:
 * - 職務主檔：連線 /role、/user、/user-role
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { LookupAutocomplete } from '@/shared/ui/lookup/LookupAutocomplete';
import { cn } from '@/lib/utils';
import type { BaseUserRow } from '@/features/base/users/mock-data';
import { assignUserRole, listUserRoles, revokeUserRole, setUserRolePrimary } from '@/features/base/api/user-role';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { getFieldIdFromEventTarget, handleMasterFieldKeyDown } from '@/features/base/keyboard/masterFieldNav';
import { createRole, listRoles, updateRole, type RoleDto } from '@/features/base/api/role';
import { listUsers } from '@/features/base/api/user';
import type { BaseRoleMemberRow, BaseRoleRow } from './mock-data';

function roleDtoToRow(r: RoleDto): BaseRoleRow {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? '',
    sortOrder: r.sortNo,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

type DetailDraft = {
  code: string;
  name: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

function emptyDraft(): DetailDraft {
  return {
    code: '',
    name: '',
    description: '',
    sortOrder: '100',
    isActive: true,
  };
}

function draftFromRole(r: BaseRoleRow): DetailDraft {
  return {
    code: r.code,
    name: r.name,
    description: r.description,
    sortOrder: String(r.sortOrder),
    isActive: r.isActive,
  };
}

export function BaseRoleMasterView() {
  const [roles, setRoles] = useState<BaseRoleRow[]>([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [detailDraft, setDetailDraft] = useState<DetailDraft>(() => emptyDraft());
  const [baselineDetail, setBaselineDetail] = useState<DetailDraft>(() => emptyDraft());

  const [membersByRole, setMembersByRole] = useState<Record<string, BaseRoleMemberRow[]>>({});
  const [baselineMembers, setBaselineMembers] = useState<BaseRoleMemberRow[]>([]);

  const [pickerUsers, setPickerUsers] = useState<BaseUserRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  const ROLE_FIELD_ORDER: readonly string[] = ['br-code', 'br-name', 'br-sort', 'br-desc', 'br-active'];

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

  const loadMembers = useCallback(async (roleId: string, syncBaseline: boolean) => {
    const res = await listUserRoles({ roleId, isActive: true, page: 1, pageSize: 500 });
    const list: BaseRoleMemberRow[] = res.items.map((x) => ({
      id: x.id,
      userId: x.userId,
      isPrimary: x.isPrimary,
    }));
    setMembersByRole((prev) => ({ ...prev, [roleId]: list }));
    if (syncBaseline) setBaselineMembers(list.map((m) => ({ ...m })));
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

  const selectedRoleIndex = useMemo(
    () => (selectedId ? filteredRoles.findIndex((r) => r.id === selectedId) : -1),
    [filteredRoles, selectedId],
  );

  const currentMembers = useMemo(() => {
    if (creating || !selectedId) return [];
    return membersByRole[selectedId] ?? [];
  }, [creating, membersByRole, selectedId]);

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
    return pickerUsers.filter((u) => {
      if (!u.isActive) return false;
      if (assignedUserIds.has(u.id)) return false;
      if (!q) return true;
      const blob = `${u.username} ${u.displayName} ${u.email}`.toLowerCase();
      return blob.includes(q);
    }).slice(0, 12);
  }, [assignedUserIds, userQuery, pickerUsers]);

  const detailDirty = useMemo(() => {
    if (creating) {
      return (
        detailDraft.code.trim() !== '' ||
        detailDraft.name.trim() !== '' ||
        detailDraft.description.trim() !== '' ||
        detailDraft.sortOrder !== '100' ||
        !detailDraft.isActive
      );
    }
    return JSON.stringify(detailDraft) !== JSON.stringify(baselineDetail);
  }, [baselineDetail, creating, detailDraft]);

  const dirty = detailDirty;

  const onSelectRole = (r: BaseRoleRow) => {
    setCreating(false);
    setSelectedId(r.id);
    setUserQuery('');
    setUserOpen(false);
    setMemberSearch('');
    const d = draftFromRole(r);
    setDetailDraft(d);
    setBaselineDetail(d);
  };

  useEffect(() => {
    if (!selectedId || creating) return;
    void loadMembers(selectedId, true);
  }, [selectedId, creating, loadMembers]);

  const onAddRole = () => {
    setCreating(true);
    setSelectedId(null);
    setUserQuery('');
    setUserOpen(false);
    setMemberSearch('');
    setDetailDraft(emptyDraft());
    setBaselineDetail(emptyDraft());
    setBaselineMembers([]);
  };

  const onReset = () => {
    if (creating) {
      setDetailDraft(emptyDraft());
      return;
    }
    if (selectedRole) {
      setDetailDraft({ ...baselineDetail });
      setMembersByRole((prev) => ({
        ...prev,
        [selectedRole.id]: baselineMembers.map((m) => ({ ...m })),
      }));
    }
  };

  const performSave = async () => {
    const code = detailDraft.code.trim().toUpperCase();
    const name = detailDraft.name.trim();
    if (!code || !name) return;
    const sort = Number.parseInt(detailDraft.sortOrder, 10);
    const sortOrder = Number.isFinite(sort) ? sort : 0;
    setSaving(true);
    setLoadError(null);
    try {
      if (creating) {
        const dto = await createRole({
          code,
          name,
          description: detailDraft.description.trim() || null,
          isSystem: false,
          isActive: detailDraft.isActive,
          sortNo: sortOrder,
        });
        const row = roleDtoToRow(dto);
        setRoles((prev) => [...prev, row].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)));
        setCreating(false);
        setSelectedId(row.id);
        setDetailDraft(draftFromRole(row));
        setBaselineDetail(draftFromRole(row));
        setBaselineMembers([]);
        return;
      }

      if (!selectedId || !selectedRole) return;
      const dto = await updateRole(selectedId, {
        code,
        name,
        description: detailDraft.description.trim() || null,
        isActive: detailDraft.isActive,
        sortNo: sortOrder,
      });
      const row = roleDtoToRow(dto);
      setRoles((prev) => prev.map((r) => (r.id === selectedId ? row : r)));
      setBaselineDetail({ ...detailDraft });
      await loadMembers(selectedId, true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const focusRoleRow = (index: number) => {
    requestAnimationFrame(() => {
      (document.querySelector(`[data-role-master-row="${index}"]`) as HTMLElement | null)?.focus();
    });
  };

  const selectRoleAtFilteredIndex = (idx: number) => {
    const r = filteredRoles[idx];
    if (!r) return;
    onSelectRole(r);
  };

  const assignUser = async (userId: string) => {
    if (creating || !selectedId) return;
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
      await loadMembers(selectedId, true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '指派失敗');
    }
  };

  const removeMember = async (memberId: string) => {
    if (creating || !selectedId) return;
    setLoadError(null);
    try {
      await revokeUserRole(memberId);
      await loadMembers(selectedId, true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '移除失敗');
    }
  };

  const togglePrimary = async (memberId: string) => {
    if (creating || !selectedId) return;
    const raw = [...(membersByRole[selectedId] ?? [])];
    const target = raw.find((m) => m.id === memberId);
    if (!target) return;
    const nextPrimary = !target.isPrimary;
    setLoadError(null);
    try {
      await setUserRolePrimary(memberId, nextPrimary);
      await loadMembers(selectedId, true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '更新失敗');
    }
  };

  const leftTitle = selectedRole && !creating ? `職務列表（已選：${selectedRole.name}）` : '職務列表';

  const lookupInputCls =
    'border-border bg-background/80 text-foreground placeholder:text-muted-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';
  const lookupPanelCls =
    'border-border bg-popover/95 text-popover-foreground backdrop-blur-md shadow-lg top-[42px]';

  return (
    <>
    <div className="space-y-4">
      {loadError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-stretch">
      <section className="glass-card flex max-h-[min(720px,calc(100vh-220px))] min-h-[420px] flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs tracking-[0.35em] text-muted-foreground">ROLES</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">{leftTitle}</h2>
          </div>
          <Button type="button" size="sm" className="shrink-0 gap-1" onClick={onAddRole}>
            <Plus className="size-4" aria-hidden />
            新增
          </Button>
        </div>
        <Input
          id="role-search"
          value={roleSearch}
          onChange={(e) => setRoleSearch(e.target.value)}
          placeholder="搜尋職務（代碼／名稱）"
          className="mb-3"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setRoleSearch('');
            if (saveConfirmOpen) return;
            if (e.key === 'ArrowDown' && filteredRoles.length > 0) {
              e.preventDefault();
              selectRoleAtFilteredIndex(0);
              focusRoleRow(0);
            }
            if (e.key === 'ArrowRight' && (creating || selectedRole)) {
              e.preventDefault();
              document.getElementById('br-code')?.focus();
            }
          }}
        />
        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="space-y-2 pb-1">
            {filteredRoles.map((r, i) => {
              const active = !creating && selectedId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  tabIndex={-1}
                  data-role-master-row={i}
                  onClick={() => onSelectRole(r)}
                  onKeyDown={(e) => {
                    if (saveConfirmOpen) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (i < filteredRoles.length - 1) {
                        selectRoleAtFilteredIndex(i + 1);
                        focusRoleRow(i + 1);
                      } else if (creating || selectedRole) {
                        document.getElementById('br-code')?.focus();
                      }
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (i > 0) {
                        selectRoleAtFilteredIndex(i - 1);
                        focusRoleRow(i - 1);
                      } else {
                        document.getElementById('role-search')?.focus();
                      }
                    }
                    if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      if (creating || selectedRole) document.getElementById('br-code')?.focus();
                    }
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      document.getElementById('role-search')?.focus();
                    }
                  }}
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
                無符合的職務。可點「新增」建立一筆。
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </section>

      <div className="flex min-h-[min(720px,calc(100vh-220px))] min-h-0 flex-col gap-4">
        <section className="glass-card flex shrink-0 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
              <h2 className="mt-1 text-sm font-semibold text-foreground">
                {creating ? '新增職務 — 詳細資訊' : selectedRole ? `職務詳細 — ${selectedRole.name}` : '職務詳細資訊'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={onReset} disabled={!creating && !selectedRole}>
                還原
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (creating ? !detailDraft.code.trim() || !detailDraft.name.trim() : !selectedRole || !dirty)
                    return;
                  setSaveConfirmOpen(true);
                }}
                disabled={
                  creating
                    ? !detailDraft.code.trim() || !detailDraft.name.trim()
                    : !selectedRole || !dirty
                }
              >
                儲存
              </Button>
            </div>
          </div>

          {!creating && !selectedRole ? (
            <p className="text-sm text-muted-foreground">請從左側選擇職務，或點「新增」。</p>
          ) : (
            <div
              className="grid gap-4 sm:grid-cols-2"
              onKeyDownCapture={(e) => {
                if (saveConfirmOpen) return;
                const id = getFieldIdFromEventTarget(e.target);
                if (e.key === 'ArrowLeft' && id === 'br-code') {
                  e.preventDefault();
                  if (selectedRoleIndex >= 0) focusRoleRow(selectedRoleIndex);
                  else document.getElementById('role-search')?.focus();
                  return;
                }
                handleMasterFieldKeyDown(e, ROLE_FIELD_ORDER, {
                  enabled: true,
                  onLastField: () => setSaveConfirmOpen(true),
                  multilineFieldIds: new Set(['br-desc']),
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="br-code">代碼</Label>
                <Input
                  id="br-code"
                  value={detailDraft.code}
                  onChange={(e) => setDetailDraft((d) => ({ ...d, code: e.target.value }))}
                  placeholder="例：ADMIN"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="br-name">名稱</Label>
                <Input
                  id="br-name"
                  value={detailDraft.name}
                  onChange={(e) => setDetailDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="職務顯示名稱"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="br-sort">排序</Label>
                <Input
                  id="br-sort"
                  inputMode="numeric"
                  value={detailDraft.sortOrder}
                  onChange={(e) => setDetailDraft((d) => ({ ...d, sortOrder: e.target.value }))}
                  placeholder="數字越小越前面"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="br-desc">說明</Label>
                <Textarea
                  id="br-desc"
                  value={detailDraft.description}
                  onChange={(e) => setDetailDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="職務職責摘要（選填）"
                  rows={3}
                  className="min-h-[88px] resize-y"
                />
              </div>
              <div className="flex items-end gap-2 pb-2 sm:col-span-2">
                <label htmlFor="br-active" className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    id="br-active"
                    type="checkbox"
                    className="size-4 rounded border border-input accent-primary"
                    checked={detailDraft.isActive}
                    onChange={(e) => setDetailDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  />
                  啟用
                </label>
              </div>
            </div>
          )}
        </section>

        <section className="glass-card flex min-h-[280px] flex-1 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="mb-3 border-b border-border/60 pb-3">
            <p className="text-xs tracking-[0.35em] text-muted-foreground">MEMBERS</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">匯入使用者</h2>
            <p className="mt-1 text-xs text-muted-foreground">由使用者主檔（啟用中）選入，即時寫入 nx00_user_role。</p>
          </div>

          {creating || !selectedId ? (
            <p className="text-sm text-muted-foreground">請先建立或選取職務後，再指派使用者。</p>
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
    </div>
    <MasterSaveConfirmDialog
      open={saveConfirmOpen}
      onOpenChange={setSaveConfirmOpen}
      onConfirm={() => void performSave()}
    />
    </>
  );
}
