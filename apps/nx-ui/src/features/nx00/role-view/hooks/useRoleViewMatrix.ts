/**
 * File: apps/nx-ui/src/features/nx00/role-view/hooks/useRoleViewMatrix.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLE-VIEW-MATRIX-HOOK-001：RoleView Matrix Orchestrator（本地暫存 + Save）
 *
 * Notes:
 * - 左側選角色；右側載入所有 View + 該角色已授權 RoleView
 * - 使用者勾選後只改 draft；按 Save 時拆成 grant/updatePerms/revoke 呼叫
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listRole } from '@/features/nx00/role/api/role';
import type { RoleDto } from '@/features/nx00/role/types';

import { listRoleView, listView, grantRoleView, revokeRoleView, updateRoleViewPerms } from '@/features/nx00/role-view/api/role-view';
import type { PermKey, Perms, RoleViewDraftRow, RoleViewDto, SaveOp, ViewDto } from '@/features/nx00/role-view/types';

const PERM_KEYS: PermKey[] = ['canRead', 'canCreate', 'canUpdate', 'canDelete', 'canExport'];

function permsEqual(a: Perms, b: Perms) {
    return PERM_KEYS.every((k) => Boolean(a[k]) === Boolean(b[k]));
}

function normalizePerms(p?: Partial<Perms> | null): Perms {
    return {
        canRead: Boolean(p?.canRead ?? true),
        canCreate: Boolean(p?.canCreate ?? false),
        canUpdate: Boolean(p?.canUpdate ?? false),
        canDelete: Boolean(p?.canDelete ?? false),
        canExport: Boolean(p?.canExport ?? false),
    };
}

function buildRow(view: ViewDto, rv?: RoleViewDto | null): RoleViewDraftRow {
    const has = Boolean(rv?.id);
    return {
        view,
        recordId: has ? String(rv!.id) : null,
        isActive: has ? Boolean(rv!.isActive) : false, // 未授權 = false
        perms: has ? normalizePerms(rv) : normalizePerms(null),
    };
}

export function useRoleViewMatrix() {
    // ===== left: roles =====
    const [roleSearch, setRoleSearch] = useState('');
    const [roles, setRoles] = useState<RoleDto[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [rolesError, setRolesError] = useState<string | null>(null);

    const [roleId, setRoleId] = useState<string>('');

    useEffect(() => {
        let alive = true;
        setRolesLoading(true);
        setRolesError(null);

        listRole({ q: roleSearch?.trim() ? roleSearch.trim() : undefined, page: 1, pageSize: 200 })
            .then((res) => {
                if (!alive) return;
                setRoles(res.items ?? []);
            })
            .catch((e: any) => {
                if (!alive) return;
                setRolesError(e?.message ?? '載入失敗');
            })
            .finally(() => {
                if (!alive) return;
                setRolesLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [roleSearch]);

    const selectedRole: RoleDto | null = useMemo(() => roles.find((r) => r.id === roleId) ?? null, [roles, roleId]);

    // ===== right: matrix data =====
    const [views, setViews] = useState<ViewDto[]>([]);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewError, setViewError] = useState<string | null>(null);

    const [roleViews, setRoleViews] = useState<RoleViewDto[]>([]);
    const [roleViewLoading, setRoleViewLoading] = useState(false);
    const [roleViewError, setRoleViewError] = useState<string | null>(null);

    // local draft
    const [draft, setDraft] = useState<Record<string, RoleViewDraftRow>>({});
    const [baseline, setBaseline] = useState<Record<string, RoleViewDraftRow>>({}); // 用來比對差異

    // module expand/collapse + filter
    const [moduleOpen, setModuleOpen] = useState<Record<string, boolean>>({});
    const [moduleFilter, setModuleFilter] = useState<string>(''); // 可選：只看某 module

    // loading all views once
    useEffect(() => {
        let alive = true;
        setViewLoading(true);
        setViewError(null);

        listView()
            .then((res) => {
                if (!alive) return;

                const items = res?.items ?? [];
                const sorted = items.slice().sort((a, b) => {
                    const mc = String(a.moduleCode ?? '').localeCompare(String(b.moduleCode ?? ''), 'zh-Hant');
                    if (mc !== 0) return mc;
                    const sn = (a.sortNo ?? 0) - (b.sortNo ?? 0);
                    if (sn !== 0) return sn;
                    return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'zh-Hant');
                });

                setViews(sorted);
            })
            .catch((e: any) => {
                if (!alive) return;
                setViewError(e?.message ?? '載入失敗');
            })
            .finally(() => {
                if (!alive) return;
                setViewLoading(false);
            });

        return () => {
            alive = false;
        };
    }, []);

    // load role-views when roleId changes
    useEffect(() => {
        let alive = true;

        if (!roleId) {
            setRoleViews([]);
            setRoleViewError(null);
            setRoleViewLoading(false);
            setDraft({});
            setBaseline({});
            return;
        }

        setRoleViewLoading(true);
        setRoleViewError(null);

        listRoleView({ roleId, page: 1, pageSize: 1000 })
            .then((res) => {
                if (!alive) return;
                setRoleViews(res.items ?? []);
            })
            .catch((e: any) => {
                if (!alive) return;
                setRoleViewError(e?.message ?? '載入失敗');
            })
            .finally(() => {
                if (!alive) return;
                setRoleViewLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [roleId]);

    // build draft/baseline from (views + roleViews)
    useEffect(() => {
        if (!roleId) return;
        if (views.length === 0) return;

        const mapRvByViewId = new Map<string, RoleViewDto>();
        roleViews.forEach((rv) => mapRvByViewId.set(rv.viewId, rv));

        const next: Record<string, RoleViewDraftRow> = {};
        views.forEach((v) => {
            const rv = mapRvByViewId.get(v.id) ?? null;
            next[v.id] = buildRow(v, rv);
        });

        setDraft(next);

        // baseline：做一層 clone，避免未來誤改參考
        const base: Record<string, RoleViewDraftRow> = {};
        Object.keys(next).forEach((k) => {
            const r = next[k];
            base[k] = { ...r, perms: { ...r.perms } };
        });
        setBaseline(base);

        // init module open default
        const mods = Array.from(new Set(views.map((v) => v.moduleCode)));
        const openInit: Record<string, boolean> = {};
        mods.forEach((m) => (openInit[m] = true));
        setModuleOpen(openInit);
    }, [roleId, views, roleViews]);

    const modules = useMemo(() => {
        const mods = Array.from(new Set(views.map((v) => v.moduleCode)));
        mods.sort((a, b) => String(a).localeCompare(String(b), 'zh-Hant'));
        return mods;
    }, [views]);

    const grouped = useMemo(() => {
        const m: Record<string, RoleViewDraftRow[]> = {};
        Object.values(draft).forEach((row) => {
            const mc = row.view.moduleCode ?? 'UNKNOWN';
            if (!m[mc]) m[mc] = [];
            m[mc].push(row);
        });
        Object.keys(m).forEach((k) => {
            m[k].sort((a, b) => {
                const sn = (a.view.sortNo ?? 0) - (b.view.sortNo ?? 0);
                if (sn !== 0) return sn;
                return String(a.view.name ?? '').localeCompare(String(b.view.name ?? ''), 'zh-Hant');
            });
        });
        return m;
    }, [draft]);

    const setPerm = useCallback((viewId: string, key: PermKey, value: boolean) => {
        setDraft((prev) => {
            const row = prev[viewId];
            if (!row) return prev;
            return {
                ...prev,
                [viewId]: {
                    ...row,
                    isActive: true,
                    perms: { ...row.perms, [key]: value },
                },
            };
        });
    }, []);

    const setRowActive = useCallback((viewId: string, active: boolean) => {
        setDraft((prev) => {
            const row = prev[viewId];
            if (!row) return prev;
            return { ...prev, [viewId]: { ...row, isActive: active } };
        });
    }, []);

    const bulkSetPermForVisible = useCallback(
        (key: PermKey, value: boolean) => {
            setDraft((prev) => {
                const next = { ...prev };
                Object.values(next).forEach((row) => {
                    if (!moduleFilter || row.view.moduleCode === moduleFilter) {
                        next[row.view.id] = {
                            ...row,
                            isActive: true,
                            perms: { ...row.perms, [key]: value },
                        };
                    }
                });
                return next;
            });
        },
        [moduleFilter],
    );

    const dirtyCount = useMemo(() => {
        let n = 0;
        for (const viewId of Object.keys(draft)) {
            const a = draft[viewId];
            const b = baseline[viewId];
            if (!a || !b) continue;
            if (a.isActive !== b.isActive) n++;
            else if (!permsEqual(a.perms, b.perms)) n++;
        }
        return n;
    }, [draft, baseline]);

    const buildSaveOps = useCallback((): SaveOp[] => {
        const ops: SaveOp[] = [];
        for (const viewId of Object.keys(draft)) {
            const a = draft[viewId];
            const b = baseline[viewId];
            if (!a || !b) continue;

            if (!b.recordId && a.isActive) {
                ops.push({ kind: 'grant', viewId, perms: a.perms });
                continue;
            }

            if (b.recordId) {
                if (!a.isActive && b.isActive) {
                    ops.push({ kind: 'revoke', recordId: b.recordId });
                    continue;
                }

                if (a.isActive && !b.isActive) {
                    ops.push({ kind: 'grant', viewId, perms: a.perms });
                    continue;
                }

                if (a.isActive && b.isActive && !permsEqual(a.perms, b.perms)) {
                    ops.push({ kind: 'updatePerms', recordId: b.recordId, perms: a.perms });
                }
            }
        }
        return ops;
    }, [draft, baseline]);

    // ===== save =====
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const save = useCallback(async () => {
        if (!roleId) return;

        const ops = buildSaveOps();
        if (ops.length === 0) return;

        setSaving(true);
        setSaveError(null);

        try {
            for (const op of ops) {
                if (op.kind === 'grant') {
                    await grantRoleView({ roleId, viewId: op.viewId, ...op.perms });
                } else if (op.kind === 'updatePerms') {
                    await updateRoleViewPerms(op.recordId, op.perms);
                } else if (op.kind === 'revoke') {
                    await revokeRoleView(op.recordId, {});
                }
            }

            const latest = await listRoleView({ roleId, page: 1, pageSize: 1000 });
            setRoleViews(latest.items ?? []);
        } catch (e: any) {
            setSaveError(e?.message ?? '儲存失敗');
        } finally {
            setSaving(false);
        }
    }, [roleId, buildSaveOps]);

    const actions = useMemo(
        () => ({
            setRoleSearch,
            selectRole: (id: string) => setRoleId(id),
            clearRole: () => setRoleId(''),

            toggleModule: (mc: string) => setModuleOpen((p) => ({ ...p, [mc]: !p[mc] })),
            setModuleFilter,

            setPerm,
            setRowActive,
            bulkSetPermForVisible,

            save,
        }),
        [setPerm, setRowActive, bulkSetPermForVisible, save],
    );

    return {
        roleSearch,
        roles,
        rolesLoading,
        rolesError,
        roleId,
        selectedRole,

        modules,
        moduleOpen,
        moduleFilter,
        grouped,

        viewLoading,
        viewError,
        roleViewLoading,
        roleViewError,

        draft,
        baseline,
        dirtyCount,

        saving,
        saveError,

        actions,
    };
}