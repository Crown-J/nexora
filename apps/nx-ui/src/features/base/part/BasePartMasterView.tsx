/**
 * 零件主檔：左上搜尋、左下列表、右側明細（mock）
 */

'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { MOCK_BASE_PARTS, type BasePartRow } from './mock-data';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `part-${crypto.randomUUID()}`;
  return `part-${Date.now()}`;
}

type Draft = { sku: string; name: string; spec: string; unit: string; isActive: boolean };

function emptyDraft(): Draft {
  return { sku: '', name: '', spec: '', unit: 'PCS', isActive: true };
}

function fromRow(r: BasePartRow): Draft {
  return { sku: r.sku, name: r.name, spec: r.spec, unit: r.unit, isActive: r.isActive };
}

export function BasePartMasterView() {
  const [rows, setRows] = useState<BasePartRow[]>(() => [...MOCK_BASE_PARTS]);
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => MOCK_BASE_PARTS[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() =>
    MOCK_BASE_PARTS[0] ? fromRow(MOCK_BASE_PARTS[0]) : emptyDraft(),
  );

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) => `${r.sku} ${r.name} ${r.spec}`.toLowerCase().includes(k));
  }, [rows, keyword]);

  const selected = useMemo(
    () => (selectedId ? rows.find((r) => r.id === selectedId) ?? null : null),
    [rows, selectedId],
  );

  const formValues = creating || editing ? draft : selected ? fromRow(selected) : emptyDraft();

  const onRowClick = (id: string) => {
    setSelectedId(id);
    setCreating(false);
    setEditing(false);
  };

  const onAdd = () => {
    setSelectedId(null);
    setCreating(true);
    setEditing(true);
    setDraft(emptyDraft());
  };

  const onEdit = () => {
    if (!selected) return;
    setEditing(true);
    setDraft(fromRow(selected));
  };

  const onCancel = () => {
    if (creating) {
      setCreating(false);
      setEditing(false);
      setSelectedId(rows[0]?.id ?? null);
      if (rows[0]) setDraft(fromRow(rows[0]));
      return;
    }
    setEditing(false);
    if (selected) setDraft(fromRow(selected));
  };

  const onSave = () => {
    const sku = draft.sku.trim();
    if (!sku) return;
    if (creating) {
      const id = newId();
      const row: BasePartRow = {
        id,
        sku,
        name: draft.name.trim() || sku,
        spec: draft.spec.trim(),
        unit: draft.unit.trim() || 'PCS',
        isActive: draft.isActive,
      };
      setRows((prev) => [...prev, row]);
      setSelectedId(id);
      setCreating(false);
      setEditing(false);
      return;
    }
    if (!selectedId) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === selectedId
          ? {
              ...r,
              sku,
              name: draft.name.trim() || sku,
              spec: draft.spec.trim(),
              unit: draft.unit.trim() || 'PCS',
              isActive: draft.isActive,
            }
          : r,
      ),
    );
    setEditing(false);
  };

  const readonlyCls = 'bg-muted/40 text-muted-foreground cursor-default';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,42%)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋</h2>
          <div className="mt-4">
            <Label htmlFor="bp-keyword">關鍵字</Label>
            <Input
              id="bp-keyword"
              className="mt-2"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="料號、品名、規格…"
              autoComplete="off"
            />
          </div>
        </section>

        <section className="glass-card flex min-h-[420px] min-w-0 flex-1 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
            <Button type="button" size="sm" onClick={onAdd}>
              新增
            </Button>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">共 {filtered.length} 筆</span>
          </div>
          <ScrollArea className="mt-3 min-h-0 flex-1 pr-2">
            <div className="space-y-2">
              {filtered.map((r) => {
                const active = r.id === selectedId && !creating;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onRowClick(r.id)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'border-primary/40 border-l-4 border-l-primary bg-primary/10 pl-2.5 ring-1 ring-primary/20'
                        : 'border-border/80 bg-muted/15 hover:bg-muted/30',
                    )}
                  >
                    <div className="font-mono text-xs text-muted-foreground">{r.sku}</div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{r.spec}</div>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">無符合資料。</p>
              ) : null}
            </div>
          </ScrollArea>
        </section>
      </div>

      <aside className="glass-card min-h-[min(520px,calc(100vh-14rem))] rounded-2xl border border-border/80 p-4 shadow-sm lg:sticky lg:top-24">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
        <h2 className="mt-1 text-sm font-semibold text-foreground">零件明細</h2>
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="bp-sku">料號</Label>
            <Input
              id="bp-sku"
              value={formValues.sku}
              onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bp-name">品名</Label>
            <Input
              id="bp-name"
              value={formValues.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bp-spec">規格</Label>
            <Input
              id="bp-spec"
              value={formValues.spec}
              onChange={(e) => setDraft((d) => ({ ...d, spec: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bp-unit">單位</Label>
            <Input
              id="bp-unit"
              value={formValues.unit}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={formValues.isActive}
              disabled={!creating && !editing}
              onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
            />
            啟用
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {creating || editing ? (
            <>
              <Button type="button" size="sm" onClick={onSave}>
                儲存
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onCancel}>
                取消
              </Button>
            </>
          ) : selected ? (
            <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
              編輯
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">點選左側一筆以檢視，或按「新增」。</p>
          )}
        </div>
      </aside>
    </div>
  );
}
