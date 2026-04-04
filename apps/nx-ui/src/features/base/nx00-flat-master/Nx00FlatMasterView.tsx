/**
 * 通用主檔：code/name/sort/isActive（不顯示 id；明細不含稽核分頁）。
 * 適用 country / currency / part-group / part-relation 等扁平 DTO。
 */
'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, ChevronRight, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { arrayMove } from '@/shared/lib/arrayMove';
import { useListLocalPref } from '@/shared/hooks/useListLocalPref';
import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { BaseMasterSlideAside, useMasterSlideDetailEffects } from '@/features/base/shell/BaseMasterSlideAside';
import { MasterListScrollRegion } from '@/features/base/shell/MasterListScrollRegion';
import { MasterActiveListCell } from '@/features/base/shell/MasterActiveListCell';

const AUDIT_KEYS = ['createdAt', 'createdBy', 'createdByName', 'updatedAt', 'updatedBy', 'updatedByName'] as const;

export type FlatFieldDef = {
  key: string;
  label: string;
  /** 列表顯示（預設 true） */
  list?: boolean;
  sortable?: boolean;
  filter?: boolean;
  /** 主檔表單可編輯（預設 true，稽核鍵除外） */
  edit?: boolean;
  /** 文字欄位空字串時送 null（API 可選欄位） */
  optional?: boolean;
  /** 僅新增可編輯（儲存後唯讀，如 partBrandId） */
  createOnly?: boolean;
  /** 明細表單是否畫出該欄（預設 true）；false 仍進 draft／送 API，改由 renderDetailExtras 編輯 */
  detailForm?: boolean;
  type?: 'text' | 'number' | 'bool';
};

export type Nx00FlatMasterProps = {
  basePath: string;
  prefKey: string;
  listErrorCode: string;
  hubBackHref?: string;
  /** 代碼欄位名（建立／更新時轉大寫） */
  upperCaseFields?: string[];
  fields: FlatFieldDef[];
  /** 表單欄位改為下拉（例：partBrandId、relationType） */
  selectOptions?: Record<string, { value: string; label: string }[]>;
  /** true：單欄工具列＋主檔列表版型（對齊使用者主檔），隱藏左側狀態欄與獨立 FILTER 區塊 */
  unifiedMasterShell?: boolean;
  /** 明細頂部自訂區塊（例：零件關聯之來源／目的料號搜尋） */
  renderDetailExtras?: (ctx: {
    draft: Record<string, string>;
    setDraft: Dispatch<SetStateAction<Record<string, string>>>;
    creating: boolean;
    selected: Record<string, unknown> | null;
  }) => ReactNode;
  /** 自訂側欄標題（預設 code／新增） */
  slideDetailTitle?: (ctx: { creating: boolean; selected: Record<string, unknown> | null }) => ReactNode;
  slideDetailSubtitle?: (ctx: { creating: boolean; selected: Record<string, unknown> | null }) => ReactNode | null;
};

type SortDir = 'asc' | 'desc';

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

function rowToDraft(row: Record<string, unknown>, defs: FlatFieldDef[]): Record<string, string> {
  const d: Record<string, string> = {};
  for (const f of defs) {
    if (f.edit === false) continue;
    const v = row[f.key];
    if (f.type === 'bool') d[f.key] = v ? '1' : '0';
    else d[f.key] = v == null ? '' : String(v);
  }
  return d;
}

function buildBody(
  draft: Record<string, string>,
  defs: FlatFieldDef[],
  upper: Set<string>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of defs) {
    if (f.edit === false) continue;
    const raw = draft[f.key]?.trim() ?? '';
    if (f.type === 'number') {
      const n = Number.parseInt(raw, 10);
      body[f.key] = Number.isFinite(n) ? n : 0;
    } else if (f.type === 'bool') {
      body[f.key] = draft[f.key] === '1';
    } else if (f.optional && raw === '') {
      body[f.key] = null;
    } else {
      let s = raw;
      if (upper.has(f.key)) s = s.toUpperCase();
      body[f.key] = s;
    }
  }
  return body;
}

