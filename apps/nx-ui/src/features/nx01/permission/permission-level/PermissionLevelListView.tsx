// apps/nx-ui/src/features/nx01/permission/permission-level/PermissionLevelListView.tsx
// 職務↔權限拆分軌 Step5：權限等級主頁（表格 + 新增 + 啟停用 + 權限設定連結）
// 內建 S（全權限）鎖定不可改/停。詳細權限走「權限設定」（[id] 頁）。

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, ShieldCheck, SlidersHorizontal } from 'lucide-react';

import {
  createPermissionLevel,
  listPermissionLevels,
  updatePermissionLevel,
} from '@data/endpoints/settings/permission-level/api';
import type { PermissionLevel } from '@data/types/settings/permission-level';

export function PermissionLevelListView() {
  const [rows, setRows] = useState<PermissionLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listPermissionLevels();
      setRows(resp.rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = rows.filter((r) => showInactive || r.isActive);

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <header className="mb-5">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <h1 className="text-xl font-semibold text-foreground">權限等級</h1>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          權限以「權限等級」綁定（與職務分離）。每個使用者掛一個等級；內建 <b>S</b> 為全權限、鎖定不可改。
          設好等級後，到「權限設定」勾選該等級的詳細權限。
        </p>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[13px] hover:bg-foreground/[0.04]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 重新整理
        </button>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:brightness-105"
        >
          <Plus className="h-3.5 w-3.5" /> {showNew ? '取消新增' : '新增權限等級'}
        </button>
        <label className="ml-auto flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
          顯示已停用
        </label>
      </div>

      {showNew ? (
        <NewLevelForm
          onCreated={() => {
            setShowNew(false);
            void reload();
          }}
          onCancel={() => setShowNew(false)}
        />
      ) : null}

      {error ? (
        <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-secondary text-left text-[12px] text-muted-foreground">
              <th className="px-3 py-2 font-medium">代碼</th>
              <th className="px-3 py-2 font-medium">名稱</th>
              <th className="px-3 py-2 font-medium">說明</th>
              <th className="px-3 py-2 font-medium">狀態</th>
              <th className="px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : null}
            {!loading && !visible.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  還沒有權限等級。點「新增權限等級」開始。
                </td>
              </tr>
            ) : null}
            {visible.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-foreground/[0.03]">
                <td className="px-3 py-2 font-mono font-semibold text-foreground">{r.code}</td>
                <td className="px-3 py-2 text-foreground">
                  {r.name}
                  {r.isSystem ? (
                    <span className="ml-2 rounded bg-primary/12 px-1.5 py-0.5 text-[10px] text-primary">
                      內建
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.description ?? '—'}</td>
                <td className="px-3 py-2">
                  {r.isActive ? (
                    <span className="text-[var(--color-success)]">● 啟用</span>
                  ) : (
                    <span className="text-muted-foreground">○ 停用</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/dashboard/settings/permission-levels/${r.id}`}
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[12px] hover:bg-foreground/[0.05]"
                    >
                      <SlidersHorizontal className="h-3 w-3" /> 權限設定
                    </Link>
                    {!r.isSystem ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updatePermissionLevel(r.id, { isActive: !r.isActive });
                            await reload();
                          } catch (e) {
                            alert(e instanceof Error ? e.message : '操作失敗');
                          }
                        }}
                        className="rounded border border-border px-2 py-1 text-[12px] hover:bg-foreground/[0.05]"
                      >
                        {r.isActive ? '停用' : '啟用'}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewLevelForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setErr('代碼與名稱必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await createPermissionLevel({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-3 rounded-lg border border-border bg-secondary/40 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-[13px]">
          <span className="mb-1 block text-muted-foreground">權限代碼 *</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="例：A / B / MANAGER"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono"
          />
        </label>
        <label className="text-[13px]">
          <span className="mb-1 block text-muted-foreground">名稱 *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：主管、業務、唯讀"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5"
          />
        </label>
        <label className="text-[13px]">
          <span className="mb-1 block text-muted-foreground">說明</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5"
          />
        </label>
      </div>
      {err ? <div className="mt-2 text-[12px] text-destructive">{err}</div> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? '建立中…' : '建立'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-1.5 text-[13px]">
          取消
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">建立後到該等級「權限設定」勾選詳細權限。</p>
    </form>
  );
}
