// apps/nx-ui/src/features/nx01/product/part-kit/ui/PartKitMasterView.tsx
// 2026-06-26：組合/拆解組件關係主檔 UI（整體件 = 一組組件含數量）
// 種類3 拆解：整體=正廠總成、組件=副廠拆出多件；種類4 組合：整體=副廠合成件、組件=正廠分售件
// 2026-06-28 六層化：無路徑列 + L3 銀質工具列 + L4 兩分頁（Alt+1 組合件 / Alt+2 組件明細、皆列表）；編輯改彈窗
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Boxes, Package, Pencil, Plus, Power, RefreshCw, X } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
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

  // 六層雙欄：選定組合件 + 焦點欄
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusZone, setFocusZone] = useState<'left' | 'right'>('left');
  const [kitIdx, setKitIdx] = useState(0);

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

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null;

  // ---------- 鍵盤（六層：Alt+1/2 切欄、↑↓ 移卡、Enter 選定、A 新增 / E 編輯）----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (t as HTMLElement).blur();
        return;
      }
      if (mode === 'edit') {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
        return;
      }
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setFocusZone('left');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setFocusZone('right');
        return;
      }
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        onNew();
        return;
      }
      if ((e.key === 'e' || e.key === 'E') && selected) {
        e.preventDefault();
        onEdit(selected);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusZone('left');
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusZone('right');
        return;
      }
      if (focusZone === 'left' && rows.length) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setKitIdx((i) => (i + 1) % rows.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setKitIdx((i) => (i - 1 + rows.length) % rows.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const r = rows[kitIdx];
          if (r) {
            setSelectedId(r.id);
            setFocusZone('right');
          }
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, focusZone, rows, kitIdx, selected]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* L3 情境工具列（銀質、六層；標題由工作區分頁顯示、不再有路徑列）*/}
      <ToolbarPortal>
        <div
          data-nx-frame
          className="flex items-center gap-1 border-b border-border/40 px-3 py-2"
          style={{
            backgroundImage:
              'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
          }}
        >
          <KitToolBtn icon={Plus} letter="A" label="新增" enabled onClick={onNew} />
          <KitToolBtn icon={Pencil} letter="E" label="編輯" enabled={!!selected} onClick={() => selected && onEdit(selected)} />
          <KitToolBtn
            icon={Power}
            label={selected?.isActive ? '停用' : '啟用'}
            enabled={!!selected}
            onClick={() => selected && void onToggleActive(selected)}
          />
          <KitToolBtn icon={RefreshCw} letter="R" label="重新整理" enabled onClick={() => void load()} />
          <div className="flex-1" />
          <span className="hidden text-[11px] text-muted-foreground lg:inline">
            Alt+1/2 切欄 · ↑↓ 移動 · Enter 選定 · A 新增 · E 編輯
          </span>
        </div>
      </ToolbarPortal>

      {error ? (
        <div className="mx-4 mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {/* L4 兩分頁（列表式）*/}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-background px-3 py-1">
        <KitTab label="組合件" count={rows.length} hint="1" active={focusZone === 'left'} onClick={() => setFocusZone('left')} />
        <KitTab label="組件明細" count={selected?.items.length ?? 0} hint="2" active={focusZone === 'right'} onClick={() => setFocusZone('right')} />
      </div>

      {/* L5 兩欄：組合件列表 / 選中組合件的組件明細 */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-4 pt-3 md:grid-cols-[360px_1fr]">
        <ColPanel title="組合件" subtitle={`${rows.length} 筆`} icon={Boxes} active={focusZone === 'left'} onClick={() => setFocusZone('left')} shortcut="1">
          {loading ? (
            <Empty text="載入中…" />
          ) : rows.length === 0 ? (
            <Empty text="尚無組合件、按 A 新增" />
          ) : (
            rows.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setFocusZone('left');
                  setKitIdx(i);
                  setSelectedId(r.id);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-all',
                  focusZone === 'left' && kitIdx === i
                    ? 'border-primary/70 bg-primary/12 shadow-md'
                    : selectedId === r.id
                      ? 'border-primary/40 bg-primary/6'
                      : 'border-border/40 bg-card hover:border-border hover:bg-accent/15',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-foreground">{r.name}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {r.wholePartCode ?? r.wholePartId}
                  </div>
                </div>
                {!r.isActive ? (
                  <span className="flex-none rounded bg-muted px-1 text-[10px] text-muted-foreground">停用</span>
                ) : null}
                <span className="flex-none rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                  {r.items.length} 件
                </span>
              </button>
            ))
          )}
        </ColPanel>

        <ColPanel
          title="組件明細"
          subtitle={selected ? `${selected.name} ▸ ${selected.items.length} 件` : '請先選組合件'}
          icon={Package}
          active={focusZone === 'right'}
          onClick={() => setFocusZone('right')}
          shortcut="2"
        >
          {!selected ? (
            <Empty text="← 請先選一個組合件" />
          ) : selected.items.length === 0 ? (
            <Empty text="此組合件尚無組件、按 E 編輯加入" />
          ) : (
            selected.items.map((it) => (
              <div key={it.id ?? it.partId} className="flex items-center gap-3 rounded-md border border-border/40 bg-card px-2.5 py-2">
                <span className="grid h-8 w-14 flex-none place-items-center rounded-md bg-primary/12 font-mono text-[13px] font-bold tabular-nums text-primary">
                  ×{it.qty}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[12px] text-foreground">{it.partCode ?? it.partId}</div>
                  {it.remark ? <div className="truncate text-[11px] text-muted-foreground">{it.remark}</div> : null}
                </div>
              </div>
            ))
          )}
        </ColPanel>
      </div>

      {/* 編輯彈窗 */}
      {mode === 'edit' ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onCancel}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/40 bg-popover p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-3 flex items-center gap-2.5">
              <Boxes className="size-5 text-primary" />
              <h2 className="text-sm font-bold tracking-wide text-foreground">
                {editingId ? '編輯組件關係' : '新增組件關係'}
              </h2>
            </header>
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
        </div>
      ) : null}
    </div>
  );
}

