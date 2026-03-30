/**
 * 廠牌主檔：Tab（汽車／零件）+ 搜尋、列表、明細（mock）
 */

'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { getFieldIdFromEventTarget, handleMasterFieldKeyDown } from '@/features/base/keyboard/masterFieldNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MOCK_BASE_BRANDS, type BaseBrandRow, type BrandKind } from './mock-data';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `brand-${crypto.randomUUID()}`;
  return `brand-${Date.now()}`;
}

type Draft = { code: string; name: string; originCountry: string; isActive: boolean };

function emptyDraft(): Draft {
  return { code: '', name: '', originCountry: 'TW', isActive: true };
}

function fromRow(r: BaseBrandRow): Draft {
  return { code: r.code, name: r.name, originCountry: r.originCountry, isActive: r.isActive };
}

function BrandPanel({
  kind,
  tabLabel,
  rows,
  setRows,
}: {
  kind: BrandKind;
  tabLabel: string;
  rows: BaseBrandRow[];
  setRows: Dispatch<SetStateAction<BaseBrandRow[]>>;
}) {
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = MOCK_BASE_BRANDS.find((r) => r.kind === kind);
    return first?.id ?? null;
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => {
    const first = MOCK_BASE_BRANDS.find((r) => r.kind === kind);
    return first ? fromRow(first) : emptyDraft();
  });
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  const brandFieldOrder = useMemo(
    () => [`bb-c-${kind}`, `bb-n-${kind}`, `bb-o-${kind}`, `bb-active-${kind}`] as const,
    [kind],
  );

  const scoped = useMemo(() => rows.filter((r) => r.kind === kind), [rows, kind]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return scoped;
    return scoped.filter((r) => `${r.code} ${r.name} ${r.originCountry}`.toLowerCase().includes(k));
  }, [scoped, keyword]);

  const selectedFilteredIndex = useMemo(
    () => (selectedId ? filtered.findIndex((r) => r.id === selectedId) : -1),
    [filtered, selectedId],
  );

  const selected = useMemo(
    () => (selectedId ? rows.find((r) => r.id === selectedId && r.kind === kind) ?? null : null),
    [rows, selectedId, kind],
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
      const first = scoped[0];
      setSelectedId(first?.id ?? null);
      setDraft(first ? fromRow(first) : emptyDraft());
      return;
    }
    setEditing(false);
    if (selected) setDraft(fromRow(selected));
  };

  const performSave = () => {
    const code = draft.code.trim().toUpperCase();
    if (!code) return;
    if (creating) {
      const id = newId();
      const row: BaseBrandRow = {
        id,
        code,
        name: draft.name.trim() || code,
        originCountry: draft.originCountry.trim() || 'TW',
        kind,
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
        r.id === selectedId && r.kind === kind
          ? {
              ...r,
              code,
              name: draft.name.trim() || code,
              originCountry: draft.originCountry.trim() || 'TW',
              isActive: draft.isActive,
            }
          : r,
      ),
    );
    setEditing(false);
  };

  const focusBrandRow = (index: number) => {
    requestAnimationFrame(() => {
      (document.querySelector(`[data-brand-master-row="${kind}-${index}"]`) as HTMLElement | null)?.focus();
    });
  };

  const selectRowAtFilteredIndex = (idx: number) => {
    const r = filtered[idx];
    if (!r) return;
    setSelectedId(r.id);
    setCreating(false);
    setEditing(false);
  };

  const firstCodeId = `bb-c-${kind}`;
  const keywordId = `bb-k-${kind}`;

  const readonlyCls = 'bg-muted/40 text-muted-foreground cursor-default';

  return (
    <>
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,42%)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER · {tabLabel}</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋</h2>
          <div className="mt-4">
            <Label htmlFor={`bb-k-${kind}`}>關鍵字</Label>
            <Input
              id={`bb-k-${kind}`}
              className="mt-2"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (saveConfirmOpen) return;
                if (e.key === 'ArrowDown' && filtered.length > 0) {
                  e.preventDefault();
                  selectRowAtFilteredIndex(0);
                  focusBrandRow(0);
                }
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  document.getElementById(firstCodeId)?.focus();
                }
              }}
              placeholder="代碼、名稱、國別…"
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
              {filtered.map((r, i) => {
                const active = r.id === selectedId && !creating;
                return (
                  <button
                    key={r.id}
                    type="button"
                    tabIndex={-1}
                    data-brand-master-row={`${kind}-${i}`}
                    onClick={() => onRowClick(r.id)}
                    onKeyDown={(e) => {
                      if (saveConfirmOpen) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (i < filtered.length - 1) {
                          selectRowAtFilteredIndex(i + 1);
                          focusBrandRow(i + 1);
                        } else {
                          document.getElementById(firstCodeId)?.focus();
                        }
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (i > 0) {
                          selectRowAtFilteredIndex(i - 1);
                          focusBrandRow(i - 1);
                        } else {
                          document.getElementById(keywordId)?.focus();
                        }
                      }
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        document.getElementById(firstCodeId)?.focus();
                      }
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        document.getElementById(keywordId)?.focus();
                      }
                    }}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'border-primary/40 border-l-4 border-l-primary bg-primary/10 pl-2.5 ring-1 ring-primary/20'
                        : 'border-border/80 bg-muted/15 hover:bg-muted/30',
                    )}
                  >
                    <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.originCountry}</div>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">此分類尚無資料，可點「新增」。</p>
              ) : null}
            </div>
          </ScrollArea>
        </section>
      </div>

      <aside
        className="glass-card min-h-[min(520px,calc(100vh-14rem))] rounded-2xl border border-border/80 p-4 shadow-sm lg:sticky lg:top-24"
        onKeyDownCapture={(e) => {
          if (saveConfirmOpen) return;
          if (!creating && !editing) return;
          const id = getFieldIdFromEventTarget(e.target);
          if (e.key === 'ArrowLeft' && id === firstCodeId) {
            e.preventDefault();
            if (selectedFilteredIndex >= 0) focusBrandRow(selectedFilteredIndex);
            else document.getElementById(keywordId)?.focus();
            return;
          }
          handleMasterFieldKeyDown(e, brandFieldOrder, {
            enabled: true,
            onLastField: () => setSaveConfirmOpen(true),
          });
        }}
      >
        <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
        <h2 className="mt-1 text-sm font-semibold text-foreground">廠牌明細</h2>
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`bb-c-${kind}`}>代碼</Label>
            <Input
              id={`bb-c-${kind}`}
              value={formValues.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`bb-n-${kind}`}>名稱</Label>
            <Input
              id={`bb-n-${kind}`}
              value={formValues.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`bb-o-${kind}`}>國別</Label>
            <Input
              id={`bb-o-${kind}`}
              value={formValues.originCountry}
              onChange={(e) => setDraft((d) => ({ ...d, originCountry: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <label htmlFor={`bb-active-${kind}`} className="flex items-center gap-2 text-sm">
            <input
              id={`bb-active-${kind}`}
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
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!draft.code.trim()) return;
                  setSaveConfirmOpen(true);
                }}
              >
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
            <p className="text-xs text-muted-foreground">點選左側一筆以檢視。</p>
          )}
        </div>
      </aside>
    </div>
    <MasterSaveConfirmDialog
      open={saveConfirmOpen}
      onOpenChange={setSaveConfirmOpen}
      onConfirm={() => performSave()}
    />
    </>
  );
}

export function BaseBrandMasterView() {
  const [rows, setRows] = useState<BaseBrandRow[]>(() => [...MOCK_BASE_BRANDS]);

  return (
    <Tabs defaultValue="vehicle" className="w-full gap-4">
      <TabsList className="w-full max-w-md">
        <TabsTrigger value="vehicle" className="flex-1">
          汽車廠牌
        </TabsTrigger>
        <TabsTrigger value="part" className="flex-1">
          零件廠牌
        </TabsTrigger>
      </TabsList>
      <TabsContent value="vehicle" className="mt-0 outline-none">
        <BrandPanel kind="vehicle" tabLabel="汽車" rows={rows} setRows={setRows} />
      </TabsContent>
      <TabsContent value="part" className="mt-0 outline-none">
        <BrandPanel kind="part" tabLabel="零件" rows={rows} setRows={setRows} />
      </TabsContent>
    </Tabs>
  );
}
