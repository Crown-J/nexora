/**
 * 倉庫／庫位：Tab（倉庫｜庫位）+ LIST+SLIDE（與零件主檔一致）
 * - 倉庫：GET/POST/PUT /warehouse
 * - 庫位：list 可不帶 warehouseId；GET/POST/PUT/PATCH /location
 */

'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { fetchAllPages } from '@data/api/fetchAllPages';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { createWarehouse, listWarehouses, updateWarehouse, type WarehouseDto } from '@data/endpoints/base/api/warehouse';
import {
  createLocation,
  listLocation,
  setLocationActive,
  updateLocation,
} from '@data/endpoints/shared/master/location/api/location';
import type { LocationDto } from '@data/types/shared/master/location';
import { BaseMasterSlideAside, useMasterSlideDetailEffects } from '@/features/base/shell/BaseMasterSlideAside';

const PAGE_SIZE = 10;

/** 庫位新增時快速帶入（僅前端預填） */
const BIN_SUGGESTIONS: { code: string; zone: string }[] = [
  { code: 'A-01-01', zone: 'A 區' },
  { code: 'A-01-02', zone: 'A 區' },
  { code: 'B-02-01', zone: 'B 區' },
  { code: 'RCV-01', zone: '收貨' },
];

type WhDraft = { code: string; name: string; remark: string; isActive: boolean };

function emptyWh(): WhDraft {
  return { code: '', name: '', remark: '', isActive: true };
}

function whFromDto(w: WarehouseDto): WhDraft {
  return {
    code: w.code,
    name: w.name,
    remark: w.remark ?? '',
    isActive: w.isActive,
  };
}

type LocDraft = {
  warehouseId: string;
  code: string;
  name: string;
  zone: string;
  remark: string;
  isActive: boolean;
};

function emptyLoc(): LocDraft {
  return { warehouseId: '', code: '', name: '', zone: '', remark: '', isActive: true };
}

function locFromDto(l: LocationDto): LocDraft {
  return {
    warehouseId: l.warehouseId,
    code: l.code,
    name: l.name ?? '',
    zone: l.zone ?? '',
    remark: l.remark ?? '',
    isActive: l.isActive,
  };
}

const WH_LIST_PREF_KEY = 'base.warehouse.listcols';
const WH_COLS = ['code', 'name', 'isActive'] as const;
type WhListColKey = (typeof WH_COLS)[number];
type WhSortKey = WhListColKey;
type WhSortDir = 'asc' | 'desc';

const WH_COL_DEF: Record<WhListColKey, { label: string; locked?: boolean }> = {
  code: { label: '代碼', locked: true },
  name: { label: '名稱' },
  isActive: { label: '狀態' },
};

type WhListColPref = { visibleCols: WhListColKey[]; colOrder: WhListColKey[] };
const WH_DEFAULT_PREF: WhListColPref = {
  visibleCols: [...WH_COLS],
  colOrder: [...WH_COLS],
};

function normalizeWhColPref(raw: WhListColPref): WhListColPref {
  const order = WH_COLS.filter((k) => raw.colOrder.includes(k));
  for (const k of WH_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => WH_COLS.includes(k));
  if (!vis.includes('code')) vis = ['code', ...vis];
  return { colOrder: order, visibleCols: vis };
}

const LOC_LIST_PREF_KEY = 'base.location.listcols';
const LOC_COLS = ['warehouse', 'code', 'zone', 'isActive'] as const;
type LocListColKey = (typeof LOC_COLS)[number];
type LocSortKey = LocListColKey;
type LocSortDir = 'asc' | 'desc';

const LOC_COL_DEF: Record<LocListColKey, { label: string; locked?: boolean }> = {
  warehouse: { label: '倉庫', locked: true },
  code: { label: '庫位代碼' },
  zone: { label: '區域' },
  isActive: { label: '狀態' },
};

type LocListColPref = { visibleCols: LocListColKey[]; colOrder: LocListColKey[] };
const LOC_DEFAULT_PREF: LocListColPref = {
  visibleCols: [...LOC_COLS],
  colOrder: [...LOC_COLS],
};

function normalizeLocColPref(raw: LocListColPref): LocListColPref {
  const order = LOC_COLS.filter((k) => raw.colOrder.includes(k));
  for (const k of LOC_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => LOC_COLS.includes(k));
  if (!vis.includes('warehouse')) vis = ['warehouse', ...vis];
  return { colOrder: order, visibleCols: vis };
}