// ============ 六層子元件 ============

function KitToolBtn({
  icon: Icon,
  letter,
  label,
  enabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  letter?: string;
  label: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      title={letter ? `${label}（${letter}）` : label}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-all',
        enabled
          ? 'border-border/50 bg-card text-foreground/80 hover:border-border hover:bg-accent/15 hover:text-foreground'
          : 'cursor-not-allowed border-border/30 bg-muted/30 text-muted-foreground/50',
      )}
    >
      <Icon className="size-3" />
      <span className="hidden sm:inline">
        {letter ? <span className={cn('mr-0.5 font-mono', enabled && 'text-primary')}>{letter}</span> : null}
        {label}
      </span>
    </button>
  );
}

function KitTab({
  label,
  count,
  hint,
  active,
  onClick,
}: {
  label: string;
  count: number;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors',
        active
          ? 'border-primary/50 bg-primary/10 text-primary'
          : 'border-transparent text-muted-foreground hover:bg-accent/15 hover:text-foreground',
      )}
    >
      <span className="font-mono text-[10px] opacity-60">Alt+{hint}</span>
      {label}
      <span
        className={cn(
          'inline-flex min-w-4 items-center justify-center rounded px-1 text-[10px]',
          active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ColPanel({
  title,
  subtitle,
  icon: Icon,
  active,
  onClick,
  shortcut,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  shortcut: string;
  children: React.ReactNode;
}) {
  return (
    <section
      onClick={onClick}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card transition-all',
        active ? 'border-primary/60' : 'border-border/50 hover:border-border',
      )}
    >
      <header
        className={cn(
          'flex items-center gap-2 border-b px-3 py-2',
          active ? 'border-primary/40 bg-primary/8' : 'border-border/40 bg-muted/30',
        )}
      >
        <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {title}
            <kbd
              className={cn(
                'inline-block rounded border px-1 font-mono text-[10px]',
                active ? 'border-primary/60 bg-primary/15 text-primary' : 'border-border/50 bg-muted/40 text-muted-foreground',
              )}
            >
              {shortcut}
            </kbd>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </header>
      <div className="flex flex-col gap-1.5 overflow-y-auto p-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="grid place-items-center py-8 text-center text-[12px] text-muted-foreground">{text}</div>
  );
}
