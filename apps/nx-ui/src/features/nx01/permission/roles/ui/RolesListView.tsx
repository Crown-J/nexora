// apps/nx-ui/src/features/settings/roles/ui/RolesListView.tsx
// v1.2 對齊軌 A+B：設定→角色與權限主頁（list + 新增 / 編輯 / 停用）

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createRole, deleteRole, listRoles, updateRole } from '@data/endpoints/settings/roles/api';
import type { CreateRolePayload, Role } from '@data/types/settings/roles';

export function RolesListView() {
  const router = useRouter();
  const [rows, setRows] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listRoles();
      setRows(resp.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visibleRows = rows.filter((r) => {
    if (showHidden) return true;
    return r.isActive;
  });

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SETTINGS · ROLES &amp; PERMISSIONS</p>
        <h1 className="text-2xl font-semibold tracking-tight">角色與權限</h1>
        <p className="text-sm text-muted-foreground">
          負責人從零建角色、自由命名、組合系統權限。建好後到「主檔中心 → 員工」把員工掛上對應角色。
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        <button onClick={() => void reload()} className="rounded border px-3 py-1 text-sm hover:bg-muted">
          重新整理
        </button>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
        >
          {showNew ? '取消新增' : '+ 新增角色'}
        </button>
        <label className="ml-auto flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />
          顯示已停用
        </label>
      </section>

      {showNew ? (
        <NewRoleForm
          onCreated={(role) => {
            setShowNew(false);
            router.push(`/dashboard/settings/roles/${role.id}`);
          }}
          onCancel={() => setShowNew(false)}
        />
      ) : null}

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {loading && !rows.length ? (
        <div className="text-sm text-muted-foreground">載入中…</div>
      ) : null}

      {!loading && !visibleRows.length ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          還沒有任何角色。點「+ 新增角色」開始建立。
          <br />
          提示：建好角色後到「主檔中心 → 員工」把員工掛上對應角色才會生效。
        </div>
      ) : null}

      {visibleRows.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleRows.map((r) => (
            <article
              key={r.id}
              className={`rounded-lg border p-4 ${r.isActive ? '' : 'opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">
                    {r.name}
                    {r.isSystem ? (
                      <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">
                        系統內建
                      </span>
                    ) : null}
                    {!r.isActive ? (
                      <span className="ml-2 rounded bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-700">
                        已停用
                      </span>
                    ) : null}
                  </h2>
                  <p className="font-mono text-[10px] text-muted-foreground">{r.code}</p>
                </div>
              </div>
              {r.description ? (
                <p className="mt-2 text-xs text-muted-foreground">{r.description}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/settings/roles/${r.id}`}
                  className="rounded border px-2 py-1 text-xs hover:bg-muted"
                >
                  編輯權限 →
                </Link>
                {!r.isSystem ? (
                  r.isActive ? (
                    <button
                      onClick={async () => {
                        if (!window.confirm(`確認停用「${r.name}」？掛載此角色的員工會失去這些權限。`)) return;
                        try {
                          await updateRole(r.id, { isActive: false });
                          await reload();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : '停用失敗');
                        }
                      }}
                      className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                    >
                      停用
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          await updateRole(r.id, { isActive: true });
                          await reload();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : '啟用失敗');
                        }
                      }}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      啟用
                    </button>
                  )
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <footer className="text-xs text-muted-foreground">
        共 {visibleRows.length} 個角色 · 系統內建角色（SYSADMIN / OWNER）的權限自動覆蓋全部、不可修改
      </footer>
    </div>
  );
}

function NewRoleForm({
  onCreated,
  onCancel,
}: {
  onCreated: (role: Role) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr('角色名稱必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const autoCode = code.trim() || `R_${Date.now().toString(36).toUpperCase()}`;
      const payload: CreateRolePayload = {
        name: name.trim(),
        code: autoCode,
        description: description.trim() || undefined,
      };
      const role = await createRole(payload);
      onCreated(role);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">+ 新增角色（v1.2 §12.2：自由命名、無預設範本）</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm md:col-span-2">
          <span className="block mb-1">🟢 角色名稱 *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：業務、採購、倉管、Boss、組長..."
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">⚪ 角色代碼（可空、自動產）</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="留空自動產 R_xxx"
            className="w-full rounded border bg-background px-2 py-1 font-mono"
          />
        </label>
        <label className="text-sm md:col-span-3">
          <span className="block mb-1">⚪ 說明（可選）</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="這個角色負責什麼？"
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
      </div>
      {err ? <div className="text-xs text-destructive">{err}</div> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? '建立中…' : '建立 + 進入勾權限'}
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-1.5 text-sm">
          取消
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        建立後跳到該角色詳情頁、勾選此角色擁有的權限。權限完全自由組合、無預設。
      </p>
    </form>
  );
}
