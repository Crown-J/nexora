/**
 * 倉庫主檔：GET/POST/PUT /warehouse，庫位 GET/POST/PATCH /location
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { getFieldIdFromEventTarget, handleMasterFieldKeyDown } from '@/features/base/keyboard/masterFieldNav';
import { createWarehouse, listWarehouses, updateWarehouse, type WarehouseDto } from '@/features/base/api/warehouse';
import { createLocation, listLocation, setLocationActive } from '@/features/nx00/location/api/location';
import type { LocationDto } from '@/features/nx00/location/types';

type WhDraft = { code: string; name: string; remark: string; isActive: boolean };

function emptyWh(): WhDraft {
  return { code: '', name: '', remark: '', isActive: true };
}

function fromDto(w: WarehouseDto): WhDraft {
  return {
    code: w.code,
    name: w.name,
    remark: w.remark ?? '',
    isActive: w.isActive,
  };
}

/** 庫位快速帶入（僅前端預填，寫入仍走 API） */
const BIN_SUGGESTIONS: { code: string; zone: string }[] = [
  { code: 'A-01-01', zone: 'A 區' },
  { code: 'A-01-02', zone: 'A 區' },
  { code: 'B-02-01', zone: 'B 區' },
  { code: 'RCV-01', zone: '收貨' },
];

