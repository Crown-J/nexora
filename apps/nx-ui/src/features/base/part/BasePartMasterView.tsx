/**
 * 零件主檔：連線 GET/POST/PUT /part；零件廠牌 GET /brand；汽車廠牌 GET /lookup/car-brand
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { listBrand } from '@/features/nx00/brand/api/brand';
import type { BrandDto } from '@/features/nx00/brand/types';
import { listLookupCarBrand } from '@/features/nx00/lookup/api/lookup';
import { createPart, listPart, updatePart } from '@/features/nx00/part/api/part';
import type { PartDto } from '@/features/nx00/part/types';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { getFieldIdFromEventTarget, handleMasterFieldKeyDown } from '@/features/base/keyboard/masterFieldNav';
import type { BasePartRow } from './mock-data';

/** 明細欄位 Tab／鍵盤順序（最後一欄 Enter／→ 觸發儲存確認） */
const PART_DETAIL_FIELD_ORDER: readonly string[] = [
  'bp-sku',
  'bp-brand',
  'bp-oem',
  'bp-car-brand',
  'bp-ptype',
  'bp-name',
  'bp-spec',
  'bp-unit',
  'bp-active',
];

const PART_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '（未指定）' },
  { value: 'A', label: 'A 專用型' },
  { value: 'B', label: 'B 通用型' },
  { value: 'C', label: 'C 組合型' },
  { value: 'D', label: 'D 拆解型' },
];

function partTypeLabel(t: string | null | undefined): string {
  if (!t) return '';
  const hit = PART_TYPE_OPTIONS.find((o) => o.value === t);
  return hit?.label ?? t;
}

type Draft = {
  sku: string;
  name: string;
  spec: string;
  unit: string;
  isActive: boolean;
  partBrandId: string | null;
  isOem: boolean;
  carBrandId: string | null;
  partType: string | null;
};

function emptyDraft(): Draft {
  return {
    sku: '',
    name: '',
    spec: '',
    unit: 'pcs',
    isActive: true,
    partBrandId: null,
    isOem: true,
    carBrandId: null,
    partType: null,
  };
}

function fromRow(r: BasePartRow): Draft {
  return {
    sku: r.sku,
    name: r.name,
    spec: r.spec,
    unit: r.unit,
    isActive: r.isActive,
    partBrandId: r.partBrandId,
    isOem: r.isOem,
    carBrandId: r.carBrandId,
    partType: r.partType,
  };
}

function dtoToRow(p: PartDto): BasePartRow {
  return {
    id: p.id,
    sku: p.code,
    name: p.name,
    spec: p.spec ?? '',
    unit: p.uom,
    isActive: p.isActive,
    partBrandId: p.partBrandId ?? null,
    brandCode: p.brandCode ?? null,
    brandName: p.brandName ?? null,
    isOem: p.isOem,
    carBrandId: p.carBrandId ?? null,
    carBrandCode: p.carBrandCode ?? null,
    carBrandName: p.carBrandName ?? null,
    partType: p.partType ?? null,
  };
}

function brandLabel(r: BasePartRow): string {
  const t = r.brandName || r.brandCode;
  return t ?? '';
}

function carBrandLabel(r: BasePartRow): string {
  return r.carBrandName || r.carBrandCode || '';
}

