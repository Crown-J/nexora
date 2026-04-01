/**
 * 廠商／客戶主檔：Tab + LIST+SLIDE（與使用者主檔一致）；GET/POST/PUT /partner
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import {
  createPartner,
  listPartners,
  type PartnerDto,
  type PartnerType,
  updatePartner,
} from '@/features/base/api/partner';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { BaseMasterSlideAside, useMasterSlideDetailEffects } from '@/features/base/shell/BaseMasterSlideAside';

type TabKey = 'vendor' | 'customer';

function matchesTab(row: PartnerDto, tab: TabKey): boolean {
  if (tab === 'vendor') return row.partnerType === 'SUPPLIER' || row.partnerType === 'BOTH';
  return row.partnerType === 'CUSTOMER' || row.partnerType === 'BOTH';
}

function defaultPartnerType(tab: TabKey): PartnerType {
  return tab === 'vendor' ? 'SUPPLIER' : 'CUSTOMER';
}

const PARTNER_TYPE_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: 'SUPPLIER', label: '供應商' },
  { value: 'CUSTOMER', label: '客戶' },
  { value: 'BOTH', label: '供應商＋客戶' },
];

type Draft = {
  code: string;
  name: string;
  partnerType: PartnerType;
  contactName: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  remark: string;
  isActive: boolean;
};

function emptyDraft(tab: TabKey): Draft {
  return {
    code: '',
    name: '',
    partnerType: defaultPartnerType(tab),
    contactName: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    remark: '',
    isActive: true,
  };
}

function fromDto(d: PartnerDto): Draft {
  return {
    code: d.code,
    name: d.name,
    partnerType: d.partnerType,
    contactName: d.contactName ?? '',
    phone: d.phone ?? '',
    mobile: d.mobile ?? '',
    email: d.email ?? '',
    address: d.address ?? '',
    remark: d.remark ?? '',
    isActive: d.isActive,
  };
}

const PAGE_SIZE = 10;
const LIST_COL_PREF_KEY = 'base.partner.listcols';
const LIST_COL_PREF_VERSION = 1;
type ListColKey = 'code' | 'name' | 'partnerType' | 'phone' | 'isActive';
type SortKey = ListColKey;
type SortDir = 'asc' | 'desc';

const ALL_LIST_COLS: ListColKey[] = ['code', 'name', 'partnerType', 'phone', 'isActive'];
const COL_DEF: Record<ListColKey, { label: string; locked?: boolean }> = {
  code: { label: '代碼', locked: true },
  name: { label: '名稱' },
  partnerType: { label: '類型' },
  phone: { label: '電話' },
  isActive: { label: '狀態' },
};

type PartnerListColPref = { visibleCols: ListColKey[]; colOrder: ListColKey[] };
const DEFAULT_COL_PREF: PartnerListColPref = {
  visibleCols: [...ALL_LIST_COLS],
  colOrder: [...ALL_LIST_COLS],
};

function normalizeColPref(raw: PartnerListColPref): PartnerListColPref {
  const order = ALL_LIST_COLS.filter((k) => raw.colOrder.includes(k));
  for (const k of ALL_LIST_COLS) {
    if (!order.includes(k)) order.push(k);
  }
  let vis = raw.visibleCols.filter((k) => ALL_LIST_COLS.includes(k));
  if (!vis.includes('code')) vis = ['code', ...vis];
  return { colOrder: order, visibleCols: vis };
}

function typeLabel(t: PartnerType): string {
  return PARTNER_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

function PartnerPanel({
  tab,
  tabLabel,
  rows,
  setRows,
  reloadAll,
  loading,
  globalError,
}: {
  tab: TabKey;
  tabLabel: string;
  rows: PartnerDto[];
  setRows: Dispatch<SetStateAction<PartnerDto[]>>;
  reloadAll: () => Promise<void>;
  loading: boolean;
  globalError: string | null;
}) {
  const prefKey = `${LIST_COL_PREF_KEY}.${tab}`;
  const [keyword, setKeyword] = useState('');
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'code', dir: 'asc' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(tab));
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('main');
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const colPickerWrapRef = useRef<HTMLDivElement>(null);

  const { value: colPref, setValue: setColPref } = useListLocalPref<PartnerListColPref>(
    prefKey,
    LIST_COL_PREF_VERSION,
    DEFAULT_COL_PREF,
  );
  const listCols = useMemo(() => normalizeColPref(colPref), [colPref]);

  const scoped = useMemo(() => rows.filter((r) => matchesTab(r, tab)), [rows, tab]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return scoped.filter((r) => {
      if (k) {
        const blob = `${r.code} ${r.name} ${r.phone ?? ''} ${r.remark ?? ''} ${r.contactName ?? ''}`.toLowerCase();
        if (!blob.includes(k)) return false;
      }
      if (fCode.trim() && !r.code.toLowerCase().includes(fCode.trim().toLowerCase())) return false;
      if (fName.trim() && !r.name.includes(fName.trim())) return false;
      return true;
    });
  }, [scoped, keyword, fCode, fName]);

  const toggleSort = (key: SortKey) => {
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
        case 'partnerType':
          return mult * typeLabel(a.partnerType).localeCompare(typeLabel(b.partnerType), 'zh-Hant');
        case 'phone':
          return mult * (a.phone ?? '').localeCompare(b.phone ?? '', 'zh-Hant');
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
    () => (selectedId ? rows.find((r) => r.id === selectedId && matchesTab(r, tab)) ?? null : null),
    [rows, selectedId, tab],
  );

  const panelOpen = creating || selectedId != null;
  const orderedVisibleCols = useMemo(
    () => listCols.colOrder.filter((k) => listCols.visibleCols.includes(k)),
    [listCols.colOrder, listCols.visibleCols],
  );

  const selectedIdxSorted = useMemo(
    () => (selectedId ? sortedRows.findIndex((r) => r.id === selectedId) : -1),
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
      setDraft(emptyDraft(tab));
      return;
    }
    if (selected) setDraft(fromDto(selected));
  }, [creating, selectedId, selected, tab]);

  const formValues = creating || editing ? draft : selected ? fromDto(selected) : emptyDraft(tab);
  const readonlyFieldCls = 'bg-muted/40 text-muted-foreground cursor-default';
  const selectCls =
    'nx-native-select flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

  const errorText = localError || globalError;

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
    setDraft(emptyDraft(tab));
    setLocalError(null);
  };

  const onEdit = () => {
    if (!selected) return;
    setEditing(true);
    setDraft(fromDto(selected));
    setLocalError(null);
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
    if (!code) return;
    setSaving(true);
    setLocalError(null);
    setSaveConfirmOpen(false);
    try {
      const bodyBase = {
        code,
        name: draft.name.trim() || code,
        partnerType: draft.partnerType,
        contactName: draft.contactName.trim() || null,
        phone: draft.phone.trim() || null,
        mobile: draft.mobile.trim() || null,
        email: draft.email.trim() || null,
        address: draft.address.trim() || null,
        remark: draft.remark.trim() || null,
        isActive: draft.isActive,
      };
      if (creating) {
        const dto = await createPartner(bodyBase);
        setRows((prev) => [...prev, dto]);
        setSelectedId(dto.id);
        setCreating(false);
        setEditing(false);
        return;
      }
      if (!selectedId) return;
      const dto = await updatePartner(selectedId, bodyBase);
      setRows((prev) => prev.map((r) => (r.id === selectedId ? dto : r)));
      setEditing(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : '儲存失敗');
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

  const sortIcon = (key: SortKey) => {
    if (sort.key !== key) return <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />;
    return sort.dir === 'asc' ? (
      <ArrowUp className="size-3.5" aria-hidden />
    ) : (
      <ArrowDown className="size-3.5" aria-hidden />
    );
  };

  const renderBodyCell = (row: PartnerDto, key: ListColKey) => {
    switch (key) {
      case 'code':
        return (
          <td key={key} className="max-w-[100px] truncate px-2 py-2.5 font-mono text-xs text-foreground">
            {row.code}
          </td>
        );
      case 'name':
        return (
          <td key={key} className="max-w-[180px] truncate px-2 py-2.5 text-foreground">
            {row.name}
          </td>
        );
      case 'partnerType':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {typeLabel(row.partnerType)}
          </td>
        );
      case 'phone':
        return (
          <td key={key} className="max-w-[120px] truncate px-2 py-2.5 text-xs text-muted-foreground">
            {row.phone ?? '—'}
          </td>
        );
      case 'isActive':
        return (
          <td key={key} className="whitespace-nowrap px-2 py-2.5">
            <span
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-md text-xs font-medium',
                row.isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/15 text-destructive',
              )}
            >
              {row.isActive ? '✓' : '×'}
            </span>
          </td>
        );
      default:
        return null;
    }
  };

  const filterTh = (key: ListColKey) => {
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

  const tableMinW = Math.max(360, 32 + orderedVisibleCols.length * 88 + 40);
  const titleId = `pt-detail-${tab}`;

  return (
    <>
      <div className="relative flex flex-col gap-4">
        {errorText ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorText}
          </div>
        ) : null}

        <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER · {tabLabel}</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋</h2>
          <div className="mt-4 max-w-md">
            <Label htmlFor={`pt-k-${tab}`}>關鍵字</Label>
            <Input
              id={`pt-k-${tab}`}
              className="mt-2"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="代碼、名稱、電話、備註…"
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
              <Button type="button" size="sm" variant="ghost" onClick={() => void reloadAll()} disabled={loading}>
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
                      onClick={() => setColPref({ visibleCols: [...ALL_LIST_COLS], colOrder: [...ALL_LIST_COLS] })}
                    >
                      重置
                    </Button>
                  </div>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {listCols.colOrder.map((key) => {
                      const def = COL_DEF[key];
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
                            const from = e.dataTransfer.getData('text/plain') as ListColKey;
                            if (!ALL_LIST_COLS.includes(from)) return;
                            setColPref((p) => {
                              const norm = normalizeColPref(p);
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
                                  const norm = normalizeColPref(p);
                                  const has = norm.visibleCols.includes(key);
                                  const nextVis = has
                                    ? norm.visibleCols.filter((k) => k !== key)
                                    : [...norm.visibleCols, key];
                                  return normalizeColPref({ ...norm, visibleCols: nextVis });
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

            <ScrollArea className="mt-3 min-h-0 flex-1 pr-2">
              <div className="w-full overflow-x-auto">
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
                            {COL_DEF[key].label}
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
                    {pageRows.map((row) => {
                      const isSel = row.id === selectedId;
                      return (
                        <tr
                          key={row.id}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            'cursor-pointer border-b border-border/40 transition-colors',
                            isSel ? 'bg-primary/10' : 'hover:bg-secondary/40',
                          )}
                          onClick={() => onRowClick(row.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(row.id);
                            }
                          }}
                        >
                          {orderedVisibleCols.map((k) => renderBodyCell(row, k))}
                          <td className="px-1 py-2.5 text-muted-foreground">
                            <ChevronRight className="mx-auto size-4 opacity-50" aria-hidden />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </div>
        </section>
      </div>

      <BaseMasterSlideAside
        open={panelOpen}
        detailFullscreen={detailFullscreen}
        onToggleFullscreen={() => setDetailFullscreen((v) => !v)}
        onClose={closeDetailFull}
        titleId={titleId}
        title={creating ? `新增${tabLabel}` : selected?.code ?? '往來明細'}
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
                    if (!draft.code.trim()) return;
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
            ) : (
              <p className="text-xs text-muted-foreground">填寫資料後儲存。</p>
            )}
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
                <Label htmlFor={`pt-c-${tab}`}>代碼</Label>
                <Input
                  id={`pt-c-${tab}`}
                  value={formValues.code}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pt-n-${tab}`}>名稱</Label>
                <Input
                  id={`pt-n-${tab}`}
                  value={formValues.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pt-pt-${tab}`}>類型</Label>
                <select
                  id={`pt-pt-${tab}`}
                  className={cn(selectCls, !creating && !editing && readonlyFieldCls)}
                  value={formValues.partnerType}
                  disabled={!creating && !editing}
                  onChange={(e) => setDraft((d) => ({ ...d, partnerType: e.target.value as PartnerType }))}
                >
                  {PARTNER_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pt-cn-${tab}`}>聯絡人</Label>
                <Input
                  id={`pt-cn-${tab}`}
                  value={formValues.contactName}
                  onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pt-p-${tab}`}>電話</Label>
                <Input
                  id={`pt-p-${tab}`}
                  value={formValues.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pt-m-${tab}`}>手機</Label>
                <Input
                  id={`pt-m-${tab}`}
                  value={formValues.mobile}
                  onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pt-e-${tab}`}>Email</Label>
                <Input
                  id={`pt-e-${tab}`}
                  type="email"
                  value={formValues.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pt-a-${tab}`}>地址</Label>
                <Input
                  id={`pt-a-${tab}`}
                  value={formValues.address}
                  onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pt-r-${tab}`}>備註（可填統編等）</Label>
                <Input
                  id={`pt-r-${tab}`}
                  value={formValues.remark}
                  onChange={(e) => setDraft((d) => ({ ...d, remark: e.target.value }))}
                  readOnly={!creating && !editing}
                  className={!creating && !editing ? readonlyFieldCls : undefined}
                />
              </div>
              <label htmlFor={`pt-active-${tab}`} className="flex items-center gap-2 text-sm">
                <input
                  id={`pt-active-${tab}`}
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

export function BasePartnerMasterView() {
  const [rows, setRows] = useState<PartnerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const r = await listPartners({ page: 1, pageSize: 500 });
      setRows(r.items);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

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
        <PartnerPanel
          tab="vendor"
          tabLabel="廠商"
          rows={rows}
          setRows={setRows}
          reloadAll={reloadAll}
          loading={loading}
          globalError={globalError}
        />
      </TabsContent>
      <TabsContent value="customer" className="mt-0 outline-none">
        <PartnerPanel
          tab="customer"
          tabLabel="客戶"
          rows={rows}
          setRows={setRows}
          reloadAll={reloadAll}
          loading={loading}
          globalError={globalError}
        />
      </TabsContent>
    </Tabs>
  );
}
