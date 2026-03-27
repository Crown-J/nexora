/**
 * File: apps/nx-ui/src/features/nx00/role-view/hooks/useRoleView.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLE-VIEW-HOOK-002：RoleView Hook（批次 API 版）
 *
 * Notes:
 * - 使用批次 API：GET /role-view/role/:roleId、PUT /role-view/role/:roleId
 * - 仍沿用本地 draft/baseline 比較與矩陣 UI 資料結構
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listRole } from '@/features/nx00/role/api/role';
import type { RoleDto } from '@/features/nx00/role/types';

import {
  getRoleViewByRoleId,
  listView,
  upsertRoleView,
  type UpsertRoleViewItem,
} from '@/features/nx00/role-view/api/role-view';
import type {
  PermKey,
  Perms,
  RoleViewDraftRow,
  RoleViewDto,
  ViewDto,
} from '@/features/nx00/role-view/types';

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
    isActive: has ? Boolean((rv as any).isActive ?? true) : false,
    perms: has
      ? normalizePerms({
          canRead: (rv as any).canRead ?? (rv as any)?.perms?.canRead,
          canCreate: (rv as any).canCreate ?? (rv as any)?.perms?.canCreate,
          canUpdate: (rv as any).canUpdate ?? (rv as any)?.perms?.canUpdate,
          canDelete: (rv as any).canDelete ?? (rv as any)?.perms?.canDelete,
          canExport: (rv as any).canExport ?? (rv as any)?.perms?.canExport,
        })
      : normalizePerms(null),
  };
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-HOOK-002-F01
 * 說明：useRoleView - 左側角色 + 右側矩陣（批次儲存）
 */