export function BaseWarehouseLocationView() {
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [locLoading, setLocLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingWh, setSavingWh] = useState(false);
  const [binSaving, setBinSaving] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  const WH_FIELD_ORDER: readonly string[] = ['wh-code', 'wh-name', 'wh-remark', 'wh-active'];

  const [whSearch, setWhSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [detailDraft, setDetailDraft] = useState<WhDraft>(emptyWh);
  const [baselineDetail, setBaselineDetail] = useState<WhDraft>(emptyWh);

  const [binCode, setBinCode] = useState('');
  const [binZone, setBinZone] = useState('');
  const [binNote, setBinNote] = useState('');
  const [binFilter, setBinFilter] = useState('');

  const reloadWarehouses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listWarehouses({ page: 1, pageSize: 500 });
      setWarehouses(r.items);
      return r.items;
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入倉庫失敗');
      setWarehouses([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLocations = useCallback(async (warehouseId: string) => {
    setLocLoading(true);
    setError(null);
    try {
      const r = await listLocation({
        page: 1,
        pageSize: 500,
        warehouseId,
        isActive: true,
      });
      setLocations(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入庫位失敗');
      setLocations([]);
    } finally {
      setLocLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadWarehouses();
  }, [reloadWarehouses]);

  useEffect(() => {
    if (creating || !selectedId) {
      setLocations([]);
      return;
    }
    void loadLocations(selectedId);
  }, [creating, selectedId, loadLocations]);

  const selectedWh = useMemo(
    () => (selectedId ? warehouses.find((w) => w.id === selectedId) ?? null : null),
    [warehouses, selectedId],
  );

  const filteredWh = useMemo(() => {
    const q = whSearch.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter((w) => `${w.code} ${w.name}`.toLowerCase().includes(q));
  }, [warehouses, whSearch]);

  const selectedWhIndex = useMemo(
    () => (selectedId ? filteredWh.findIndex((w) => w.id === selectedId) : -1),
    [filteredWh, selectedId],
  );

  const binsShown = useMemo(() => {
    const k = binFilter.trim().toLowerCase();
    const list = locations;
    if (!k) return list;
    return list.filter((b) =>
      `${b.code} ${b.zone ?? ''} ${b.remark ?? ''}`.toLowerCase().includes(k),
    );
  }, [locations, binFilter]);

  const detailDirty = useMemo(() => {
    if (creating) return detailDraft.code.trim() !== '' || detailDraft.name.trim() !== '' || detailDraft.remark.trim() !== '';
    return JSON.stringify(detailDraft) !== JSON.stringify(baselineDetail);
  }, [baselineDetail, creating, detailDraft]);

  const onSelectWh = (w: WarehouseDto) => {
    setCreating(false);
    setSelectedId(w.id);
    const d = fromDto(w);
    setDetailDraft(d);
    setBaselineDetail(d);
    setBinCode('');
    setBinZone('');
    setBinNote('');
    setBinFilter('');
  };

  const onAddWh = () => {
    setCreating(true);
    setSelectedId(null);
    setLocations([]);
    setDetailDraft(emptyWh());
    setBaselineDetail(emptyWh());
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
    }
  };

  const performSaveWh = async () => {
    const code = detailDraft.code.trim().toUpperCase();
    const name = detailDraft.name.trim();
    if (!code || !name) return;
    setSavingWh(true);
    setError(null);
    try {
      const remark = detailDraft.remark.trim() || null;
      if (creating) {
        const dto = await createWarehouse({
          code,
          name,
          remark,
          isActive: detailDraft.isActive,
        });
        setWarehouses((prev) => [...prev, dto].sort((a, b) => a.code.localeCompare(b.code)));
        setCreating(false);
        setSelectedId(dto.id);
        const d = fromDto(dto);
        setDetailDraft(d);
        setBaselineDetail(d);
        return;
      }
      if (!selectedId || !selectedWh) return;
      const dto = await updateWarehouse(selectedId, {
        code,
        name,
        remark,
        isActive: detailDraft.isActive,
      });
      setWarehouses((prev) => prev.map((w) => (w.id === selectedId ? dto : w)));
      const d = fromDto(dto);
      setDetailDraft(d);
      setBaselineDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存倉庫失敗');
    } finally {
      setSavingWh(false);
    }
  };

  const focusWhRow = (index: number) => {
    requestAnimationFrame(() => {
      (document.querySelector(`[data-wh-master-row="${index}"]`) as HTMLElement | null)?.focus();
    });
  };

  const selectWhAtFilteredIndex = (idx: number) => {
    const w = filteredWh[idx];
    if (!w) return;
    onSelectWh(w);
  };

  const addBin = async () => {
    if (creating || !selectedId) return;
    const code = binCode.trim().toUpperCase();
    if (!code) return;
    setBinSaving(true);
    setError(null);
    try {
      await createLocation({
        warehouseId: selectedId,
        code,
        zone: binZone.trim() || null,
        remark: binNote.trim() || null,
        name: null,
        isActive: true,
      });
      await loadLocations(selectedId);
      setBinCode('');
      setBinNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增庫位失敗');
    } finally {
      setBinSaving(false);
    }
  };

  const removeBin = async (binId: string) => {
    if (creating || !selectedId) return;
    setBinSaving(true);
    setError(null);
    try {
      await setLocationActive(binId, false);
      await loadLocations(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '停用庫位失敗');
    } finally {
      setBinSaving(false);
    }
  };

  const applySuggestion = (s: { code: string; zone: string }) => {
    setBinCode(s.code);
    setBinZone(s.zone);
  };

  const leftTitle = selectedWh && !creating ? `倉庫列表（已選：${selectedWh.name}）` : '倉庫列表';

  return (
    <>
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-stretch">
      {error ? (
        <div className="lg:col-span-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="glass-card flex max-h-[min(720px,calc(100vh-220px))] min-h-[420px] flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs tracking-[0.35em] text-muted-foreground">WAREHOUSE</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">{leftTitle}</h2>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => void reloadWarehouses()} disabled={loading}>
              重新載入
            </Button>
            <Button type="button" size="sm" className="gap-1" onClick={onAddWh} disabled={loading || savingWh}>
              <Plus className="size-4" aria-hidden />
              新增
            </Button>
          </div>
        </div>
        <Input
          id="wh-search"
          value={whSearch}
          onChange={(e) => setWhSearch(e.target.value)}
          placeholder="搜尋倉庫（代碼／名稱）"
          className="mb-3"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setWhSearch('');
            if (saveConfirmOpen) return;
            if (e.key === 'ArrowDown' && filteredWh.length > 0) {
              e.preventDefault();
              selectWhAtFilteredIndex(0);
              focusWhRow(0);
            }
            if (e.key === 'ArrowRight' && (creating || selectedWh)) {
              e.preventDefault();
              document.getElementById('wh-code')?.focus();
            }
          }}
        />
        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="space-y-2 pb-1">
            {loading ? (
              <p className="text-sm text-muted-foreground">載入中…</p>
            ) : (
              filteredWh.map((w, i) => {
                const active = !creating && selectedId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    tabIndex={-1}
                    data-wh-master-row={i}
                    onClick={() => onSelectWh(w)}
                    onKeyDown={(e) => {
                      if (saveConfirmOpen) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (i < filteredWh.length - 1) {
                          selectWhAtFilteredIndex(i + 1);
                          focusWhRow(i + 1);
                        } else if (creating || selectedWh) {
                          document.getElementById('wh-code')?.focus();
                        }
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (i > 0) {
                          selectWhAtFilteredIndex(i - 1);
                          focusWhRow(i - 1);
                        } else {
                          document.getElementById('wh-search')?.focus();
                        }
                      }
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        if (creating || selectedWh) document.getElementById('wh-code')?.focus();
                      }
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        document.getElementById('wh-search')?.focus();
                      }
                    }}
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
              })
            )}
            {!loading && filteredWh.length === 0 ? (
              <p className="text-sm text-muted-foreground">尚無倉庫資料，請按「新增」或確認 API／權限。</p>
            ) : null}
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
                onClick={() => {
                  if (creating ? !detailDraft.code.trim() || !detailDraft.name.trim() : !selectedWh || !detailDirty)
                    return;
                  setSaveConfirmOpen(true);
                }}
                disabled={
                  savingWh ||
                  (creating
                    ? !detailDraft.code.trim() || !detailDraft.name.trim()
                    : !selectedWh || !detailDirty)
                }
              >
                {savingWh ? '儲存中…' : '儲存'}
              </Button>
            </div>
          </div>

          {!creating && !selectedWh ? (
            <p className="text-sm text-muted-foreground">請從左側選擇倉庫，或點「新增」。</p>
          ) : (
            <div
              className="grid gap-4 sm:grid-cols-2"
              onKeyDownCapture={(e) => {
                if (saveConfirmOpen) return;
                const id = getFieldIdFromEventTarget(e.target);
                if (e.key === 'ArrowLeft' && id === 'wh-code') {
                  e.preventDefault();
                  if (selectedWhIndex >= 0) focusWhRow(selectedWhIndex);
                  else document.getElementById('wh-search')?.focus();
                  return;
                }
                handleMasterFieldKeyDown(e, WH_FIELD_ORDER, {
                  enabled: true,
                  onLastField: () => setSaveConfirmOpen(true),
                  multilineFieldIds: new Set(['wh-remark']),
                });
              }}
            >
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="wh-remark">備註</Label>
                <Textarea
                  id="wh-remark"
                  value={detailDraft.remark}
                  onChange={(e) => setDetailDraft((d) => ({ ...d, remark: e.target.value }))}
                  rows={3}
                  className="min-h-[80px] resize-y"
                  placeholder="選填"
                />
              </div>
              <div className="flex items-end gap-2 pb-2 sm:col-span-2">
                <label htmlFor="wh-active" className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    id="wh-active"
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={detailDraft.isActive}
                    onChange={(e) => setDetailDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  />
                  啟用
                </label>
              </div>
            </div>
          )}
        </section>

        <section className="glass-card flex min-h-[280px] flex-1 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="mb-3 border-b border-border/60 pb-3">
            <p className="text-xs tracking-[0.35em] text-muted-foreground">BINS</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">此倉庫庫位</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              輸入代碼後加入；可點選下方範本帶入（寫入 nx00_location）。
            </p>
          </div>

          {creating || !selectedId ? (
            <p className="text-sm text-muted-foreground">請先建立或選取倉庫後，再維護庫位。</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {BIN_SUGGESTIONS.map((s) => (
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
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto"
                  onClick={() => void addBin()}
                  disabled={binSaving || locLoading}
                >
                  {binSaving ? '處理中…' : '加入庫位'}
                </Button>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <Input
                  value={binFilter}
                  onChange={(e) => setBinFilter(e.target.value)}
                  placeholder="在庫位清單內搜尋…"
                  className="max-w-sm"
                />
                {locLoading ? <span className="text-xs text-muted-foreground">庫位載入中…</span> : null}
              </div>
              <ScrollArea className="min-h-0 flex-1 pr-2">
                <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
                  {binsShown.map((b) => (
                    <div
                      key={b.id}
                      className="flex max-w-full items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-sm"
                    >
                      <span className="font-mono text-xs">{b.code}</span>
                      <span className="text-xs text-muted-foreground">{b.zone ?? '—'}</span>
                      {b.remark ? <span className="text-xs text-muted-foreground">· {b.remark}</span> : null}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => void removeBin(b.id)}
                        disabled={binSaving}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {binsShown.length === 0 && !locLoading ? (
                    <span className="text-xs text-muted-foreground">尚無啟用庫位，請於上方新增。</span>
                  ) : null}
                </div>
              </ScrollArea>
            </>
          )}
        </section>
      </div>
    </div>
    <MasterSaveConfirmDialog
      open={saveConfirmOpen}
      onOpenChange={setSaveConfirmOpen}
      onConfirm={() => void performSaveWh()}
    />
    </>
  );
}
