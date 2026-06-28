// apps/nx-ui/src/features/nx01/permission/permission-level/PermissionLevelDetailView.tsx
// 職務↔權限拆分軌 Step5：權限等級「權限設定」明細（229 權限分模組勾選、PUT 儲存）
// 內建 S（全權限）唯讀。

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';

import { listPermissionCatalog } from '@data/endpoints/settings/roles/api';
import {
  getLevelPermissions,
  getPermissionLevel,
  setLevelPermissions,
} from '@data/endpoints/settings/permission-level/api';
import { MODULE_LABEL, MODULE_ORDER, type PermissionCatalogItem } from '@data/types/settings/roles';
import type { PermissionLevel } from '@data/types/settings/permission-level';

export function PermissionLevelDetailView({ levelId }: { levelId: string }) {
  const router = useRouter();
  const [level, setLevel] = useState<PermissionLevel | null>(null);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lv, cat, cur] = await Promise.all([
        getPermissionLevel(levelId),
        listPermissionCatalog(),
        getLevelPermissions(levelId),
      ]);
      setLevel(lv);
      setCatalog(cat);
      setSelected(new Set(cur.permissions.map((p) => p.code)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [levelId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionCatalogItem[]>();
    for (const p of catalog) {
      const arr = map.get(p.moduleCode) ?? [];
      arr.push(p);
      map.set(p.moduleCode, arr);
    }
    const order = [...MODULE_ORDER, ...[...map.keys()].filter((k) => !MODULE_ORDER.includes(k))];
    return order.filter((m) => map.has(m)).map((m) => ({ module: m, items: map.get(m)! }));
  }, [catalog]);

  const readOnly = !!level?.isSystem;

  const toggle = (code: string) => {
    if (readOnly) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleModule = (items: PermissionCatalogItem[], on: boolean) => {
    if (readOnly) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const i of items) {
        if (on) next.add(i.code);
        else next.delete(i.code);
      }
      return next;
    });
  };

  async function save() {
    if (readOnly) return;
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await setLevelPermissions(levelId, [...selected]);
      setMsg(`已儲存（共 ${res.total} 項權限）`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <button
        type="button"
        onClick={() => router.push('/dashboard/settings/permission-levels')}
        className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 回權限等級
      </button>

      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            權限設定 · {level?.name ?? '…'}{' '}
            <span className="font-mono text-[13px] text-muted-foreground">({level?.code})</span>
          </h1>
          <p className="text-[13px] text-muted-foreground">勾選此權限等級可使用的功能權限。</p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? '儲存中…' : '儲存'}
          </button>
        ) : null}
      </header>

      {readOnly ? (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[13px] text-foreground">
          S 為內建全權限等級、自動擁有所有權限、不可修改。
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </div>
      ) : null}
      {msg ? (
        <div className="mb-3 rounded-md border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-[13px]">
          {msg}
        </div>
      ) : null}

      {loading ? (
        <div className="text-[13px] text-muted-foreground">載入中…</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ module, items }) => {
            const allOn = items.every((i) => selected.has(i.code) || readOnly);
            return (
              <section key={module} className="rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <h2 className="text-[13px] font-semibold text-foreground">
                    {MODULE_LABEL[module] ?? module}
                  </h2>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => toggleModule(items, !allOn)}
                      className="text-[12px] text-primary hover:underline"
                    >
                      {allOn ? '全不選' : '全選'}
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-x-4 gap-y-1.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 text-[12.5px] text-foreground/90"
                    >
                      <input
                        type="checkbox"
                        checked={readOnly || selected.has(p.code)}
                        disabled={readOnly}
                        onChange={() => toggle(p.code)}
                        className="size-4 rounded border-border accent-primary"
                      />
                      <span className="truncate" title={p.code}>
                        {p.name}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