export function useRoleView() {
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

  const selectedRole: RoleDto | null = useMemo(
    () => roles.find((r) => r.id === roleId) ?? null,
    [roles, roleId],
  );

  // ===== right: matrix data =====
  const [views, setViews] = useState<ViewDto[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  const [roleViews, setRoleViews] = useState<RoleViewDto[]>([]);
  const [roleViewLoading, setRoleViewLoading] = useState(false);
  const [roleViewError, setRoleViewError] = useState<string | null>(null);

  // local draft
  const [draft, setDraft] = useState<Record<string, RoleViewDraftRow>>({});
  const [baseline, setBaseline] = useState<Record<string, RoleViewDraftRow>>({});

  // module expand/collapse + filter
  const [moduleOpen, setModuleOpen] = useState<Record<string, boolean>>({});
  const [moduleFilter, setModuleFilter] = useState<string>('');

  // load all views once（只取 active 的畫面）
  useEffect(() => {
    let alive = true;
    setViewLoading(true);
    setViewError(null);

    listView({ isActive: true })
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

  // load role-views when roleId changes（批次 API）
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

    getRoleViewByRoleId(roleId)
      .then((items) => {
        if (!alive) return;
        setRoleViews(items ?? []);
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

    const base: Record<string, RoleViewDraftRow> = {};
    Object.keys(next).forEach((k) => {
      const r = next[k];
      base[k] = { ...r, perms: { ...r.perms } };
    });
    setBaseline(base);

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

  // ===== save（批次 PUT）=====
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-HOOK-002-F03
   * 說明：
   * - 依目前 moduleFilter 計算各權限欄位的全選 / 部分選取狀態
   */
  const columnState = useMemo(() => {
    const visibleRows = Object.values(draft).filter((row) =>
      moduleFilter ? row.view.moduleCode === moduleFilter : true,
    );

    const base: Record<PermKey, { allChecked: boolean; indeterminate: boolean }> = {
      canRead: { allChecked: false, indeterminate: false },
      canCreate: { allChecked: false, indeterminate: false },
      canUpdate: { allChecked: false, indeterminate: false },
      canDelete: { allChecked: false, indeterminate: false },
      canExport: { allChecked: false, indeterminate: false },
    };

    if (visibleRows.length === 0) return base;

    for (const key of PERM_KEYS) {
      const allChecked = visibleRows.every((r) => Boolean(r.perms[key]));
      const anyChecked = visibleRows.some((r) => Boolean(r.perms[key]));
      base[key] = {
        allChecked,
        indeterminate: anyChecked && !allChecked,
      };
    }

    return base;
  }, [draft, moduleFilter]);

  /**
   * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-HOOK-002-F04
   * 說明：
   * - 標題列或 Bulk 區塊點擊某權限欄位時，根據目前狀態切換「全選 / 全部取消」
   */
  const toggleColumnPerm = useCallback(
    (key: PermKey) => {
      const visibleRows = Object.values(draft).filter((row) =>
        moduleFilter ? row.view.moduleCode === moduleFilter : true,
      );
      if (visibleRows.length === 0) return;

      const allChecked = visibleRows.every((r) => Boolean(r.perms[key]));
      const nextValue = !allChecked;
      bulkSetPermForVisible(key, nextValue);
    },
    [bulkSetPermForVisible, draft, moduleFilter],
  );

  /**
   * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-HOOK-002-F05
   * 說明：
   * - 全部勾選 / 全部取消所有 View 的所有權限
   * - 全部勾選時同時將列設為啟用；全部取消時將列設為停用
   */
  const setAllPerms = useCallback(
    (value: boolean) => {
      setDraft((prev) => {
        const next: typeof prev = {};
        for (const row of Object.values(prev)) {
          next[row.view.id] = {
            ...row,
            isActive: value,
            perms: {
              canRead: value,
              canCreate: value,
              canUpdate: value,
              canDelete: value,
              canExport: value,
            },
          };
        }
        return next;
      });
    },
    [setDraft],
  );

  /**
   * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-HOOK-002-F06
   * 說明：
   * - 單列（單一畫面）全選/全取消：切換該列所有權限與啟用狀態
   */
  const toggleRowAll = useCallback(
    (viewId: string) => {
      setDraft((prev) => {
        const row = prev[viewId];
        if (!row) return prev;

        const allSelected = PERM_KEYS.every((k) => Boolean(row.perms[k]));
        const nextValue = !allSelected;

        return {
          ...prev,
          [viewId]: {
            ...row,
            isActive: nextValue,
            perms: {
              canRead: nextValue,
              canCreate: nextValue,
              canUpdate: nextValue,
              canDelete: nextValue,
              canExport: nextValue,
            },
          },
        };
      });
    },
    [setDraft],
  );

  /**
   * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-HOOK-002-F07
   * 說明：
   * - Module 群組全選/全取消：切換該 module 下所有列的權限與啟用狀態
   */
  const toggleModuleAll = useCallback(
    (moduleCode: string) => {
      setDraft((prev) => {
        const rowsInModule = Object.values(prev).filter(
          (row) => (row.view.moduleCode ?? 'UNKNOWN') === moduleCode,
        );
        if (rowsInModule.length === 0) return prev;

        const allSelected = rowsInModule.every((row) =>
          PERM_KEYS.every((k) => Boolean(row.perms[k])) && Boolean(row.isActive),
        );
        const nextValue = !allSelected;

        const next: typeof prev = { ...prev };
        for (const row of rowsInModule) {
          next[row.view.id] = {
            ...row,
            isActive: nextValue,
            perms: {
              canRead: nextValue,
              canCreate: nextValue,
              canUpdate: nextValue,
              canDelete: nextValue,
              canExport: nextValue,
            },
          };
        }

        return next;
      });
    },
    [setDraft],
  );

  /**
   * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-HOOK-002-F02
   * 說明：save - 以批次 API upsert 全部 draft 狀態
   */
  const save = useCallback(async () => {
    if (!roleId) return;

    const items: UpsertRoleViewItem[] = Object.values(draft).map((row) => ({
      viewId: row.view.id,
      canRead: Boolean(row.isActive && row.perms.canRead),
      canCreate: Boolean(row.isActive && row.perms.canCreate),
      canUpdate: Boolean(row.isActive && row.perms.canUpdate),
      canDelete: Boolean(row.isActive && row.perms.canDelete),
      canExport: Boolean(row.isActive && row.perms.canExport),
    }));

    setSaving(true);
    setSaveError(null);

    try {
      const updated = await upsertRoleView(roleId, items);
      setRoleViews(updated ?? []);
    } catch (e: any) {
      setSaveError(e?.message ?? '儲存失敗');
    } finally {
      setSaving(false);
    }
  }, [roleId, draft]);

  const actions = useMemo(
    () => ({
      setRoleSearch,
      selectRole: (id: string) => setRoleId(id),
      clearRole: () => setRoleId(''),

      toggleModule: (mc: string) =>
        setModuleOpen((p) => ({
          ...p,
          [mc]: !p[mc],
        })),
      setModuleFilter,

      setPerm,
      setRowActive,
      bulkSetPermForVisible,

      save,
      toggleColumnPerm,
      setAllPerms,
      toggleRowAll,
      toggleModuleAll,
    }),
    [setPerm, setRowActive, bulkSetPermForVisible, save, toggleColumnPerm, setAllPerms, toggleRowAll, toggleModuleAll],
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

    columnState,

    actions,
  };
}

