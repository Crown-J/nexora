/**
 * File: apps/nx-ui/src/features/nx00/user-role/ui/UserRoleGroupView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-ROLE-GROUP-VIEW-001：UserRole Group View（左 Role 群組 / 右 Members）
 *
 * Notes:
 * - Split Shell：shared/ui/group/GroupSplitShell
 * - Left Panel：shared/ui/group/GroupListPanel
 * - Right Panel：GroupPanelShell + LookupAutocomplete + MemberChipsPanel
 */

'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';

import { GroupSplitShell } from '@/shared/ui/group/GroupSplitShell';
import { GroupPanelShell } from '@/shared/ui/group/GroupPanelShell';
import { GroupListPanel } from '@/shared/ui/group/GroupListPanel';
import { LookupAutocomplete } from '@/shared/ui/lookup/LookupAutocomplete';
import { MemberChipsPanel } from '@/shared/ui/group/MemberChipsPanel';

import { useUserRoleGroup } from '@/features/nx00/user-role/hooks/useUserRoleGroup';
import type { UserLiteDto, UserRoleDto } from '@/features/nx00/user-role/types';

function renderRoleLabel(code: string, name: string) {
    const c = code?.trim();
    const n = name?.trim();
    if (c && n) return `${c} ${n}`;
    return (c || n || '-').trim();
}

function renderUserLabel(username: string, displayName?: string | null) {
    const dn = displayName ? `（${displayName}）` : '';
    return `${username}${dn}`;
}

function pickMemberLabel(ur: UserRoleDto, fallback: (ur: UserRoleDto) => string) {
    const u = ur.user;
    if (u) return renderUserLabel(u.username, u.displayName);
    return fallback(ur);
}

export function UserRoleGroupView() {
    const vm = useUserRoleGroup();

    const leftTitle = useMemo(() => {
        if (!vm.selectedRole) return '權限角色列表';
        return `權限角色列表（已選：${vm.selectedRole.name}）`;
    }, [vm.selectedRole]);

    const rightTitle = useMemo(() => {
        if (!vm.selectedRole) return '使用者列表';
        return `使用者列表（${vm.selectedRole.name}）`;
    }, [vm.selectedRole]);

    const rightActions = (
        <>
            <button
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10 disabled:opacity-40"
                onClick={() => vm.actions.clearRole()}
                disabled={vm.saving}
                title="清除選取"
            >
                Reset
            </button>

            <button
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-40"
                disabled
                title="此頁為即時寫入（assign/revoke 即時生效）"
            >
                Save
            </button>
        </>
    );

    const leftPanel = (
        <GroupListPanel
            title={leftTitle}
            className="w-[360px]"
            searchValue={vm.roleSearch}
            onSearchChange={vm.actions.setRoleSearch}
            searchPlaceholder="搜尋角色（code / name）"
            loading={vm.rolesLoading}
            error={vm.rolesError}
            emptyText="無角色資料"
            items={vm.roles}
            getKey={(r) => r.id}
            isActive={(r) => vm.roleId === r.id}
            onSelect={(r) => vm.actions.selectRole(r.id)}
            renderItem={(r) => (
                <>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-white/50">{r.code}</div>
                </>
            )}
        />
    );

    const rightPanel = (
        <GroupPanelShell title={rightTitle} actions={rightActions}>
            {!vm.selectedRole && (
                <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                    請先從左側選擇一個角色，右側才會顯示該角色的使用者成員。
                </div>
            )}

            {vm.selectedRole && (
                <>
                    <div className="mb-3">
                        <LookupAutocomplete<UserLiteDto>
                            value={vm.userQuery}
                            onChange={vm.setUserQuery}
                            options={vm.userOptions}
                            open={vm.userOptionsOpen}
                            onOpenChange={vm.setUserOptionsOpen}
                            loading={vm.userOptionsLoading}
                            disabled={vm.saving}
                            placeholder="Search users...（username / displayName）"
                            emptyText="沒有符合的使用者"
                            getKey={(u) => u.id}
                            renderOption={(u) => (
                                <>
                                    <div>
                                        <div className="font-semibold">{renderUserLabel(u.username, u.displayName)}</div>
                                        <div className="text-xs text-white/45">{u.email ?? ''}</div>
                                    </div>
                                    <div className="text-xs text-white/45">{u.isActive ? 'ACTIVE' : 'INACTIVE'}</div>
                                </>
                            )}
                            onPick={(u) => vm.actions.assignUser(u.id)}
                        />
                    </div>

                    <div className="mb-2 flex items-center justify-between gap-3">
                        <input
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                            placeholder="在 Members 內搜尋（username / displayName）"
                            value={vm.memberSearch}
                            onChange={(e) => vm.actions.setMemberSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') vm.actions.setMemberSearch('');
                            }}
                            disabled={vm.saving}
                        />
                        <div className="text-xs text-white/60">Total: {vm.members.length}</div>
                    </div>

                    {vm.saveError && <div className="mb-2 text-xs text-red-300">{vm.saveError}</div>}
                    {vm.membersError && <div className="mb-2 text-xs text-red-300">{vm.membersError}</div>}
                    {vm.membersLoading && <div className="mb-2 text-xs text-white/60">載入中...</div>}

                    <MemberChipsPanel<UserRoleDto>
                        items={vm.members}
                        loading={vm.membersLoading}
                        emptyText="尚無成員。你可以用上方搜尋框新增使用者。"
                        disabled={vm.saving}
                        getKey={(ur) => ur.id}
                        getLabel={(ur) => pickMemberLabel(ur, vm.pickUserLabel)}
                        isPrimary={(ur) => ur.isPrimary}
                        onTogglePrimary={(ur) => vm.actions.setPrimary(ur.id, !ur.isPrimary)}
                        onRemove={(ur) => vm.actions.revoke(ur.id)}
                    />
                </>
            )}
        </GroupPanelShell>
    );

    return (
        <>
            <PageHeader title="使用者權限設定" />
            <GroupSplitShell left={leftPanel} right={rightPanel} leftWidthClassName="w-[360px]" />
        </>
    );
}