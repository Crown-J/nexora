/**
 * File: apps/nx-ui/src/features/nx00/user-role/hooks/useUserRoleGroup.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-ROLE-GROUP-HOOK-001：UserRole Group Orchestrator
 *
 * Notes:
 * - URL 只管 roleId（群組選取）
 * - 左：roles（重用 role list API）
 * - 右：members（listUserRole by roleId）
 * - 右側搜尋 users：searchUsers → assignUserRole
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { listRole } from '@/features/nx00/role/api/role';
import type { RoleDto } from '@/features/nx00/role/types';

import {
    assignUserRole,
    listUserRole,
    revokeUserRole,
    searchUsers,
    setUserRolePrimary,
} from '@/features/nx00/user-role/api/user-role';

import type { UserLiteDto, UserRoleDto } from '@/features/nx00/user-role/types';

function safeText(v: any) {
    if (v === null || v === undefined || v === '') return '-';
    return String(v);
}

function pickUserLabel(ur: UserRoleDto) {
    const u = ur.user;
    if (u) {
        const dn = u.displayName ? `（${u.displayName}）` : '';
        return `${u.username}${dn}`;
    }
    // fallback：若後端沒 join
    return safeText(ur.userId);
}

export function useUserRoleGroup() {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();

    // URL state
    const roleId = sp.get('roleId') ?? '';

    const setQuery = useCallback(
        (patch: Record<string, string | null | undefined>) => {
            const next = new URLSearchParams(sp.toString());
            Object.entries(patch).forEach(([k, v]) => {
                if (v === null || v === undefined || v === '') next.delete(k);
                else next.set(k, String(v));
            });
            const qs = next.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
        },
        [sp, router, pathname],
    );

    // ===== left roles =====
    const [roles, setRoles] = useState<RoleDto[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [rolesError, setRolesError] = useState<string | null>(null);
    const [roleSearch, setRoleSearch] = useState('');

    useEffect(() => {
        let alive = true;
        setRolesLoading(true);
        setRolesError(null);

        listRole({ q: roleSearch.trim() ? roleSearch.trim() : undefined, page: 1, pageSize: 200 })
            .then((res) => {
                if (!alive) return;
                setRoles(res.items ?? []);
            })
            .catch((e: any) => {
                if (!alive) return;
                setRolesError(e?.message ?? '角色載入失敗');
            })
            .finally(() => {
                if (!alive) return;
                setRolesLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [roleSearch]);

    const selectedRole = useMemo(() => roles.find((r) => r.id === roleId) ?? null, [roles, roleId]);

    // ===== right members =====
    const [members, setMembers] = useState<UserRoleDto[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);
    const [memberSearch, setMemberSearch] = useState('');

    const reloadMembers = useCallback(() => {
        if (!roleId) {
            setMembers([]);
            setMembersError(null);
            setMembersLoading(false);
            return;
        }

        let alive = true;
        setMembersLoading(true);
        setMembersError(null);

        listUserRole({ roleId, isActive: true, page: 1, pageSize: 200 })
            .then((res) => {
                if (!alive) return;
                // 前端搜尋 memberSearch（避免後端沒提供 q）
                const raw = res.items ?? [];
                const q = memberSearch.trim().toLowerCase();
                if (!q) {
                    setMembers(raw);
                } else {
                    setMembers(
                        raw.filter((ur) => pickUserLabel(ur).toLowerCase().includes(q)),
                    );
                }
            })
            .catch((e: any) => {
                if (!alive) return;
                setMembersError(e?.message ?? '成員載入失敗');
            })
            .finally(() => {
                if (!alive) return;
                setMembersLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [roleId, memberSearch]);

    useEffect(() => {
        const cleanup = reloadMembers();
        return () => {
            if (typeof cleanup === 'function') cleanup();
        };
    }, [reloadMembers]);

    // ===== user search candidates (autocomplete) =====
    const [userQuery, setUserQuery] = useState('');
    const [userOptions, setUserOptions] = useState<UserLiteDto[]>([]);
    const [userOptionsOpen, setUserOptionsOpen] = useState(false);
    const [userOptionsLoading, setUserOptionsLoading] = useState(false);

    useEffect(() => {
        let alive = true;

        const q = userQuery.trim();
        if (!q) {
            setUserOptions([]);
            setUserOptionsOpen(false);
            setUserOptionsLoading(false);
            return;
        }

        setUserOptionsLoading(true);
        const t = setTimeout(() => {
            searchUsers(q)
                .then((rows) => {
                    if (!alive) return;
                    setUserOptions(rows ?? []);
                    setUserOptionsOpen(true);
                })
                .catch(() => {
                    if (!alive) return;
                    setUserOptions([]);
                    setUserOptionsOpen(true);
                })
                .finally(() => {
                    if (!alive) return;
                    setUserOptionsLoading(false);
                });
        }, 250);

        return () => {
            alive = false;
            clearTimeout(t);
        };
    }, [userQuery]);

    // ===== actions =====
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const actions = useMemo(
        () => ({
            selectRole: (id: string) => setQuery({ roleId: id }),
            clearRole: () => setQuery({ roleId: null }),

            setRoleSearch: (q: string) => setRoleSearch(q),
            setMemberSearch: (q: string) => setMemberSearch(q),

            assignUser: async (userId: string) => {
                if (!roleId) return;

                setSaving(true);
                setSaveError(null);
                try {
                    await assignUserRole({ userId, roleId });
                    setUserQuery('');
                    setUserOptions([]);
                    setUserOptionsOpen(false);
                    reloadMembers();
                } catch (e: any) {
                    setSaveError(e?.message ?? '指派失敗');
                } finally {
                    setSaving(false);
                }
            },

            revoke: async (userRoleId: string) => {
                setSaving(true);
                setSaveError(null);
                try {
                    await revokeUserRole(userRoleId, {});
                    reloadMembers();
                } catch (e: any) {
                    setSaveError(e?.message ?? '撤銷失敗');
                } finally {
                    setSaving(false);
                }
            },

            setPrimary: async (userRoleId: string, isPrimary: boolean) => {
                setSaving(true);
                setSaveError(null);
                try {
                    await setUserRolePrimary(userRoleId, { isPrimary });
                    reloadMembers();
                } catch (e: any) {
                    setSaveError(e?.message ?? '設定主角色失敗');
                } finally {
                    setSaving(false);
                }
            },
        }),
        [roleId, reloadMembers, setQuery],
    );

    return {
        roleId,
        selectedRole,

        roles,
        rolesLoading,
        rolesError,
        roleSearch,

        members,
        membersLoading,
        membersError,
        memberSearch,

        userQuery,
        setUserQuery,
        userOptions,
        userOptionsOpen,
        setUserOptionsOpen,
        userOptionsLoading,

        saving,
        saveError,

        pickUserLabel,
        actions,
    };
}