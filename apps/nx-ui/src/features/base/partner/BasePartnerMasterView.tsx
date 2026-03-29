/**
 * 廠商／客戶主檔：Tab + 搜尋、列表、明細（mock）
 */

'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MOCK_BASE_PARTNERS, type BasePartnerRow, type PartnerKind } from './mock-data';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `ptn-${crypto.randomUUID()}`;
  return `ptn-${Date.now()}`;
}

type Draft = { code: string; name: string; taxId: string; phone: string; isActive: boolean };

function emptyDraft(): Draft {
  return { code: '', name: '', taxId: '', phone: '', isActive: true };
}

function fromRow(r: BasePartnerRow): Draft {
  return { code: r.code, name: r.name, taxId: r.taxId, phone: r.phone, isActive: r.isActive };
}

function PartnerPanel({
  kind,
  tabLabel,
  rows,
  setRows,
}: {
  kind: PartnerKind;
  tabLabel: string;
  rows: BasePartnerRow[];
  setRows: Dispatch<SetStateAction<BasePartnerRow[]>>;
}) {
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = MOCK_BASE_PARTNERS.find((r) => r.kind === kind);
    return first?.id ?? null;
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => {
    const first = MOCK_BASE_PARTNERS.find((r) => r.kind === kind);
    return first ? fromRow(first) : emptyDraft();
  });

  const scoped = useMemo(() => rows.filter((r) => r.kind === kind), [rows, kind]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return scoped;
    return scoped.filter((r) => `${r.code} ${r.name} ${r.taxId} ${r.phone}`.toLowerCase().includes(k));
  }, [scoped, keyword]);

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

  const onSave = () => {
    const code = draft.code.trim().toUpperCase();
    if (!code) return;
    if (creating) {
      const id = newId();
      const row: BasePartnerRow = {
        id,
        code,
        name: draft.name.trim() || code,
        taxId: draft.taxId.trim(),
        phone: draft.phone.trim(),
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
              taxId: draft.taxId.trim(),
              phone: draft.phone.trim(),
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
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER · {tabLabel}</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋</h2>
          <div className="mt-4">
            <Label htmlFor={`pt-k-${kind}`}>關鍵字</Label>
            <Input
              id={`pt-k-${kind}`}
              className="mt-2"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="代碼、名稱、統編、電話…"
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
                    <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">統編 {r.taxId}</div>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">此分類尚無資料。</p>
              ) : null}
            </div>
          </ScrollArea>
        </section>
      </div>

      <aside className="glass-card min-h-[min(520px,calc(100vh-14rem))] rounded-2xl border border-border/80 p-4 shadow-sm lg:sticky lg:top-24">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
        <h2 className="mt-1 text-sm font-semibold text-foreground">往來明細</h2>
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`pt-c-${kind}`}>代碼</Label>
            <Input
              id={`pt-c-${kind}`}
              value={formValues.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-n-${kind}`}>名稱</Label>
            <Input
              id={`pt-n-${kind}`}
              value={formValues.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-t-${kind}`}>統一編號</Label>
            <Input
              id={`pt-t-${kind}`}
              value={formValues.taxId}
              onChange={(e) => setDraft((d) => ({ ...d, taxId: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-p-${kind}`}>電話</Label>
            <Input
              id={`pt-p-${kind}`}
              value={formValues.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
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
            <p className="text-xs text-muted-foreground">點選左側一筆以檢視。</p>
          )}
        </div>
      </aside>
    </div>
  );
}

export function BasePartnerMasterView() {
  const [rows, setRows] = useState<BasePartnerRow[]>(() => [...MOCK_BASE_PARTNERS]);

  return (
    <Tabs defaultValue="vendor" className="w-full gap-4">
      <TabsList className="w-full max-w-md">
        <TabsTrigger value="vendor" className="flex-1">
          廠商
        </TabsTrigger>
        <TabsTrigger value="customer" className="flex-1">
          客戶
        </TabsTrigger>
      </TabsList>
      <TabsContent value="vendor" className="mt-0 outline-none">
        <PartnerPanel kind="vendor" tabLabel="廠商" rows={rows} setRows={setRows} />
      </TabsContent>
      <TabsContent value="customer" className="mt-0 outline-none">
        <PartnerPanel kind="customer" tabLabel="客戶" rows={rows} setRows={setRows} />
      </TabsContent>
    </Tabs>
  );
}
