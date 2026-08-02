// apps/nx-ui/src/features/settings/roles/ui/RoleDetailView.tsx
// v1.2 對齊軌 A+B：單一角色的權限勾選 UI

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getRole,
  getRolePermissions,
  listPermissionCatalog,
  setRolePermissions,
  updateRole,
} from '@data/endpoints/settings/roles/api';
import type { PermissionCatalogItem, Role, RolePermissionsResponse } from '@data/types/settings/roles';
import { MODULE_LABEL, MODULE_ORDER } from '@data/types/settings/roles';

export function RoleDetailView({ roleId }: { roleId: string }) {
  const [role, setRole] = useState<Role | null>(null);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [initialGranted, setInitialGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, all, rp] = await Promise.all([
        getRole(roleId),
        listPermissionCatalog(),
        getRolePermissions(roleId),
      ]);
      setRole(r);
      setCatalog(all);
      const codes = new Set((rp as RolePermissionsResponse).permissions.map((p) => p.code));
      setGranted(codes);
      setInitialGranted(codes);
      // 預設展開「有勾選」的模組
      const open: Record<string, boolean> = {};
      for (const m of MODULE_ORDER) {
        const hasAny = all.some((p) => p.moduleCode === m && codes.has(p.code));
        open[m] = hasAny;
      }
      setOpenModules(open);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // catalog 按模組分組
  const grouped = useMemo(() => {
    const map: Record<string, PermissionCatalogItem[]> = {};
    for (const p of catalog) {
      (map[p.moduleCode] ??= []).push(p);
    }
    for (const m of Object.keys(map)) {
      map[m].sort((a, b) => a.sortNo - b.sortNo);
    }
    return map;
  }, [catalog]);

  const dirty = useMemo(() => {
    if (granted.size !== initialGranted.size) return true;
    for (const c of granted) if (!initialGranted.has(c)) return true;
    return false;
  }, [granted, initialGranted]);

  const toggle = (code: string) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleModule = (moduleCode: string, value: boolean) => {
    setGranted((prev) => {
      const next = new Set(prev);
      for (const p of grouped[moduleCode] ?? []) {
        if (value) next.add(p.code);
        else next.delete(p.code);
      }
      return next;
    });
  };

  const save = async () => {
    if (!role) return;
    setSaving(true);
    setError(null);
    try {
      await setRolePermissions(role.id, Array.from(granted));
      setInitialGranted(new Set(granted));
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !role) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !role) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!role) return null;

  const isSystemRole = role.isSystem;

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SETTINGS · ROLE DETAIL</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {role.name}
            {isSystemRole ? (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                系統內建
              </span>
            ) : null}
          </h1>
          <p className="mt-1 font-mono text-[14px] text-muted-foreground">{role.code}</p>
          {role.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/settings/roles"
            className="rounded border px-3 py-1 text-sm hover:bg-muted"
          >
            ← 返回列表
          </Link>
          {!isSystemRole ? (
            <RoleNameEditor role={role} onSaved={reload} />
          ) : null}
        </div>
      </header>

      {isSystemRole ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          ⚠️ 系統內建角色（SYSADMIN / OWNER）擁有全部權限、UI 不允許修改。
        </div>
      ) : null}

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">勾選此角色擁有的權限</h2>
          <div className="text-xs text-muted-foreground">
            已勾選 <span className="font-semibold text-foreground">{granted.size}</span> / 共 {catalog.length}
          </div>
        </div>

        {MODULE_ORDER.map((moduleCode) => {
          const perms = grouped[moduleCode] ?? [];
          if (!perms.length) return null;
          const checkedCount = perms.filter((p) => granted.has(p.code)).length;
          const allChecked = checkedCount === perms.length;
          const isOpen = openModules[moduleCode] ?? false;
          return (
            <section key={moduleCode} className="rounded border">
              <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                <button
                  onClick={() => setOpenModules((p) => ({ ...p, [moduleCode]: !p[moduleCode] }))}
                  className="flex items-center gap-2 text-sm font-semibold"
                >
                  <span className="font-mono">{isOpen ? '▼' : '▶'}</span>
                  {MODULE_LABEL[moduleCode] ?? moduleCode}
                  <span className="text-xs text-muted-foreground">
                    ({checkedCount} / {perms.length})
                  </span>
                </button>
                {!isSystemRole ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleModule(moduleCode, true)}
                      disabled={allChecked}
                      className="rounded border px-2 py-0.5 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      全選此區
                    </button>
                    <button
                      onClick={() => toggleModule(moduleCode, false)}
                      disabled={checkedCount === 0}
                      className="rounded border px-2 py-0.5 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      全不選此區
                    </button>
                  </div>
                ) : null}
              </div>
              {isOpen ? (
                <div className="grid gap-1 px-4 py-3 md:grid-cols-2 xl:grid-cols-3">
                  {perms.map((p) => (
                    <label
                      key={p.code}
                      className={`flex items-start gap-2 rounded px-2 py-1 text-xs hover:bg-muted/30 ${
                        isSystemRole ? 'opacity-60' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={granted.has(p.code)}
                        onChange={() => toggle(p.code)}
                        disabled={isSystemRole}
                        className="mt-0.5"
                      />
                      <span className="flex-1">
                        <span>{p.name}</span>
                        <span className="ml-2 font-mono text-[10px] text-muted-foreground">{p.code}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </section>

      {!isSystemRole ? (
        <footer className="sticky bottom-0 flex items-center justify-between rounded border bg-background p-3 shadow-sm">
          <div className="text-xs text-muted-foreground">
            {dirty ? (
              <span className="text-amber-700">⚠️ 有未儲存變更</span>
            ) : savedAt ? (
              <span className="text-emerald-700">✓ 已儲存 {savedAt}</span>
            ) : (
              '所有變更會立即生效（掛載此角色的員工權限會即時更新）'
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setGranted(new Set(initialGranted));
                setSavedAt(null);
              }}
              disabled={!dirty || saving}
              className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              取消變更
            </button>
            <button
              onClick={() => void save()}
              disabled={!dirty || saving}
              className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              {saving ? '儲存中…' : '儲存權限'}
            </button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function RoleNameEditor({ role, onSaved }: { role: Role; onSaved: () => void | Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? '');
  const [busy, setBusy] = useState(false);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="rounded border px-3 py-1 text-sm hover:bg-muted"
      >
        改名稱 / 說明
      </button>
    );
  }

  const save = async () => {
    setBusy(true);
    try {
      await updateRole(role.id, {
        name: name.trim() || role.name,
        description: description.trim() || undefined,
      });
      await onSaved();
      setEditing(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded border bg-background px-2 py-1 text-sm"
        placeholder="角色名稱"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded border bg-background px-2 py-1 text-sm"
        placeholder="說明（可空）"
      />
      <button
        onClick={() => void save()}
        disabled={busy}
        className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
      >
        儲存
      </button>
      <button
        onClick={() => setEditing(false)}
        className="rounded border px-2 py-1 text-xs"
      >
        取消
      </button>
    </div>
  );
}