export function BasePartMasterView() {
  const [rows, setRows] = useState<BasePartRow[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [carBrands, setCarBrands] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [loading, setLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [carBrandsLoading, setCarBrandsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const r = await listBrand({ page: 1, pageSize: 2000 });
      setBrands(
        [...r.items].sort((a, b) => a.sortNo - b.sortNo || a.code.localeCompare(b.code, 'en')),
      );
    } catch {
      setBrands([]);
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  const loadCarBrands = useCallback(async () => {
    setCarBrandsLoading(true);
    try {
      const items = await listLookupCarBrand({ isActive: true });
      setCarBrands(
        [...items].sort((a, b) => a.code.localeCompare(b.code, 'en')),
      );
    } catch {
      setCarBrands([]);
    } finally {
      setCarBrandsLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listPart({ page: 1, pageSize: 500 });
      setRows(r.items.map(dtoToRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrands();
    void loadCarBrands();
  }, [loadBrands, loadCarBrands]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) =>
      `${r.sku} ${r.name} ${r.spec} ${brandLabel(r)} ${carBrandLabel(r)} ${partTypeLabel(r.partType)} ${r.isOem ? '正廠' : '副廠'}`
        .toLowerCase()
        .includes(k),
    );
  }, [rows, keyword]);

  const selectedFilteredIndex = useMemo(
    () => (selectedId ? filtered.findIndex((r) => r.id === selectedId) : -1),
    [filtered, selectedId],
  );

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
      return;
    }
    setEditing(false);
  };

  const performSave = async () => {
    const sku = draft.sku.trim();
    if (!sku) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        code: sku,
        name: draft.name.trim() || sku,
        spec: draft.spec.trim() || null,
        uom: draft.unit.trim() || 'pcs',
        isActive: draft.isActive,
        partBrandId: draft.partBrandId,
        isOem: draft.isOem,
        carBrandId: draft.carBrandId,
        partType: draft.partType,
      };
      if (creating) {
        const dto = await createPart(body);
        const row = dtoToRow(dto);
        setRows((prev) => [...prev, row]);
        setSelectedId(row.id);
        setCreating(false);
        setEditing(false);
        return;
      }
      if (!selectedId) return;
      const dto = await updatePart(selectedId, body);
      const row = dtoToRow(dto);
      setRows((prev) => prev.map((r) => (r.id === selectedId ? row : r)));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const focusPartRow = (index: number) => {
    requestAnimationFrame(() => {
      (document.querySelector(`[data-part-master-row="${index}"]`) as HTMLElement | null)?.focus();
    });
  };

  const selectRowAtFilteredIndex = (idx: number) => {
    const r = filtered[idx];
    if (!r) return;
    setSelectedId(r.id);
    setCreating(false);
    setEditing(false);
  };

  const readonlyCls = 'bg-muted/40 text-muted-foreground cursor-default';
  const selectCls =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background';

  return (
    <>
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,42%)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
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
              onKeyDown={(e) => {
                if (saveConfirmOpen) return;
                if (e.key === 'ArrowDown' && filtered.length > 0) {
                  e.preventDefault();
                  selectRowAtFilteredIndex(0);
                  focusPartRow(0);
                }
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  document.getElementById('bp-sku')?.focus();
                }
              }}
              placeholder="料號、品名、規格、廠牌、汽車廠牌、類型…"
              autoComplete="off"
            />
          </div>
        </section>

        <section className="glass-card flex min-h-[420px] min-w-0 flex-1 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
            <Button type="button" size="sm" onClick={onAdd} disabled={loading || saving}>
              新增
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void reload()} disabled={loading}>
              重新載入
            </Button>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {loading ? '載入中…' : `共 ${filtered.length} 筆（本頁最多 500 筆）`}
            </span>
          </div>
          <ScrollArea className="mt-3 min-h-0 flex-1 pr-2">
            <div className="space-y-2">
              {filtered.map((r, i) => {
                const active = r.id === selectedId && !creating;
                const bl = brandLabel(r);
                const cbl = carBrandLabel(r);
                const ptl = partTypeLabel(r.partType);
                return (
                  <button
                    key={r.id}
                    type="button"
                    tabIndex={-1}
                    data-part-master-row={i}
                    onClick={() => onRowClick(r.id)}
                    onKeyDown={(e) => {
                      if (saveConfirmOpen) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (i < filtered.length - 1) {
                          selectRowAtFilteredIndex(i + 1);
                          focusPartRow(i + 1);
                        } else {
                          document.getElementById('bp-sku')?.focus();
                        }
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (i > 0) {
                          selectRowAtFilteredIndex(i - 1);
                          focusPartRow(i - 1);
                        } else {
                          document.getElementById('bp-keyword')?.focus();
                        }
                      }
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        document.getElementById('bp-sku')?.focus();
                      }
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        document.getElementById('bp-keyword')?.focus();
                      }
                    }}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'border-primary/40 border-l-4 border-l-primary bg-primary/10 pl-2.5 ring-1 ring-primary/20'
                        : 'border-border/80 bg-muted/15 hover:bg-muted/30',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <div className="font-mono text-xs text-muted-foreground">{r.sku}</div>
                      <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                        {r.isOem ? '正廠' : '副廠'}
                      </span>
                      {ptl ? (
                        <span className="rounded border border-border/80 px-1.5 text-[10px] text-muted-foreground">
                          {ptl}
                        </span>
                      ) : null}
                    </div>
                    <div className="font-semibold">{r.name}</div>
                    {bl ? <div className="text-xs text-primary/90">零件 {bl}</div> : null}
                    {cbl ? <div className="text-xs text-muted-foreground">汽車 {cbl}</div> : null}
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

      <aside
        className="glass-card min-h-[min(520px,calc(100vh-14rem))] rounded-2xl border border-border/80 p-4 shadow-sm lg:sticky lg:top-24"
        onKeyDownCapture={(e) => {
          if (saveConfirmOpen) return;
          if (!creating && !editing) return;
          const id = getFieldIdFromEventTarget(e.target);
          if (e.key === 'ArrowLeft' && id === 'bp-sku') {
            e.preventDefault();
            if (selectedFilteredIndex >= 0) focusPartRow(selectedFilteredIndex);
            else document.getElementById('bp-keyword')?.focus();
            return;
          }
          handleMasterFieldKeyDown(e, PART_DETAIL_FIELD_ORDER, {
            enabled: true,
            onLastField: () => setSaveConfirmOpen(true),
          });
        }}
      >
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
            <Label htmlFor="bp-brand">零件廠牌</Label>
            <select
              id="bp-brand"
              className={cn(selectCls, !creating && !editing && readonlyCls)}
              value={formValues.partBrandId ?? ''}
              disabled={!creating && !editing || brandsLoading}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  partBrandId: e.target.value === '' ? null : e.target.value,
                }))
              }
            >
              <option value="">（未指定）</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>
          <label htmlFor="bp-oem" className="flex items-center gap-2 text-sm">
            <input
              id="bp-oem"
              type="checkbox"
              className="size-4 accent-primary"
              checked={formValues.isOem}
              disabled={!creating && !editing}
              onChange={(e) => setDraft((d) => ({ ...d, isOem: e.target.checked }))}
            />
            正廠零件
          </label>
          <div className="space-y-2">
            <Label htmlFor="bp-car-brand">汽車廠牌</Label>
            <select
              id="bp-car-brand"
              className={cn(selectCls, !creating && !editing && readonlyCls)}
              value={formValues.carBrandId ?? ''}
              disabled={!creating && !editing || carBrandsLoading}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  carBrandId: e.target.value === '' ? null : e.target.value,
                }))
              }
            >
              <option value="">（未指定）</option>
              {carBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bp-ptype">零件類型</Label>
            <select
              id="bp-ptype"
              className={cn(selectCls, !creating && !editing && readonlyCls)}
              value={formValues.partType ?? ''}
              disabled={!creating && !editing}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  partType: e.target.value === '' ? null : e.target.value,
                }))
              }
            >
              {PART_TYPE_OPTIONS.map((o) => (
                <option key={o.value || 'empty'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">A=專用型／B=通用型／C=組合型／D=拆解型</p>
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
            <p className="text-xs text-muted-foreground">可填副廠料號、技術說明</p>
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
          <label htmlFor="bp-active" className="flex items-center gap-2 text-sm">
            <input
              id="bp-active"
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
                  if (!draft.sku.trim()) return;
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
            <p className="text-xs text-muted-foreground">點選左側一筆以檢視，或按「新增」。</p>
          )}
        </div>
      </aside>
    </div>
    <MasterSaveConfirmDialog
      open={saveConfirmOpen}
      onOpenChange={setSaveConfirmOpen}
      onConfirm={() => void performSave()}
    />
    </>
  );
}
