// apps/nx-ui/src/features/nx01/phonetic-dictionary/ui/PhoneticDictionaryMasterView.tsx
// 對應規格：docs/nx01/spec/intent/nx01-10-phonetic-search.md v1.0 §2.2
// SYSADMIN 全域字典維護頁（簡化版、A062 後續軌升級為完整 BaseMasterPage 範式）
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createPhoneticDictionary,
  listPhoneticDictionary,
  softDeletePhoneticDictionary,
  updatePhoneticDictionary,
} from '@data/endpoints/base/phonetic-dictionary/api/phonetic-dictionary';
import type { PhoneticDictionaryDto } from '@data/types/base/phonetic-dictionary';

type Draft = {
  character: string;
  primaryPhonetic: string;
  altPhonetics: string;
  primaryInitial: string;
  isActive: boolean;
};

const PAGE_SIZE = 20;

function emptyDraft(): Draft {
  return {
    character: '',
    primaryPhonetic: '',
    altPhonetics: '',
    primaryInitial: '',
    isActive: true,
  };
}

function fromRow(r: PhoneticDictionaryDto): Draft {
  return {
    character: r.character,
    primaryPhonetic: r.primaryPhonetic,
    altPhonetics: r.altPhonetics.join(', '),
    primaryInitial: r.primaryInitial,
    isActive: r.isActive,
  };
}

export function PhoneticDictionaryMasterView() {
  const [rows, setRows] = useState<PhoneticDictionaryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [primaryInitialFilter, setPrimaryInitialFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPhoneticDictionary({
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        primaryInitial: primaryInitialFilter.trim() || undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, primaryInitialFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const isEmpty = !loading && rows.length === 0;

  const onAdd = () => {
    setCreating(true);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const onEdit = (row: PhoneticDictionaryDto) => {
    setCreating(false);
    setEditingId(row.id);
    setDraft(fromRow(row));
  };

  const onCancel = () => {
    setCreating(false);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const parseAlts = (raw: string): string[] =>
    raw
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const onSave = async () => {
    const character = draft.character.trim();
    const primaryPhonetic = draft.primaryPhonetic.trim();
    const primaryInitial = draft.primaryInitial.trim();
    if (!character || !primaryPhonetic || !primaryInitial) return;
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        await createPhoneticDictionary({
          character,
          primaryPhonetic,
          altPhonetics: parseAlts(draft.altPhonetics),
          primaryInitial,
          isActive: draft.isActive,
        });
      } else if (editingId) {
        await updatePhoneticDictionary(editingId, {
          primaryPhonetic,
          altPhonetics: parseAlts(draft.altPhonetics),
          primaryInitial,
          isActive: draft.isActive,
        });
      }
      setCreating(false);
      setEditingId(null);
      setDraft(emptyDraft());
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const onSoftDelete = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await softDeletePhoneticDictionary(id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '停用失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="glass-card nx-glass-raised rounded-2xl border border-border/80 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={onAdd} disabled={loading || saving}>
            <Plus className="size-4" aria-hidden /> 新增漢字
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9"
            onClick={() => void reload()}
            disabled={loading}
            aria-label="重新載入"
          >
            <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
          </Button>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜尋漢字 / 主要注音…"
            autoComplete="off"
            className="h-9 min-w-[12rem] flex-1 basis-[min(100%,16rem)]"
          />
          <Input
            value={primaryInitialFilter}
            onChange={(e) => {
              setPrimaryInitialFilter(e.target.value);
              setPage(1);
            }}
            placeholder="聲母（ㄅ）"
            autoComplete="off"
            className="h-9 w-24"
          />
          <span className="ms-auto text-xs text-muted-foreground tabular-nums">
            {loading ? '載入中…' : `共 ${total} 字`}
          </span>
        </div>
      </section>

      <section className="glass-card nx-glass-raised rounded-2xl border border-border/80 p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-2 py-2.5">漢字</th>
              <th className="px-2 py-2.5">主要注音</th>
              <th className="px-2 py-2.5">替代注音</th>
              <th className="px-2 py-2.5">聲母</th>
              <th className="px-2 py-2.5">啟用</th>
              <th className="w-20 px-2 py-2.5" aria-label="動作" />
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground">
                  字典為空。請點「新增漢字」開始建立。
                  <br />
                  <span className="text-[11px]">（對應 A057：字典資料批次匯入留後續軌）</span>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-2 py-2 font-mono">{row.character}</td>
                  <td className="px-2 py-2">{row.primaryPhonetic}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {row.altPhonetics.length ? row.altPhonetics.join(', ') : '—'}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">{row.primaryInitial}</td>
                  <td className="px-2 py-2 text-xs">
                    {row.isActive ? <span className="text-primary">啟用</span> : <span className="text-muted-foreground">停用</span>}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => onEdit(row)}
                      aria-label="編輯"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>第 {page} / {totalPages} 頁</span>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一頁
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一頁
            </Button>
          </div>
        </div>
      </section>

      {(creating || editingId) ? (
        <section className="glass-card nx-glass-raised rounded-2xl border border-primary/40 p-4">
          <h2 className="mb-3 text-sm font-semibold">{creating ? '新增漢字' : '編輯漢字'}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="pd-character">漢字（單字）</Label>
              <Input
                id="pd-character"
                value={draft.character}
                onChange={(e) => setDraft((d) => ({ ...d, character: e.target.value }))}
                disabled={!creating}
                maxLength={4}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd-primary">主要注音（如 ㄅㄧˋ）</Label>
              <Input
                id="pd-primary"
                value={draft.primaryPhonetic}
                onChange={(e) => setDraft((d) => ({ ...d, primaryPhonetic: e.target.value }))}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd-initial">聲母（如 ㄅ）</Label>
              <Input
                id="pd-initial"
                value={draft.primaryInitial}
                onChange={(e) => setDraft((d) => ({ ...d, primaryInitial: e.target.value }))}
                maxLength={2}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd-alt">替代注音（逗號分隔）</Label>
              <Input
                id="pd-alt"
                value={draft.altPhonetics}
                onChange={(e) => setDraft((d) => ({ ...d, altPhonetics: e.target.value }))}
                placeholder="ㄕㄚˋ, ㄔㄚˋ"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={draft.isActive}
                onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
              />
              啟用
            </label>
            <div className="ms-auto flex gap-2">
              {editingId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void onSoftDelete(editingId)}
                  disabled={saving}
                >
                  停用
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
                取消
              </Button>
              <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving}>
                {saving ? '儲存中…' : '儲存'}
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
