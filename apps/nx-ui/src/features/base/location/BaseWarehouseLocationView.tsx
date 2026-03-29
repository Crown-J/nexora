/**
 * 倉庫主檔：左側倉庫列表、右上明細、右下庫位（mock，對齊 base/role 版型）
 */

'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  MOCK_BASE_WAREHOUSES,
  MOCK_BIN_SUGGESTIONS,
  MOCK_BINS_BY_WAREHOUSE,
  type BaseStorageBinRow,
  type BaseWarehouseRow,
} from './mock-data';

type WhDraft = { code: string; name: string; address: string; isActive: boolean };

function emptyWh(): WhDraft {
  return { code: '', name: '', address: '', isActive: true };
}

function fromWh(w: BaseWarehouseRow): WhDraft {
  return { code: w.code, name: w.name, address: w.address, isActive: w.isActive };
}

function newId(p: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${p}-${crypto.randomUUID()}`;
  return `${p}-${Date.now()}`;
}

export function BaseWarehouseLocationView() {
  const [warehouses, setWarehouses] = useState<BaseWarehouseRow[]>(() => [...MOCK_BASE_WAREHOUSES]);
  const [whSearch, setWhSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => MOCK_BASE_WAREHOUSES[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [detailDraft, setDetailDraft] = useState<WhDraft>(() =>
    MOCK_BASE_WAREHOUSES[0] ? fromWh(MOCK_BASE_WAREHOUSES[0]) : emptyWh(),
  );
  const [baselineDetail, setBaselineDetail] = useState<WhDraft>(() =>
    MOCK_BASE_WAREHOUSES[0] ? fromWh(MOCK_BASE_WAREHOUSES[0]) : emptyWh(),
  );

  const [binsByWh, setBinsByWh] = useState<Record<string, BaseStorageBinRow[]>>(() => {
    const c: Record<string, BaseStorageBinRow[]> = {};
    for (const k of Object.keys(MOCK_BINS_BY_WAREHOUSE)) {
      c[k] = MOCK_BINS_BY_WAREHOUSE[k]!.map((b) => ({ ...b }));
    }
    return c;
  });
  const [baselineBins, setBaselineBins] = useState<BaseStorageBinRow[]>(() => {
    const id = MOCK_BASE_WAREHOUSES[0]?.id;
    if (!id) return [];
    return (MOCK_BINS_BY_WAREHOUSE[id] ?? []).map((b) => ({ ...b }));
  });

  const [binCode, setBinCode] = useState('');
  const [binZone, setBinZone] = useState('');
  const [binNote, setBinNote] = useState('');
  const [binFilter, setBinFilter] = useState('');

  const selectedWh = useMemo(
    () => (selectedId ? warehouses.find((w) => w.id === selectedId) ?? null : null),
    [warehouses, selectedId],
  );

  const filteredWh = useMemo(() => {
    const q = whSearch.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter((w) => `${w.code} ${w.name}`.toLowerCase().includes(q));
  }, [warehouses, whSearch]);

  const bins = useMemo(() => {
    if (creating || !selectedId) return [];
    return binsByWh[selectedId] ?? [];
  }, [binsByWh, creating, selectedId]);

  const binsShown = useMemo(() => {
    const k = binFilter.trim().toLowerCase();
    if (!k) return bins;
    return bins.filter((b) => `${b.code} ${b.zone} ${b.note}`.toLowerCase().includes(k));
  }, [bins, binFilter]);

  const detailDirty = useMemo(() => {
    if (creating) return detailDraft.code.trim() !== '' || detailDraft.name.trim() !== '' || detailDraft.address.trim() !== '';
    return JSON.stringify(detailDraft) !== JSON.stringify(baselineDetail);
  }, [baselineDetail, creating, detailDraft]);

  const binsDirty = useMemo(() => {
    if (creating || !selectedId) return false;
    return JSON.stringify(bins) !== JSON.stringify(baselineBins);
  }, [baselineBins, bins, creating, selectedId]);

  const dirty = detailDirty || binsDirty;

  const onSelectWh = (w: BaseWarehouseRow) => {
    setCreating(false);
    setSelectedId(w.id);
    const d = fromWh(w);
    setDetailDraft(d);
    setBaselineDetail(d);
    const mem = binsByWh[w.id] ?? [];
    setBaselineBins(mem.map((b) => ({ ...b })));
    setBinCode('');
    setBinZone('');
    setBinNote('');
    setBinFilter('');
  };

  const onAddWh = () => {
    setCreating(true);
    setSelectedId(null);
    setDetailDraft(emptyWh());
    setBaselineDetail(emptyWh());
    setBaselineBins([]);
    setBinCode('');
    setBinZone('');
    setBinNote('');
  };

  const onReset = () => {
    if (creating) {
      setDetailDraft(emptyWh());
      return;
    }
    if (selectedWh) {
      setDetailDraft({ ...baselineDetail });
      setBinsByWh((prev) => ({
        ...prev,
        [selectedWh.id]: baselineBins.map((b) => ({ ...b })),
      }));
    }
  };

  const onSave = () => {
    const code = detailDraft.code.trim().toUpperCase();
    const name = detailDraft.name.trim();
    if (!code || !name) return;
    if (creating) {
      const id = newId('wh');
      const row: BaseWarehouseRow = {
        id,
        code,
        name,
        address: detailDraft.address.trim(),
        isActive: detailDraft.isActive,
      };
      setWarehouses((prev) => [...prev, row].sort((a, b) => a.code.localeCompare(b.code)));
      setBinsByWh((prev) => ({ ...prev, [id]: [] }));
      setCreating(false);
      setSelectedId(id);
      setDetailDraft(fromWh(row));
      setBaselineDetail(fromWh(row));
      setBaselineBins([]);
      return;
    }
    if (!selectedId || !selectedWh) return;
    setWarehouses((prev) =>
      prev.map((w) =>
        w.id === selectedId
          ? {
              ...w,
              code,
              name,
              address: detailDraft.address.trim(),
              isActive: detailDraft.isActive,
            }
          : w,
      ),
    );
    setBaselineDetail({ ...detailDraft });
    setBaselineBins(bins.map((b) => ({ ...b })));
  };

  const addBin = () => {
    if (creating || !selectedId) return;
    const code = binCode.trim().toUpperCase();
    if (!code) return;
    setBinsByWh((prev) => {
      const list = [...(prev[selectedId] ?? [])];
      if (list.some((b) => b.code === code)) return prev;
      list.push({
        id: newId('bin'),
        warehouseId: selectedId,
        code,
        zone: binZone.trim() || '—',
        note: binNote.trim(),
        isActive: true,
      });
      return { ...prev, [selectedId]: list };
    });
    setBinCode('');
    setBinNote('');
  };

  const removeBin = (binId: string) => {
    if (creating || !selectedId) return;
    setBinsByWh((prev) => ({
      ...prev,
      [selectedId]: (prev[selectedId] ?? []).filter((b) => b.id !== binId),
    }));
  };

  const applySuggestion = (s: { code: string; zone: string }) => {
    setBinCode(s.code);
    setBinZone(s.zone);
  };

  const leftTitle = selectedWh && !creating ? `倉庫列表（已選：${selectedWh.name}）` : '倉庫列表';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-stretch">
      <section className="glass-card flex max-h-[min(720px,calc(100vh-220px))] min-h-[420px] flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs tracking-[0.35em] text-muted-foreground">WAREHOUSE</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">{leftTitle}</h2>
          </div>
          <Button type="button" size="sm" className="shrink-0 gap-1" onClick={onAddWh}>
            <Plus className="size-4" aria-hidden />
            新增
          </Button>
        </div>
        <Input
          value={whSearch}
          onChange={(e) => setWhSearch(e.target.value)}
          placeholder="搜尋倉庫（代碼／名稱）"
          className="mb-3"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setWhSearch('');
          }}
        />
        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="space-y-2 pb-1">
            {filteredWh.map((w) => {
              const active = !creating && selectedId === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onSelectWh(w)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                    active
                      ? 'border-primary/40 border-l-4 border-l-primary bg-primary/10 pl-2.5 shadow-sm ring-1 ring-primary/20'
                      : 'border-border/80 bg-muted/15 hover:bg-muted/30',
                  )}
                >
                  <div className="font-semibold leading-snug">{w.name}</div>
                  <div className="text-xs text-muted-foreground">{w.code}</div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </section>

      <div className="flex min-h-[min(720px,calc(100vh-220px))] min-h-0 flex-col gap-4">
        <section className="glass-card flex shrink-0 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
              <h2 className="mt-1 text-sm font-semibold text-foreground">
                {creating ? '新增倉庫' : selectedWh ? `倉庫明細 — ${selectedWh.name}` : '倉庫明細'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={onReset} disabled={!creating && !selectedWh}>
                還原
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                disabled={
                  creating
                    ? !detailDraft.code.trim() || !detailDraft.name.trim()
                    : !selectedWh || !dirty
                }
              >
                儲存
              </Button>
            </div>
          </div>

          {!creating && !selectedWh ? (
            <p className="text-sm text-muted-foreground">請從左側選擇倉庫，或點「新增」。</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wh-code">倉庫代碼</Label>
                <Input
                  id="wh-code"
                  value={detailDraft.code}
                  onChange={(e) => setDetailDraft((d) => ({ ...d, code: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-name">倉庫名稱</Label>
                <Input
                  id="wh-name"
                  value={detailDraft.name}
                  onChange={(e) => setDetailDraft((d) => ({ ...d, name: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-end gap-2 pb-2 sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={detailDraft.isActive}
                    onChange={(e) => setDetailDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  />
                  啟用
                </label>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="wh-addr">地址</Label>
                <Textarea
                  id="wh-addr"
                  value={detailDraft.address}
                  onChange={(e) => setDetailDraft((d) => ({ ...d, address: e.target.value }))}
                  rows={3}
                  className="min-h-[80px] resize-y"
                />
              </div>
            </div>
          )}
        </section>

        <section className="glass-card flex min-h-[280px] flex-1 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="mb-3 border-b border-border/60 pb-3">
            <p className="text-xs tracking-[0.35em] text-muted-foreground">BINS</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">此倉庫庫位</h2>
            <p className="mt-1 text-xs text-muted-foreground">輸入代碼後加入；可點選下方範本帶入（mock）。</p>
          </div>

          {creating || !selectedId ? (
            <p className="text-sm text-muted-foreground">請先建立或選取倉庫後，再維護庫位。</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {MOCK_BIN_SUGGESTIONS.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/18"
                    onClick={() => applySuggestion(s)}
                  >
                    {s.code}
                  </button>
                ))}
              </div>
              <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <div className="space-y-1">
                  <Label htmlFor="bin-code">庫位代碼</Label>
                  <Input
                    id="bin-code"
                    value={binCode}
                    onChange={(e) => setBinCode(e.target.value)}
                    placeholder="例：A-01-01"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bin-zone">區域</Label>
                  <Input
                    id="bin-zone"
                    value={binZone}
                    onChange={(e) => setBinZone(e.target.value)}
                    placeholder="例：A 區"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="bin-note">備註（選填）</Label>
                  <Input
                    id="bin-note"
                    value={binNote}
                    onChange={(e) => setBinNote(e.target.value)}
                    placeholder="良品／暫存…"
                    autoComplete="off"
                  />
                </div>
                <Button type="button" size="sm" className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto" onClick={addBin}>
                  加入庫位
                </Button>
              </div>
              <div className="mb-2">
                <Input
                  value={binFilter}
                  onChange={(e) => setBinFilter(e.target.value)}
                  placeholder="在庫位清單內搜尋…"
                  className="max-w-sm"
                />
              </div>
              <ScrollArea className="min-h-0 flex-1 pr-2">
                <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
                  {binsShown.map((b) => (
                    <div
                      key={b.id}
                      className="flex max-w-full items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-sm"
                    >
                      <span className="font-mono text-xs">{b.code}</span>
                      <span className="text-xs text-muted-foreground">{b.zone}</span>
                      {b.note ? <span className="text-xs text-muted-foreground">· {b.note}</span> : null}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => removeBin(b.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {binsShown.length === 0 ? (
                    <span className="text-xs text-muted-foreground">尚無庫位，請於上方新增。</span>
                  ) : null}
                </div>
              </ScrollArea>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
