// apps/nx-ui/src/features/nx01/product/part-kit/ui/PartKitMasterView.tsx
// 2026-06-26：組合/拆解組件關係主檔 UI（整體件 = 一組組件含數量）
// 種類3 拆解：整體=正廠總成、組件=副廠拆出多件；種類4 組合：整體=副廠合成件、組件=正廠分售件
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, X } from 'lucide-react';

import { Button } from '@design/primitives/button';
import { Input } from '@design/primitives/input';
import { Label } from '@design/primitives/label';
import {
  createPartKit,
  listPartKits,
  setPartKitActive,
  updatePartKit,
  type PartKitDto,
} from '@data/endpoints/nx01/api/part-kit';

type ItemDraft = { partId: string; qty: string; remark: string };
type Draft = { wholePartId: string; name: string; remark: string; items: ItemDraft[] };

const PAGE_SIZE = 20;

function emptyDraft(): Draft {
  return { wholePartId: '', name: '', remark: '', items: [{ partId: '', qty: '1', remark: '' }] };
}

function fromRow(r: PartKitDto): Draft {
  return {
    wholePartId: r.wholePartId,
    name: r.name,
    remark: r.remark ?? '',
    items: r.items.length
      ? r.items.map((it) => ({ partId: it.partId, qty: it.qty, remark: it.remark ?? '' }))
      : [{ partId: '', qty: '1', remark: '' }],
  };
}

export function PartKitMasterView() {
  const [rows, setRows] = useState<PartKitDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'browse' | 'edit'>('browse');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPartKits({ pageSize: PAGE_SIZE });
      setRows(res.items);
    } catch (e) {
      setError((e as Error)?.message ?? '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setMode('edit');
  };
  const onEdit = (r: PartKitDto) => {
    setEditingId(r.id);
    setDraft(fromRow(r));
    setMode('edit');
  };
  const onCancel = () => {
    setMode('browse');
    setEditingId(null);
  };

  const setItem = (i: number, patch: Partial<ItemDraft>) =>
    setDraft((d) => ({ ...d, items: d.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));
  const addItem = () => setDraft((d) => ({ ...d, items: [...d.items, { partId: '', qty: '1', remark: '' }] }));
  const removeItem = (i: number) => setDraft((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));

  const onSave = async () => {
    const items = draft.items
      .filter((it) => it.partId.trim())
      .map((it) => ({
        partId: it.partId.trim(),
        qty: Number.parseFloat(it.qty) || 0,
        remark: it.remark.trim() || null,
      }));
    if (!draft.wholePartId.trim() || !draft.name.trim() || items.length === 0) {
      setError('整體件、名稱、至少一筆組件為必填');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updatePartKit(editingId, { name: draft.name.trim(), remark: draft.remark.trim() || null, items });
      } else {
        await createPartKit({
          wholePartId: draft.wholePartId.trim(),
          name: draft.name.trim(),
          remark: draft.remark.trim() || null,
          items,
        });
      }
      await load();
      setMode('browse');
      setEditingId(null);
    } catch (e) {
      setError((e as Error)?.message ?? '存檔失敗');
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (r: PartKitDto) => {
    try {
      await setPartKitActive(r.id, !r.isActive);
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? '操作失敗');
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">組合／拆解組件關係</h1>
          <p className="text-[11px] text-muted-foreground">
            一個整體件 ＝ 一組組件（含數量）。拆解：正廠總成→副廠多件；組合：正廠多件→副廠合成件。
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCw className="size-4" /> 重新整理
          </Button>
          <Button type="button" onClick={onNew}>
            <Plus className="size-4" /> 新增
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div> : null}

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2.5">整體件</th>
              <th className="px-3 py-2.5">關係名稱</th>
              <th className="px-3 py-2.5">組件數</th>
              <th className="px-3 py-2.5">啟用</th>
              <th className="w-20 px-3 py-2.5" aria-label="動作" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">載入中…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">尚無資料</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="px-3 py-2 font-mono text-xs">{r.wholePartCode ?? r.wholePartId}</td>
                  <td className="px-3 py-2 text-xs">{r.name}</td>
                  <td className="px-3 py-2 text-xs tabular-nums">{r.items.length}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.isActive ? <span className="text-primary">啟用</span> : <span className="text-muted-foreground">停用</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(r)} aria-label="編輯">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => void onToggleActive(r)}>
                        {r.isActive ? '停用' : '啟用'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mode === 'edit' ? (
        <div className="rounded-lg border border-border/60 p-4">
          <h2 className="mb-3 text-sm font-semibold">{editingId ? '編輯組件關係' : '新增組件關係'}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pk-whole">整體件料號 ID *（建立後不可改）</Label>
              <Input
                id="pk-whole"
                value={draft.wholePartId}
                disabled={!!editingId}
                onChange={(e) => setDraft((d) => ({ ...d, wholePartId: e.target.value }))}
                placeholder="NX01PART0000001"
                maxLength={15}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pk-name">關係名稱 *</Label>
              <Input
                id="pk-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="如 1K0407621 副廠拆解組"
                maxLength={100}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pk-remark">備註</Label>
              <Input
                id="pk-remark"
                value={draft.remark}
                onChange={(e) => setDraft((d) => ({ ...d, remark: e.target.value }))}
                maxLength={200}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">組件明細（含數量）</span>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="size-3.5" /> 加組件
              </Button>
            </div>
            <div className="space-y-1.5">
              {draft.items.map((it, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    className="w-44 font-mono"
                    value={it.partId}
                    onChange={(e) => setItem(i, { partId: e.target.value })}
                    placeholder="組件料號 ID"
                    maxLength={15}
                    autoComplete="off"
                  />
                  <Input
                    className="w-24"
                    value={it.qty}
                    onChange={(e) => setItem(i, { qty: e.target.value })}
                    placeholder="數量"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                  <Input
                    className="min-w-[8rem] flex-1"
                    value={it.remark}
                    onChange={(e) => setItem(i, { remark: e.target.value })}
                    placeholder="備註"
                    maxLength={200}
                    autoComplete="off"
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(i)} aria-label="移除">
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>取消</Button>
            <Button type="button" onClick={() => void onSave()} disabled={saving}>{saving ? '儲存中…' : '儲存'}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