function WarehouseTab({
  warehouses,
  setWarehouses,
  loading,
  error,
  onReload,
}: {
  warehouses: WarehouseDto[];
  setWarehouses: Dispatch<SetStateAction<WarehouseDto[]>>;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
}) {
  const [keyword, setKeyword] = useState('');
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [sort, setSort] = useState<{ key: WhSortKey; dir: WhSortDir }>({ key: 'code', dir: 'asc' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WhDraft>(() => emptyWh());
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('main');
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const colPickerWrapRef = useRef<HTMLDivElement>(null);

  const { value: colPref, setValue: setColPref } = useListLocalPref<WhListColPref>(
    WH_LIST_PREF_KEY,
    1,
    WH_DEFAULT_PREF,
  );
  const listCols = useMemo(() => normalizeWhColPref(colPref), [colPref]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return warehouses.filter((w) => {
      if (k) {
        const blob = `${w.code} ${w.name} ${w.remark ?? ''}`.toLowerCase();
        if (!blob.includes(k)) return false;
      }
      if (fCode.trim() && !w.code.toLowerCase().includes(fCode.trim().toLowerCase())) return false;
      if (fName.trim() && !w.name.includes(fName.trim())) return false;
      return true;
    });
  }, [warehouses, keyword, fCode, fName]);

  const toggleSort = (key: WhSortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sk = sort.key;
    const out = [...filtered];
    out.sort((a, b) => {
      switch (sk) {
        case 'code':
          return mult * a.code.localeCompare(b.code, 'en');
        case 'name':
          return mult * a.name.localeCompare(b.name, 'zh-Hant');
        case 'isActive':
          return mult * ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
        default:
          return 0;
      }
    });
    return out;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, safePage]);

  const filterKey = `${keyword}|${fCode}|${fName}`;
  const prevFilterKeyRef = useRef('');
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPage(1);
      return;
    }
    setPage((p) => Math.min(p, totalPages));
  }, [filterKey, totalPages]);

  const selected = useMemo(
    () => (selectedId ? warehouses.find((w) => w.id === selectedId) ?? null : null),
    [warehouses, selectedId],
  );

  const panelOpen = creating || selectedId != null;
  const orderedVisibleCols = useMemo(
    () => listCols.colOrder.filter((k) => listCols.visibleCols.includes(k)),
    [listCols.colOrder, listCols.visibleCols],
  );

  const selectedIdxSorted = useMemo(
    () => (selectedId ? sortedRows.findIndex((w) => w.id === selectedId) : -1),
    [sortedRows, selectedId],
  );

  const closeDetailFull = useCallback(() => {
    setCreating(false);
    setEditing(false);
    setSelectedId(null);
    setDetailTab('main');
    setDetailFullscreen(false);
    setSaveConfirmOpen(false);
    setLocalError(null);
  }, []);

  useMasterSlideDetailEffects(panelOpen, closeDetailFull, detailFullscreen, setDetailFullscreen, [selectedId, creating]);

  const goDetailPrev = useCallback(() => {
    if (creating || selectedIdxSorted <= 0) return;
    const prev = sortedRows[selectedIdxSorted - 1];
    if (!prev) return;
    setSelectedId(prev.id);
    setCreating(false);
    setEditing(false);
  }, [creating, selectedIdxSorted, sortedRows]);

  const goDetailNext = useCallback(() => {
    if (creating || selectedIdxSorted < 0 || selectedIdxSorted >= sortedRows.length - 1) return;
    const next = sortedRows[selectedIdxSorted + 1];
    if (!next) return;
    setSelectedId(next.id);
    setCreating(false);
    setEditing(false);
  }, [creating, selectedIdxSorted, sortedRows]);

  useEffect(() => {
    if (creating) {
      setDraft(emptyWh());
      return;
    }
    if (selected) setDraft(whFromDto(selected));
  }, [creating, selectedId, selected]);

  const formValues = creating || editing ? draft : selected ? whFromDto(selected) : emptyWh();
  const readonlyFieldCls = 'bg-muted/40 text-muted-foreground cursor-default';

  const err = localError || error;

  const onRowClick = (id: string) => {
    if (id === selectedId && !creating) {
      closeDetailFull();
      return;
    }
    setSelectedId(id);
    setCreating(false);
    setEditing(false);
    setLocalError(null);
  };

  const onAdd = () => {
    setSelectedId(null);
    setCreating(true);
    setEditing(true);
    setDraft(emptyWh());
    setLocalError(null);
  };

  const onEdit = () => {
    if (!selected) return;
    setEditing(true);
    setDraft(whFromDto(selected));
  };

  const onCancel = () => {
    if (creating) {
      closeDetailFull();
      return;
    }
    setEditing(false);
  };

  const performSave = async () => {
    const code = draft.code.trim().toUpperCase();
    const name = draft.name.trim();
    if (!code || !name) return;
    setSaving(true);
    setLocalError(null);
    setSaveConfirmOpen(false);
    try {
      const remark = draft.remark.trim() || null;
      if (creating) {
        const dto = await createWarehouse({
          code,
          name,
          remark,
          isActive: draft.isActive,
        });
        setWarehouses((prev) => [...prev, dto].sort((a, b) => a.code.localeCompare(b.code)));
        setCreating(false);
        setEditing(false);
        setSelectedId(dto.id);
        return;
      }
      if (!selectedId) return;
      const dto = await updateWarehouse(selectedId, {
        code,
        name,
        remark,
        isActive: draft.isActive,
      });
      setWarehouses((prev) => prev.map((w) => (w.id === selectedId ? dto : w)));
      setEditing(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : '儲存倉庫失敗');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!colPickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = colPickerWrapRef.current;
      if (el && !el.contains(e.target as Node)) setColPickerOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [colPickerOpen]);

  const sortIcon = (key: WhSortKey) => {
    if (sort.key !== key) return <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />;
    return sort.dir === 'asc' ? (
      <ArrowUp className="size-3.5" aria-hidden />
    ) : (
      <ArrowDown className="size-3.5" aria-hidden />
    );
  };

  const renderBodyCell = (w: WarehouseDto, key: WhListColKey) => {
    switch (key) {
      case 'code':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 font-mono text-xs text-foreground">
            {w.code}
          </td>
        );
      case 'name':
        return (
          <td key={key} className="max-w-[220px] truncate px-2 py-2.5 text-foreground">
            {w.name}
          </td>
        );
      case 'isActive':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5">
            <span
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-md text-xs font-medium',
                w.isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/15 text-destructive',
              )}
            >
              {w.isActive ? '✓' : '×'}
            </span>
          </td>
        );
      default:
        return null;
    }
  };

  const filterTh = (key: WhListColKey) => {
    if (key === 'code') {
      return (
        <th key={`f-${key}`} className="p-2">
          <Input
            value={fCode}
            onChange={(e) => setFCode(e.target.value)}
            placeholder="篩選"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      );
    }
    if (key === 'name') {
      return (
        <th key={`f-${key}`} className="p-2">
          <Input
            value={fName}
            onChange={(e) => setFName(e.target.value)}
            placeholder="篩選"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      );
    }
    return <th key={`f-${key}`} className="p-2" />;
  };

  const tableMinW = Math.max(360, 32 + orderedVisibleCols.length * 100 + 40);

  return (
    <>
      <div className="relative flex flex-col gap-4">
        {err ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </div>
        ) : null}

        <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER · 倉庫</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋</h2>
          <div className="mt-4 max-w-md">
            <Label htmlFor="wh-tab-keyword">關鍵字</Label>
            <Input
              id="wh-tab-keyword"
              className="mt-2"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="代碼、名稱、備註…"
              autoComplete="off"
            />
          </div>
        </section>

        <section className="glass-card flex min-h-[min(420px,70dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 shadow-sm lg:min-h-[420px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
            <div className="relative flex flex-wrap items-center gap-2 border-b border-border/60 pb-3" ref={colPickerWrapRef}>
              <Button type="button" size="sm" variant="default" onClick={onAdd} disabled={loading || saving}>
                新增
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => void onReload()} disabled={loading}>
                重新載入
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1 px-2"
                onClick={() => setColPickerOpen((o) => !o)}
                aria-expanded={colPickerOpen}
              >
                <Columns3 className="size-4" aria-hidden />
                欄位
              </Button>

              {colPickerOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,320px)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">顯示欄位（可拖曳排序）</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setColPref({ visibleCols: [...WH_COLS], colOrder: [...WH_COLS] })}
                    >
                      重置
                    </Button>
                  </div>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {listCols.colOrder.map((key) => {
                      const def = WH_COL_DEF[key];
                      const checked = listCols.visibleCols.includes(key);
                      const locked = Boolean(def.locked);
                      return (
                        <div
                          key={key}
                          draggable
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-card px-2 py-2 text-xs"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', key);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const from = e.dataTransfer.getData('text/plain') as WhListColKey;
                            if (!WH_COLS.includes(from)) return;
                            setColPref((p) => {
                              const norm = normalizeWhColPref(p);
                              const fromIdx = norm.colOrder.indexOf(from);
                              const toIdx = norm.colOrder.indexOf(key);
                              if (fromIdx < 0 || toIdx < 0) return norm;
                              return { ...norm, colOrder: arrayMove(norm.colOrder, fromIdx, toIdx) };
                            });
                          }}
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              className="size-3.5 rounded border border-input accent-primary"
                              checked={locked ? true : checked}
                              disabled={locked}
                              onChange={() => {
                                if (locked) return;
                                setColPref((p) => {
                                  const norm = normalizeWhColPref(p);
                                  const has = norm.visibleCols.includes(key);
                                  const nextVis = has
                                    ? norm.visibleCols.filter((k) => k !== key)
                                    : [...norm.visibleCols, key];
                                  return normalizeWhColPref({ ...norm, visibleCols: nextVis });
                                });
                              }}
                            />
                            <span>{def.label}</span>
                          </label>
                          <span className="text-muted-foreground" aria-hidden>
                            ⠿
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-1 border-l border-border/60 pl-2 ml-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 px-2"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  上一頁
                </Button>
                <span className="px-2 text-xs text-muted-foreground tabular-nums">
                  第 {safePage} / {totalPages} 頁
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 px-2"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  下一頁
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {loading ? '載入中…' : `共 ${sortedRows.length} 筆 · 本頁 ${pageRows.length} 筆`}
              </span>
            </div>

            <div className="mt-3 min-h-0 min-w-0 flex-1 overflow-auto overscroll-x-contain pr-2">
              <table className="w-full border-collapse text-sm" style={{ minWidth: tableMinW }}>
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-left text-muted-foreground">
                      {orderedVisibleCols.map((key) => (
                        <th key={key} className="px-2 py-2.5">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                            onClick={() => toggleSort(key)}
                          >
                            {WH_COL_DEF[key].label}
                            {sortIcon(key)}
                          </button>
                        </th>
                      ))}
                      <th className="w-10 px-1 py-2.5" aria-hidden />
                    </tr>
                    <tr className="border-b border-border/60 bg-secondary/20">
                      {orderedVisibleCols.map((key) => filterTh(key))}
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((w) => {
                      const isSel = w.id === selectedId;
                      return (
                        <tr
                          key={w.id}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            'cursor-pointer border-b border-border/40 transition-colors',
                            isSel ? 'bg-primary/10' : 'hover:bg-secondary/40',
                          )}
                          onClick={() => onRowClick(w.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(w.id);
                            }
                          }}
                        >
                          {orderedVisibleCols.map((k) => renderBodyCell(w, k))}
                          <td className="px-1 py-2.5 text-muted-foreground">
                            <ChevronRight className="mx-auto size-4 opacity-50" aria-hidden />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <BaseMasterSlideAside
        open={panelOpen}
        detailFullscreen={detailFullscreen}
        onToggleFullscreen={() => setDetailFullscreen((v) => !v)}
        onClose={closeDetailFull}
        titleId="wh-slide-title"
        title={creating ? '新增倉庫' : selected?.code ?? '倉庫明細'}
        subtitle={!creating && selected ? selected.name : undefined}
        navPrev={
          !creating && selectedIdxSorted >= 0
            ? { onClick: goDetailPrev, disabled: selectedIdxSorted <= 0 }
            : undefined
        }
        navNext={
          !creating && selectedIdxSorted >= 0
            ? { onClick: goDetailNext, disabled: selectedIdxSorted >= sortedRows.length - 1 }
            : undefined
        }
        footer={
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
            {creating || editing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!draft.code.trim() || !draft.name.trim()) return;
                    setSaveConfirmOpen(true);
                  }}
                  disabled={saving}
                >
                  {saving ? '儲存中…' : '儲存'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
                  取消
                </Button>
              </>
            ) : selected ? (
              <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
                編輯
              </Button>
            ) : null}
          </div>
        }
      >
        <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4 flex flex-col gap-0">
          <TabsList className="h-auto w-full shrink-0 flex-wrap justify-start gap-1 bg-muted/50 p-1">
            <TabsTrigger value="main" className="flex-none">
              基本資料
            </TabsTrigger>
          </TabsList>
          <TabsContent value="main" className="mt-3 outline-none">
            <div className="space-y-3 pb-28 lg:pb-6">
              <div className="space-y-2">
                <Label htmlFor="wh-slide-code">倉庫代碼</Label>
                <Input
                  id="wh-slide-code"
                  value={formValues.code}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-slide-name">倉庫名稱</Label>
                <Input
                  id="wh-slide-name"
                  value={formValues.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-slide-remark">備註</Label>
                <Textarea
                  id="wh-slide-remark"
                  value={formValues.remark}
                  onChange={(e) => setDraft((d) => ({ ...d, remark: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={cn('min-h-[80px] resize-y', !creating && !editing && readonlyFieldCls)}
                  rows={3}
                  placeholder="選填"
                />
              </div>
              <label htmlFor="wh-slide-active" className="flex items-center gap-2 text-sm">
                <input
                  id="wh-slide-active"
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={formValues.isActive}
                  disabled={!creating && !editing}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
                啟用
              </label>
            </div>
          </TabsContent>
        </Tabs>

        {!creating && !editing && selected ? (
          <Button
            type="button"
            size="icon"
            className="fixed bottom-6 right-5 z-[60] size-14 rounded-full shadow-lg lg:hidden"
            aria-label="編輯"
            onClick={onEdit}
          >
            <Pencil className="size-6" />
          </Button>
        ) : null}
      </BaseMasterSlideAside>

      <MasterSaveConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        onConfirm={() => void performSave()}
      />
    </>
  );
}

function LocationTab({
  warehouses,
  locations,
  setLocations,
  loading,
  error,
  onReload,
}: {
  warehouses: WarehouseDto[];
  locations: LocationDto[];
  setLocations: Dispatch<SetStateAction<LocationDto[]>>;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
}) {
  const whMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w] as const)), [warehouses]);

  const whLabel = useCallback(
    (warehouseId: string) => {
      const w = whMap.get(warehouseId);
      return w ? `${w.code} · ${w.name}` : warehouseId;
    },
    [whMap],
  );

  const [keyword, setKeyword] = useState('');
  const [fWh, setFWh] = useState('');
  const [fCode, setFCode] = useState('');
  const [sort, setSort] = useState<{ key: LocSortKey; dir: LocSortDir }>({ key: 'code', dir: 'asc' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LocDraft>(() => emptyLoc());
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('main');
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const colPickerWrapRef = useRef<HTMLDivElement>(null);

  const { value: colPref, setValue: setColPref } = useListLocalPref<LocListColPref>(
    LOC_LIST_PREF_KEY,
    1,
    LOC_DEFAULT_PREF,
  );
  const listCols = useMemo(() => normalizeLocColPref(colPref), [colPref]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return locations.filter((l) => {
      if (k) {
        const wl = whLabel(l.warehouseId).toLowerCase();
        const blob = `${wl} ${l.code} ${l.zone ?? ''} ${l.remark ?? ''}`.toLowerCase();
        if (!blob.includes(k)) return false;
      }
      if (fWh.trim()) {
        const q = fWh.trim().toLowerCase();
        if (!whLabel(l.warehouseId).toLowerCase().includes(q) && !l.warehouseId.toLowerCase().includes(q)) return false;
      }
      if (fCode.trim() && !l.code.toLowerCase().includes(fCode.trim().toLowerCase())) return false;
      return true;
    });
  }, [locations, keyword, fWh, fCode, whLabel]);

  const toggleSort = (key: LocSortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sk = sort.key;
    const out = [...filtered];
    out.sort((a, b) => {
      switch (sk) {
        case 'warehouse':
          return mult * whLabel(a.warehouseId).localeCompare(whLabel(b.warehouseId), 'zh-Hant');
        case 'code':
          return mult * a.code.localeCompare(b.code, 'en');
        case 'zone':
          return mult * (a.zone ?? '').localeCompare(b.zone ?? '', 'zh-Hant');
        case 'isActive':
          return mult * ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
        default:
          return 0;
      }
    });
    return out;
  }, [filtered, sort, whLabel]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, safePage]);

  const filterKey = `${keyword}|${fWh}|${fCode}`;
  const prevFilterKeyRef = useRef('');
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPage(1);
      return;
    }
    setPage((p) => Math.min(p, totalPages));
  }, [filterKey, totalPages]);

  const selected = useMemo(
    () => (selectedId ? locations.find((l) => l.id === selectedId) ?? null : null),
    [locations, selectedId],
  );

  const panelOpen = creating || selectedId != null;
  const orderedVisibleCols = useMemo(
    () => listCols.colOrder.filter((k) => listCols.visibleCols.includes(k)),
    [listCols.colOrder, listCols.visibleCols],
  );

  const selectedIdxSorted = useMemo(
    () => (selectedId ? sortedRows.findIndex((l) => l.id === selectedId) : -1),
    [sortedRows, selectedId],
  );

  const closeDetailFull = useCallback(() => {
    setCreating(false);
    setEditing(false);
    setSelectedId(null);
    setDetailTab('main');
    setDetailFullscreen(false);
    setSaveConfirmOpen(false);
    setLocalError(null);
  }, []);

  useMasterSlideDetailEffects(panelOpen, closeDetailFull, detailFullscreen, setDetailFullscreen, [selectedId, creating]);

  const goDetailPrev = useCallback(() => {
    if (creating || selectedIdxSorted <= 0) return;
    const prev = sortedRows[selectedIdxSorted - 1];
    if (!prev) return;
    setSelectedId(prev.id);
    setCreating(false);
    setEditing(false);
  }, [creating, selectedIdxSorted, sortedRows]);

  const goDetailNext = useCallback(() => {
    if (creating || selectedIdxSorted < 0 || selectedIdxSorted >= sortedRows.length - 1) return;
    const next = sortedRows[selectedIdxSorted + 1];
    if (!next) return;
    setSelectedId(next.id);
    setCreating(false);
    setEditing(false);
  }, [creating, selectedIdxSorted, sortedRows]);

  useEffect(() => {
    if (creating) {
      const firstWh = warehouses[0]?.id ?? '';
      setDraft({ ...emptyLoc(), warehouseId: firstWh });
      return;
    }
    if (selected) setDraft(locFromDto(selected));
  }, [creating, selectedId, selected, warehouses]);

  const formValues = creating || editing ? draft : selected ? locFromDto(selected) : emptyLoc();
  const readonlyFieldCls = 'bg-muted/40 text-muted-foreground cursor-default';
  const selectCls =
    'nx-native-select flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

  const err = localError || error;

  const onRowClick = (id: string) => {
    if (id === selectedId && !creating) {
      closeDetailFull();
      return;
    }
    setSelectedId(id);
    setCreating(false);
    setEditing(false);
    setLocalError(null);
  };

  const onAdd = () => {
    setSelectedId(null);
    setCreating(true);
    setEditing(true);
    const firstWh = warehouses[0]?.id ?? '';
    setDraft({ ...emptyLoc(), warehouseId: firstWh });
    setLocalError(null);
  };

  const onEdit = () => {
    if (!selected) return;
    setEditing(true);
    setDraft(locFromDto(selected));
  };

  const onCancel = () => {
    if (creating) {
      closeDetailFull();
      return;
    }
    setEditing(false);
  };

  const performSave = async () => {
    const wid = draft.warehouseId.trim();
    const code = draft.code.trim().toUpperCase();
    if (!wid || !code) return;
    setSaving(true);
    setLocalError(null);
    setSaveConfirmOpen(false);
    try {
      if (creating) {
        const dto = await createLocation({
          warehouseId: wid,
          code,
          name: draft.name.trim() || null,
          zone: draft.zone.trim() || null,
          remark: draft.remark.trim() || null,
          isActive: draft.isActive,
        });
        setLocations((prev) => [...prev, dto]);
        setCreating(false);
        setEditing(false);
        setSelectedId(dto.id);
        return;
      }
      if (!selectedId) return;
      const dto = await updateLocation(selectedId, {
        warehouseId: wid,
        code,
        name: draft.name.trim() || null,
        zone: draft.zone.trim() || null,
        remark: draft.remark.trim() || null,
        isActive: draft.isActive,
      });
      setLocations((prev) => prev.map((l) => (l.id === selectedId ? dto : l)));
      setEditing(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : '儲存庫位失敗');
    } finally {
      setSaving(false);
    }
  };

  const deactivateSelected = async () => {
    if (!selectedId || creating) return;
    setSaving(true);
    setLocalError(null);
    try {
      await setLocationActive(selectedId, false);
      setLocations((prev) => prev.map((l) => (l.id === selectedId ? { ...l, isActive: false } : l)));
      setEditing(false);
      setDraft((d) => ({ ...d, isActive: false }));
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : '停用庫位失敗');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!colPickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = colPickerWrapRef.current;
      if (el && !el.contains(e.target as Node)) setColPickerOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [colPickerOpen]);

  const sortIcon = (key: LocSortKey) => {
    if (sort.key !== key) return <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />;
    return sort.dir === 'asc' ? (
      <ArrowUp className="size-3.5" aria-hidden />
    ) : (
      <ArrowDown className="size-3.5" aria-hidden />
    );
  };

  const renderBodyCell = (l: LocationDto, key: LocListColKey) => {
    switch (key) {
      case 'warehouse':
        return (
          <td key={key} className="max-w-[200px] truncate px-2 py-2.5 text-xs text-foreground">
            {whLabel(l.warehouseId)}
          </td>
        );
      case 'code':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 font-mono text-xs text-foreground">
            {l.code}
          </td>
        );
      case 'zone':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {l.zone ?? '—'}
          </td>
        );
      case 'isActive':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5">
            <span
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-md text-xs font-medium',
                l.isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/15 text-destructive',
              )}
            >
              {l.isActive ? '✓' : '×'}
            </span>
          </td>
        );
      default:
        return null;
    }
  };

  const filterTh = (key: LocListColKey) => {
    if (key === 'warehouse') {
      return (
        <th key={`f-${key}`} className="p-2">
          <Input
            value={fWh}
            onChange={(e) => setFWh(e.target.value)}
            placeholder="篩選倉庫"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      );
    }
    if (key === 'code') {
      return (
        <th key={`f-${key}`} className="p-2">
          <Input
            value={fCode}
            onChange={(e) => setFCode(e.target.value)}
            placeholder="篩選代碼"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      );
    }
    return <th key={`f-${key}`} className="p-2" />;
  };

  const tableMinW = Math.max(400, 32 + orderedVisibleCols.length * 96 + 40);
  const defaultWhId = warehouses[0]?.id ?? '';

  return (
    <>
      <div className="relative flex flex-col gap-4">
        {err ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </div>
        ) : null}

        <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER · 庫位</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋</h2>
          <div className="mt-4 max-w-md">
            <Label htmlFor="loc-tab-keyword">關鍵字</Label>
            <Input
              id="loc-tab-keyword"
              className="mt-2"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="倉庫、庫位代碼、區域…"
              autoComplete="off"
            />
          </div>
          {warehouses.length === 0 ? (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              尚無倉庫主檔，請先到「倉庫」分頁建立倉庫後再新增庫位。
            </p>
          ) : null}
        </section>

        <section className="glass-card flex min-h-[min(420px,70dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 shadow-sm lg:min-h-[420px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
            <div className="relative flex flex-wrap items-center gap-2 border-b border-border/60 pb-3" ref={colPickerWrapRef}>
              <Button type="button" size="sm" variant="default" onClick={onAdd} disabled={loading || saving || !defaultWhId}>
                新增
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => void onReload()} disabled={loading}>
                重新載入
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1 px-2"
                onClick={() => setColPickerOpen((o) => !o)}
                aria-expanded={colPickerOpen}
              >
                <Columns3 className="size-4" aria-hidden />
                欄位
              </Button>

              {colPickerOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,320px)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">顯示欄位（可拖曳排序）</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setColPref({ visibleCols: [...LOC_COLS], colOrder: [...LOC_COLS] })}
                    >
                      重置
                    </Button>
                  </div>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {listCols.colOrder.map((key) => {
                      const def = LOC_COL_DEF[key];
                      const checked = listCols.visibleCols.includes(key);
                      const locked = Boolean(def.locked);
                      return (
                        <div
                          key={key}
                          draggable
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-card px-2 py-2 text-xs"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', key);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const from = e.dataTransfer.getData('text/plain') as LocListColKey;
                            if (!LOC_COLS.includes(from)) return;
                            setColPref((p) => {
                              const norm = normalizeLocColPref(p);
                              const fromIdx = norm.colOrder.indexOf(from);
                              const toIdx = norm.colOrder.indexOf(key);
                              if (fromIdx < 0 || toIdx < 0) return norm;
                              return { ...norm, colOrder: arrayMove(norm.colOrder, fromIdx, toIdx) };
                            });
                          }}
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              className="size-3.5 rounded border border-input accent-primary"
                              checked={locked ? true : checked}
                              disabled={locked}
                              onChange={() => {
                                if (locked) return;
                                setColPref((p) => {
                                  const norm = normalizeLocColPref(p);
                                  const has = norm.visibleCols.includes(key);
                                  const nextVis = has
                                    ? norm.visibleCols.filter((k) => k !== key)
                                    : [...norm.visibleCols, key];
                                  return normalizeLocColPref({ ...norm, visibleCols: nextVis });
                                });
                              }}
                            />
                            <span>{def.label}</span>
                          </label>
                          <span className="text-muted-foreground" aria-hidden>
                            ⠿
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-1 border-l border-border/60 pl-2 ml-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 px-2"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  上一頁
                </Button>
                <span className="px-2 text-xs text-muted-foreground tabular-nums">
                  第 {safePage} / {totalPages} 頁
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 px-2"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  下一頁
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {loading ? '載入中…' : `共 ${sortedRows.length} 筆 · 本頁 ${pageRows.length} 筆`}
              </span>
            </div>

            <div className="mt-3 min-h-0 min-w-0 flex-1 overflow-auto overscroll-x-contain pr-2">
              <table className="w-full border-collapse text-sm" style={{ minWidth: tableMinW }}>
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-left text-muted-foreground">
                      {orderedVisibleCols.map((key) => (
                        <th key={key} className="px-2 py-2.5">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                            onClick={() => toggleSort(key)}
                          >
                            {LOC_COL_DEF[key].label}
                            {sortIcon(key)}
                          </button>
                        </th>
                      ))}
                      <th className="w-10 px-1 py-2.5" aria-hidden />
                    </tr>
                    <tr className="border-b border-border/60 bg-secondary/20">
                      {orderedVisibleCols.map((key) => filterTh(key))}
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((l) => {
                      const isSel = l.id === selectedId;
                      return (
                        <tr
                          key={l.id}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            'cursor-pointer border-b border-border/40 transition-colors',
                            isSel ? 'bg-primary/10' : 'hover:bg-secondary/40',
                          )}
                          onClick={() => onRowClick(l.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(l.id);
                            }
                          }}
                        >
                          {orderedVisibleCols.map((k) => renderBodyCell(l, k))}
                          <td className="px-1 py-2.5 text-muted-foreground">
                            <ChevronRight className="mx-auto size-4 opacity-50" aria-hidden />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <BaseMasterSlideAside
        open={panelOpen}
        detailFullscreen={detailFullscreen}
        onToggleFullscreen={() => setDetailFullscreen((v) => !v)}
        onClose={closeDetailFull}
        titleId="loc-slide-title"
        title={creating ? '新增庫位' : selected?.code ?? '庫位明細'}
        subtitle={!creating && selected ? whLabel(selected.warehouseId) : undefined}
        navPrev={
          !creating && selectedIdxSorted >= 0
            ? { onClick: goDetailPrev, disabled: selectedIdxSorted <= 0 }
            : undefined
        }
        navNext={
          !creating && selectedIdxSorted >= 0
            ? { onClick: goDetailNext, disabled: selectedIdxSorted >= sortedRows.length - 1 }
            : undefined
        }
        footer={
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
            {creating || editing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!draft.warehouseId.trim() || !draft.code.trim()) return;
                    setSaveConfirmOpen(true);
                  }}
                  disabled={saving}
                >
                  {saving ? '儲存中…' : '儲存'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
                  取消
                </Button>
              </>
            ) : selected ? (
              <>
                <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
                  編輯
                </Button>
                {selected.isActive ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void deactivateSelected()} disabled={saving}>
                    停用
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        }
      >
        <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4 flex flex-col gap-0">
          <TabsList className="h-auto w-full shrink-0 flex-wrap justify-start gap-1 bg-muted/50 p-1">
            <TabsTrigger value="main" className="flex-none">
              基本資料
            </TabsTrigger>
          </TabsList>
          <TabsContent value="main" className="mt-3 outline-none">
            <div className="space-y-3 pb-28 lg:pb-6">
              {creating ? (
                <div className="flex flex-wrap gap-2">
                  {BIN_SUGGESTIONS.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/18"
                      onClick={() => setDraft((d) => ({ ...d, code: s.code, zone: s.zone }))}
                    >
                      {s.code}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="loc-slide-wh">倉庫</Label>
                <select
                  id="loc-slide-wh"
                  className={cn(selectCls, !creating && !editing && readonlyFieldCls)}
                  value={formValues.warehouseId}
                  disabled={(!creating && !editing) || warehouses.length === 0}
                  onChange={(e) => setDraft((d) => ({ ...d, warehouseId: e.target.value }))}
                >
                  <option value="">（請選擇）</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-slide-code">庫位代碼</Label>
                <Input
                  id="loc-slide-code"
                  value={formValues.code}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-slide-name">名稱（選填）</Label>
                <Input
                  id="loc-slide-name"
                  value={formValues.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-slide-zone">區域</Label>
                <Input
                  id="loc-slide-zone"
                  value={formValues.zone}
                  onChange={(e) => setDraft((d) => ({ ...d, zone: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-slide-remark">備註</Label>
                <Textarea
                  id="loc-slide-remark"
                  value={formValues.remark}
                  onChange={(e) => setDraft((d) => ({ ...d, remark: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={cn('min-h-[72px] resize-y', !creating && !editing && readonlyFieldCls)}
                  rows={2}
                  placeholder="選填"
                />
              </div>
              <label htmlFor="loc-slide-active" className="flex items-center gap-2 text-sm">
                <input
                  id="loc-slide-active"
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={formValues.isActive}
                  disabled={!creating && !editing}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
                啟用
              </label>
            </div>
          </TabsContent>
        </Tabs>

        {!creating && !editing && selected ? (
          <Button
            type="button"
            size="icon"
            className="fixed bottom-6 right-5 z-[60] size-14 rounded-full shadow-lg lg:hidden"
            aria-label="編輯"
            onClick={onEdit}
          >
            <Pencil className="size-6" />
          </Button>
        ) : null}
      </BaseMasterSlideAside>

      <MasterSaveConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        onConfirm={() => void performSave()}
      />
    </>
  );
}

export function BaseWarehouseLocationView() {
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [whLoading, setWhLoading] = useState(true);
  const [locLoading, setLocLoading] = useState(true);
  const [whError, setWhError] = useState<string | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const reloadWarehouses = useCallback(async () => {
    setWhLoading(true);
    setWhError(null);
    try {
      const whItems = await fetchAllPages((page, pageSize) => listWarehouses({ page, pageSize }), {
        pageSize: 100,
        maxPages: 50,
      });
      setWarehouses(whItems);
    } catch (e) {
      setWhError(e instanceof Error ? e.message : '載入倉庫失敗');
      setWarehouses([]);
    } finally {
      setWhLoading(false);
    }
  }, []);

  const reloadLocations = useCallback(async () => {
    setLocLoading(true);
    setLocError(null);
    try {
      const locItems = await fetchAllPages((page, pageSize) => listLocation({ page, pageSize }), {
        pageSize: 100,
        maxPages: 50,
      });
      setLocations(locItems);
    } catch (e) {
      setLocError(e instanceof Error ? e.message : '載入庫位失敗');
      setLocations([]);
    } finally {
      setLocLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadWarehouses();
    void reloadLocations();
  }, [reloadWarehouses, reloadLocations]);

  return (
    <Tabs defaultValue="warehouse" className="w-full gap-4">
      <TabsList className="w-full max-w-md">
        <TabsTrigger value="warehouse" className="flex-1">
          倉庫
        </TabsTrigger>
        <TabsTrigger value="location" className="flex-1">
          庫位
        </TabsTrigger>
      </TabsList>
      <TabsContent value="warehouse" className="mt-0 outline-none">
        <WarehouseTab
          warehouses={warehouses}
          setWarehouses={setWarehouses}
          loading={whLoading}
          error={whError}
          onReload={reloadWarehouses}
        />
      </TabsContent>
      <TabsContent value="location" className="mt-0 outline-none">
        <LocationTab
          warehouses={warehouses}
          locations={locations}
          setLocations={setLocations}
          loading={locLoading}
          error={locError}
          onReload={reloadLocations}
        />
      </TabsContent>
    </Tabs>
  );
}