export function Nx00FlatMasterView({
  basePath,
  prefKey,
  listErrorCode,
  hubBackHref = '/base',
  upperCaseFields = ['code'],
  fields,
  selectOptions,
  unifiedMasterShell = false,
  renderDetailExtras,
  slideDetailTitle,
  slideDetailSubtitle,
}: Nx00FlatMasterProps) {
  const upper = useMemo(() => new Set(upperCaseFields), [upperCaseFields]);

  const listFieldDefs = useMemo(() => fields.filter((f) => f.list !== false), [fields]);
  const ALL_LIST_COLS = useMemo(() => listFieldDefs.map((f) => f.key), [listFieldDefs]);
  type ColKey = string;
  const COL_DEF = useMemo(() => {
    const m: Record<string, { label: string; locked?: boolean }> = {};
    for (const f of listFieldDefs) m[f.key] = { label: f.label, locked: f.key === 'code' };
    for (const k of AUDIT_KEYS) {
      if (!m[k]) {
        const lab =
          k === 'createdAt'
            ? '建立時間'
            : k === 'createdBy'
              ? '建立人ID'
              : k === 'createdByName'
                ? '建立人'
                : k === 'updatedAt'
                  ? '修改時間'
                  : k === 'updatedBy'
                    ? '修改人ID'
                    : '修改人';
        m[k] = { label: lab };
      }
    }
    return m;
  }, [listFieldDefs]);

  const listColsWithAudit = useMemo(() => {
    const base = [...ALL_LIST_COLS];
    for (const k of AUDIT_KEYS) {
      if (!base.includes(k)) base.push(k);
    }
    return base;
  }, [ALL_LIST_COLS]);

  type ColPref = { visibleCols: string[]; colOrder: string[] };
  const DEFAULT_COL_PREF: ColPref = useMemo(
    () => ({ visibleCols: [...listColsWithAudit], colOrder: [...listColsWithAudit] }),
    [listColsWithAudit],
  );

  function normalizeColPref(raw: ColPref): ColPref {
    const order = listColsWithAudit.filter((k) => raw.colOrder.includes(k));
    for (const k of listColsWithAudit) {
      if (!order.includes(k)) order.push(k);
    }
    let vis = raw.visibleCols.filter((k) => listColsWithAudit.includes(k));
    const firstData = ALL_LIST_COLS[0];
    if (firstData && !vis.includes(firstData)) vis = [firstData, ...vis];
    return { colOrder: order, visibleCols: vis };
  }

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [keyword, setKeyword] = useState('');
  const [activePick, setActivePick] = useState<'all' | 'active' | 'inactive'>('all');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const setFilter = (key: string, v: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: v }));
  };
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: ALL_LIST_COLS[0] || 'code', dir: 'asc' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [baseline, setBaseline] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const colPickerWrapRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 10;

  const { value: colPref, setValue: setColPref } = useListLocalPref<ColPref>(prefKey, 2, DEFAULT_COL_PREF);
  const listCols = useMemo(() => normalizeColPref(colPref), [colPref, listColsWithAudit]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString({ page: '1', pageSize: '500' });
      const res = await apiFetch(`${basePath}${qs}`, { method: 'GET' });
      await assertOk(res, listErrorCode);
      const data = (await res.json()) as { items: Record<string, unknown>[] };
      setRows(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [basePath, listErrorCode]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!colPickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = colPickerWrapRef.current;
      if (el && !el.contains(e.target as Node)) setColPickerOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [colPickerOpen]);

  const emptyDraft = useCallback(() => {
    const d: Record<string, string> = {};
    for (const f of fields) {
      if (f.edit === false) continue;
      if (f.type === 'bool') d[f.key] = '1';
      else if (f.type === 'number') d[f.key] = f.key === 'sortNo' ? '0' : '0';
      else d[f.key] = '';
    }
    if (d.sortNo === undefined && fields.some((x) => x.key === 'sortNo')) d.sortNo = '0';
    if (d.decimalPlaces === undefined && fields.some((x) => x.key === 'decimalPlaces')) d.decimalPlaces = '2';
    if (fields.some((x) => x.key === 'relationType') && (d.relationType === undefined || d.relationType === '')) {
      d.relationType = 'S';
    }
    return d;
  }, [fields]);

  const selected = useMemo(
    () => (selectedId ? rows.find((r) => r.id === selectedId) ?? null : null),
    [rows, selectedId],
  );

  useEffect(() => {
    if (creating) {
      const e = emptyDraft();
      setDraft(e);
      setBaseline(e);
      return;
    }
    if (selected) {
      const d = rowToDraft(selected, fields);
      setDraft(d);
      setBaseline(d);
    }
  }, [creating, selectedId, selected, emptyDraft, fields]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return rows.filter((r) => {
      if (activePick === 'active' && !r.isActive) return false;
      if (activePick === 'inactive' && r.isActive) return false;
      if (k) {
        const blob = JSON.stringify(r).toLowerCase();
        if (!blob.includes(k)) return false;
      }
      for (const f of listFieldDefs) {
        if (!f.filter) continue;
        const fv = columnFilters[f.key]?.trim();
        if (!fv) continue;
        const cell = r[f.key];
        const s = cell == null ? '' : String(cell);
        if (!s.toLowerCase().includes(fv.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, keyword, activePick, listFieldDefs, columnFilters]);

  const sortedRows = useMemo(() => {
    const mult = sort.dir === 'asc' ? 1 : -1;
    const sk = sort.key;
    const out = [...filtered];
    out.sort((a, b) => {
      const av = a[sk];
      const bv = b[sk];
      if (sk === 'sortNo' || sk === 'decimalPlaces') {
        return mult * ((Number(av) || 0) - (Number(bv) || 0));
      }
      if (sk === 'isActive') {
        return mult * ((av ? 1 : 0) - (bv ? 1 : 0));
      }
      return mult * String(av ?? '').localeCompare(String(bv ?? ''), 'zh-Hant');
    });
    return out;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, safePage]);

  const orderedVisibleCols = useMemo(
    () => listCols.colOrder.filter((k) => listCols.visibleCols.includes(k)),
    [listCols],
  );

  const panelOpen = creating || selectedId != null;
  const closeDetailFull = useCallback(() => {
    setCreating(false);
    setSelectedId(null);
    setDetailFullscreen(false);
    setSaveConfirmOpen(false);
  }, []);

  useMasterSlideDetailEffects(panelOpen, closeDetailFull, detailFullscreen, setDetailFullscreen, [selectedId, creating]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);

  const performSave = async () => {
    setSaving(true);
    setError(null);
    setSaveConfirmOpen(false);
    try {
      const body = buildBody(draft, fields, upper);
      if (!creating) {
        for (const f of fields) {
          if (f.createOnly) delete body[f.key];
        }
      }
      if (creating) {
        const res = await apiFetch(basePath, { method: 'POST', body: JSON.stringify(body) });
        await assertOk(res, `${prefKey}_create`);
        const dto = (await res.json()) as Record<string, unknown>;
        setRows((p) => [...p, dto]);
        setCreating(false);
        setSelectedId(String(dto.id));
        const d = rowToDraft(dto, fields);
        setDraft(d);
        setBaseline(d);
      } else if (selectedId) {
        const res = await apiFetch(`${basePath}/${encodeURIComponent(selectedId)}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        await assertOk(res, `${prefKey}_update`);
        const dto = (await res.json()) as Record<string, unknown>;
        setRows((p) => p.map((r) => (String(r.id) === selectedId ? dto : r)));
        const d = rowToDraft(dto, fields);
        setDraft(d);
        setBaseline(d);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const toggleSort = (key: ColKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const sortIcon = (key: string) => {
    if (sort.key !== key) return <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />;
    return sort.dir === 'asc' ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />;
  };

  const renderCell = (row: Record<string, unknown>, key: string) => {
    const v = row[key];
    if (key === 'isActive') {
      return (
        <span
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-md text-xs font-medium',
            v ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/15 text-destructive',
          )}
        >
          {v ? '✓' : '×'}
        </span>
      );
    }
    if (key === 'createdAt' || key === 'updatedAt') {
      return <span className="text-xs text-muted-foreground">{formatDt(v as string)}</span>;
    }
    return <span className="max-w-[200px] truncate">{v == null || v === '' ? '—' : String(v)}</span>;
  };

  const filterTh = (key: string) => {
    const f = listFieldDefs.find((x) => x.key === key);
    if (f?.filter) {
      return (
        <th key={`f-${key}`} className="p-2">
          <Input
            value={columnFilters[key] ?? ''}
            onChange={(e) => setFilter(key, e.target.value)}
            placeholder="篩選"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      );
    }
    return <th key={`f-${key}`} className="p-2" />;
  };

  const tableMinW = Math.max(400, 32 + orderedVisibleCols.length * 96 + 40);
  const selectedIdx = selectedId ? sortedRows.findIndex((r) => String(r.id) === selectedId) : -1;

  const goDetailPrev = useCallback(() => {
    if (creating || selectedIdx <= 0) return;
    const prev = sortedRows[selectedIdx - 1];
    if (prev) setSelectedId(String(prev.id));
  }, [creating, selectedIdx, sortedRows]);

  const goDetailNext = useCallback(() => {
    if (creating || selectedIdx < 0 || selectedIdx >= sortedRows.length - 1) return;
    const next = sortedRows[selectedIdx + 1];
    if (next) setSelectedId(String(next.id));
  }, [creating, selectedIdx, sortedRows]);

  const slideTitleResolved = useMemo(() => {
    const sel = selected ?? null;
    if (slideDetailTitle) return slideDetailTitle({ creating, selected: sel });
    return creating ? '新增' : String(selected?.code ?? '明細');
  }, [slideDetailTitle, creating, selected]);

  const slideSubtitleResolved = useMemo(() => {
    const sel = selected ?? null;
    if (slideDetailSubtitle !== undefined) return slideDetailSubtitle({ creating, selected: sel });
    return !creating && selected ? String(selected.name ?? '') : undefined;
  }, [slideDetailSubtitle, creating, selected]);

  return (
    <>
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link href={hubBackHref} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <ArrowLeft className="size-3.5" aria-hidden />
            返回主檔中心
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!unifiedMasterShell ? (
          <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
            <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋與篩選</h2>
            <div className="mt-4">
              <Label htmlFor="nx-flat-kw">關鍵字</Label>
              <Input
                id="nx-flat-kw"
                className="mt-2 max-w-md"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="全文（除 id）"
                autoComplete="off"
              />
            </div>
          </section>
        ) : null}

        <section
          className={cn(
            'glass-card flex min-h-[min(420px,70dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 shadow-sm lg:min-h-[420px]',
            unifiedMasterShell && 'nx-glass-raised border-border/80',
          )}
        >
          <div
            className={cn(
              'flex min-h-0 min-w-0 flex-1',
              unifiedMasterShell ? 'flex-col' : 'flex-col lg:flex-row',
            )}
          >
            {!unifiedMasterShell ? (
              <>
                <nav
                  className="hidden shrink-0 flex-col gap-0.5 border-b border-border/60 p-3 lg:flex lg:w-36 lg:border-b-0 lg:border-r lg:py-4"
                  aria-label="狀態"
                >
                  {(
                    [
                      { k: 'all' as const, label: '全部' },
                      { k: 'active' as const, label: '啟用' },
                      { k: 'inactive' as const, label: '停用' },
                    ] as const
                  ).map(({ k, label }) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setActivePick(k)}
                      className={cn(
                        'rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        activePick === k ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-secondary/60',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </>
            ) : null}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4">
              {!unifiedMasterShell ? (
                <div className="mb-3 flex flex-wrap gap-2 lg:hidden">
                  <select
                    className="nx-native-select h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={activePick}
                    onChange={(e) => setActivePick(e.target.value as 'all' | 'active' | 'inactive')}
                    aria-label="狀態"
                  >
                    <option value="all">全部</option>
                    <option value="active">啟用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              ) : null}

              <div
                className={cn(
                  'relative flex flex-wrap items-center gap-2 border-b border-border/60 pb-3',
                  unifiedMasterShell && colPickerOpen && 'z-[100]',
                )}
                ref={colPickerWrapRef}
              >
                {unifiedMasterShell ? (
                  <>
                    <Input
                      id="nx-flat-kw-inline"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="關鍵字（全文，除 id）"
                      autoComplete="off"
                      className="h-9 min-w-[min(100%,10rem)] flex-1 basis-[min(100%,14rem)]"
                    />
                    <select
                      className="nx-native-select h-9 shrink-0 rounded-md border border-input bg-transparent px-3 text-sm sm:min-w-36"
                      value={activePick}
                      onChange={(e) => setActivePick(e.target.value as 'all' | 'active' | 'inactive')}
                      aria-label="依啟用狀態篩選"
                    >
                      <option value="all">狀態：全部</option>
                      <option value="active">狀態：啟用</option>
                      <option value="inactive">狀態：停用</option>
                    </select>
                  </>
                ) : null}
                <Button type="button" size="sm" onClick={() => { setSelectedId(null); setCreating(true); }} disabled={loading || saving}>
                  新增
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void reload()} disabled={loading}>
                  重新載入
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 px-2"
                  onClick={() => setColPickerOpen((o) => !o)}
                >
                  <Columns3 className="size-4" aria-hidden />
                  欄位
                </Button>

                {colPickerOpen ? (
                  <div
                    className={cn(
                      'absolute right-0 top-full mt-2 w-[min(100vw-2rem,320px)] rounded-xl border border-border bg-popover p-3 shadow-lg',
                      unifiedMasterShell ? 'z-[100]' : 'z-30',
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">顯示欄位</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setColPref({ visibleCols: [...listColsWithAudit], colOrder: [...listColsWithAudit] })}
                      >
                        重置
                      </Button>
                    </div>
                    <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                      {listCols.colOrder.map((key) => {
                        const def = COL_DEF[key];
                        const checked = listCols.visibleCols.includes(key);
                        const locked = def?.locked;
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
                              const from = e.dataTransfer.getData('text/plain');
                              const to = key;
                              if (!from || from === to) return;
                              setColPref((prev) => {
                                const i = prev.colOrder.indexOf(from);
                                const j = prev.colOrder.indexOf(to);
                                if (i < 0 || j < 0) return prev;
                                return {
                                  ...prev,
                                  colOrder: arrayMove(prev.colOrder, i, j),
                                };
                              });
                            }}
                          >
                            <label className="flex flex-1 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={locked}
                                onChange={(e) => {
                                  const on = e.target.checked;
                                  setColPref((prev) => {
                                    if (on && !prev.visibleCols.includes(key)) {
                                      return { ...prev, visibleCols: [...prev.visibleCols, key] };
                                    }
                                    if (!on && !locked) {
                                      return { ...prev, visibleCols: prev.visibleCols.filter((k) => k !== key) };
                                    }
                                    return prev;
                                  });
                                }}
                              />
                              <span>{def?.label ?? key}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className={cn(
                  'mt-3 min-h-0 min-w-0 flex-1 pr-2',
                  unifiedMasterShell ? 'flex min-h-0 flex-col' : 'overflow-auto overscroll-x-contain',
                )}
              >
                {unifiedMasterShell ? (
                  <MasterListScrollRegion scrollRef={listScrollRef} ariaLabel="主檔列表" className="min-h-0 flex-1">
                    <table
                      className="nx-master-table w-full border-collapse text-sm"
                      style={{ minWidth: tableMinW }}
                    >
                      <thead>
                        <tr className="nx-master-thead-row text-left text-muted-foreground">
                          {orderedVisibleCols.map((key) => (
                            <th key={key} className="whitespace-nowrap px-2 py-2.5">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                                onClick={() => toggleSort(key)}
                              >
                                {COL_DEF[key]?.label ?? key}
                                {sortIcon(key)}
                              </button>
                            </th>
                          ))}
                          <th className="w-10 px-1 py-2.5" aria-hidden />
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row) => {
                          const id = String(row.id);
                          const sel = id === selectedId && !creating;
                          return (
                            <tr
                              key={id}
                              className={cn(
                                'nx-master-tbody-row cursor-pointer transition-colors duration-150',
                                sel && 'nx-row-selected bg-primary/20 ring-1 ring-inset ring-primary/40',
                                !sel &&
                                  'hover:bg-primary/12 hover:shadow-[inset_0_0_0_1px_rgba(244,180,0,0.2)]',
                              )}
                              onClick={() => {
                                if (sel) {
                                  closeDetailFull();
                                  return;
                                }
                                setSelectedId(id);
                                setCreating(false);
                              }}
                            >
                              {orderedVisibleCols.map((key) =>
                                key === 'isActive' ? (
                                  <MasterActiveListCell key={key} isActive={Boolean(row.isActive)} />
                                ) : (
                                  <td key={key} className="px-2 py-2.5">
                                    {renderCell(row, key)}
                                  </td>
                                ),
                              )}
                              <td className="px-1 py-2.5 text-muted-foreground">›</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </MasterListScrollRegion>
                ) : (
                  <table className="w-full border-collapse text-sm" style={{ minWidth: tableMinW }}>
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-left text-muted-foreground">
                        {orderedVisibleCols.map((key) => (
                          <th key={key} className="whitespace-nowrap px-2 py-2.5">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                              onClick={() => toggleSort(key)}
                            >
                              {COL_DEF[key]?.label ?? key}
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
                        const id = String(row.id);
                        const sel = id === selectedId && !creating;
                        return (
                          <tr
                            key={id}
                            className={cn(
                              'cursor-pointer border-b border-border/40 transition-colors',
                              sel ? 'bg-primary/10' : 'hover:bg-muted/40',
                            )}
                            onClick={() => {
                              if (sel) {
                                closeDetailFull();
                                return;
                              }
                              setSelectedId(id);
                              setCreating(false);
                            }}
                          >
                            {orderedVisibleCols.map((key) => (
                              <td key={key} className="px-2 py-2.5">
                                {renderCell(row, key)}
                              </td>
                            ))}
                            <td className="px-1 py-2.5 text-muted-foreground">›</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {loading ? <div className="py-8 text-center text-sm text-muted-foreground">載入中…</div> : null}
                {!loading && pageRows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">無資料</div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <span>
                  第 {safePage} / {totalPages} 頁（共 {sortedRows.length} 筆）
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一頁
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <BaseMasterSlideAside
        open={panelOpen}
        detailFullscreen={detailFullscreen}
        onToggleFullscreen={() => setDetailFullscreen((v) => !v)}
        onClose={closeDetailFull}
        titleId={`${prefKey}-detail-title`}
        title={slideTitleResolved}
        subtitle={slideSubtitleResolved ?? undefined}
        navPrev={
          !creating && selectedIdx >= 0
            ? { onClick: goDetailPrev, disabled: selectedIdx <= 0 }
            : undefined
        }
        navNext={
          !creating && selectedIdx >= 0
            ? { onClick: goDetailNext, disabled: selectedIdx >= sortedRows.length - 1 }
            : undefined
        }
        footer={
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (creating ? setDraft(emptyDraft()) : setDraft({ ...baseline }))}
              disabled={!dirty || saving}
            >
              還原
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!dirty || saving}
              onClick={() => {
                if (dirty) setSaveConfirmOpen(true);
              }}
            >
              {saving ? '儲存中…' : '儲存'}
            </Button>
          </div>
        }
      >
        <p className="mb-2 text-xs text-muted-foreground">不顯示系統內碼 id。</p>
        <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0">
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto outline-none">
            {renderDetailExtras
              ? renderDetailExtras({ draft, setDraft, creating, selected: selected ?? null })
              : null}
            {fields
              .filter((f) => f.edit !== false && f.detailForm !== false)
              .map((f) => {
                const opts = selectOptions?.[f.key];
                const readOnlyLocked = f.createOnly && !creating;
                return (
                  <div key={f.key}>
                    <Label>{f.label}</Label>
                    {readOnlyLocked ? (
                      <Input className="mt-2 bg-muted/40" readOnly value={draft[f.key] ?? ''} />
                    ) : f.type === 'bool' ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft[f.key] === '1'}
                          onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.checked ? '1' : '0' }))}
                          className="size-4 rounded border border-input"
                        />
                      </div>
                    ) : opts && opts.length > 0 ? (
                      <select
                        className="nx-native-select mt-2 flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        value={draft[f.key] ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      >
                        <option value="">— 請選擇 —</option>
                        {opts.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        className="mt-2"
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={draft[f.key] ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </BaseMasterSlideAside>

      <MasterSaveConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        onConfirm={() => void performSave()}
      />
    </>
  );
}
