/**
 * @FUNCTION_CODE NX02-PROD-UI-001-F01
 * 採購產品管理：左欄查詢／清單 + 右欄詳細、關聯、定價、安全量（DEMO mock）
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cx } from '@/shared/lib/cx';
import {
  DEFAULT_APPLIED_QUERY,
  type AppliedQuery,
  type MockProduct,
  type PartGroup,
  type QuickFilter,
  MOCK_PRODUCTS,
  PRODUCT_SEG_MAX,
  WAREHOUSE_ROWS,
  filterProducts,
  formatPartDisplay,
  totalOtherStock,
} from './mock-data';

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

const BRANDS = ['ALL', 'VAG', 'MANN', 'BOSCH'] as const;

const PART_GROUPS: PartGroup[] = ['濾芯', '煞車', '燈具', '電子', '其他'];

type PanelMode = 'browse' | 'create' | 'edit';

type DetailDraft = {
  brand: string;
  seg: [string, string, string, string, string];
  country: string;
  name: string;
  group: PartGroup;
  warranty: number;
  vehicles: string[];
  remark: string;
  active: boolean;
};

function emptyDetailDraft(): DetailDraft {
  return {
    brand: 'VAG',
    seg: ['', '', '', '', ''],
    country: 'DEU',
    name: '',
    group: '濾芯',
    warranty: 12,
    vehicles: [],
    remark: '',
    active: true,
  };
}

function productToDraft(p: MockProduct): DetailDraft {
  return {
    brand: p.brand,
    seg: [p.seg1, p.seg2, p.seg3, p.seg4, p.seg5],
    country: p.country,
    name: p.name,
    group: p.group,
    warranty: p.warranty,
    vehicles: [...p.vehicles],
    remark: p.remark,
    active: p.active,
  };
}

function marginOnCost(price: number, cost: number): number {
  if (cost <= 0) return 0;
  return ((price - cost) / cost) * 100;
}

function rowSafetyStatus(stock: number, safety: number, max: number): 'unset' | 'ok' | 'low' | 'zero' | 'over' {
  if (safety === 0) return 'unset';
  if (stock === 0) return 'zero';
  if (stock > max) return 'over';
  if (stock < safety) return 'low';
  return 'ok';
}

function statusCellMeta(
  status: 'unset' | 'ok' | 'low' | 'zero' | 'over',
): { emoji: string; label: string; className: string } {
  switch (status) {
    case 'unset':
      return { emoji: '⚠️', label: '未設定', className: 'text-muted-foreground' };
    case 'ok':
      return { emoji: '✅', label: '正常', className: 'text-emerald-600' };
    case 'low':
      return { emoji: '🟠', label: '低於安全量', className: 'text-amber-600' };
    case 'zero':
      return { emoji: '🔴', label: '無庫存', className: 'text-red-600' };
    case 'over':
      return { emoji: '🔴', label: '超過最高量', className: 'text-red-600' };
    default:
      return { emoji: '', label: '', className: '' };
  }
}

/** 左欄 SEG + 產地（產地非自動跳欄） */
function LeftSegSearch({
  seg,
  country,
  onSeg,
  onCountry,
  disabled,
}: {
  seg: [string, string, string, string, string];
  country: string;
  onSeg: (i: number, v: string) => void;
  onCountry: (v: string) => void;
  disabled?: boolean;
}) {
  const idP = 'nx02-prod-q';
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-0.5 font-mono text-xs">
        {([0, 1, 2, 3, 4] as const).map((i) => {
          const lim = PRODUCT_SEG_MAX[i];
          return (
            <span key={i} className="flex items-center gap-0.5">
              <input
                id={`${idP}-seg${i + 1}`}
                disabled={disabled}
                value={seg[i]}
                onChange={(e) => {
                  const raw = e.target.value;
                  const cap = lim > 0 ? raw.slice(0, lim) : raw;
                  onSeg(i, cap);
                  if (!disabled && lim > 0 && cap.length === lim && i < 4) {
                    requestAnimationFrame(() => document.getElementById(`${idP}-seg${i + 2}`)?.focus());
                  }
                }}
                className={cx(
                  'h-8 w-[3.25rem] rounded border border-border bg-background px-1 text-center outline-none',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                  disabled && 'cursor-not-allowed bg-muted/40 text-muted-foreground',
                )}
                maxLength={lim > 0 ? lim : undefined}
                aria-label={`SEG${i + 1}`}
              />
              {i < 4 ? <span className="text-muted-foreground">·</span> : null}
            </span>
          );
        })}
        <span className="text-muted-foreground">#</span>
        <input
          id={`${idP}-cty`}
          disabled={disabled}
          value={country}
          onChange={(e) => onCountry(e.target.value.slice(0, 6).toUpperCase())}
          placeholder="DEU"
          className={cx(
            'h-8 w-[3.5rem] rounded border border-border bg-background px-1 text-center uppercase outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring',
            disabled && 'cursor-not-allowed bg-muted/40 text-muted-foreground',
          )}
          aria-label="產地"
        />
      </div>
      <p className="text-[10px] text-muted-foreground">SEG1～SEG5 填滿自動跳下一格；產地手動輸入。</p>
    </div>
  );
}

function DetailSegInputs({
  seg,
  onSeg,
  country,
  onCountry,
  disabled,
}: {
  seg: [string, string, string, string, string];
  onSeg: (i: number, v: string) => void;
  country: string;
  onCountry: (v: string) => void;
  disabled?: boolean;
}) {
  const idP = 'nx02-prod-d';
  return (
    <div className="flex flex-wrap items-center gap-0.5 font-mono text-sm">
      {([0, 1, 2, 3, 4] as const).map((i) => {
        const lim = PRODUCT_SEG_MAX[i];
        return (
          <span key={i} className="flex items-center gap-0.5">
            <input
              id={`${idP}-seg${i + 1}`}
              disabled={disabled}
              value={seg[i]}
              onChange={(e) => {
                const raw = e.target.value;
                const cap = lim > 0 ? raw.slice(0, lim) : raw;
                onSeg(i, cap);
                if (!disabled && lim > 0 && cap.length === lim && i < 4) {
                  requestAnimationFrame(() => document.getElementById(`${idP}-seg${i + 2}`)?.focus());
                }
              }}
              className={cx(
                'h-9 w-[3.5rem] rounded-md border border-border bg-background px-1 text-center outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring',
                disabled && 'cursor-not-allowed bg-muted/40 text-muted-foreground',
              )}
              maxLength={lim > 0 ? lim : undefined}
            />
            {i < 4 ? <span className="text-muted-foreground">·</span> : null}
          </span>
        );
      })}
      <span className="text-muted-foreground">#</span>
      <input
        id={`${idP}-cty`}
        disabled={disabled}
        value={country}
        onChange={(e) => onCountry(e.target.value.slice(0, 6).toUpperCase())}
        className={cx(
          'h-9 w-[4rem] rounded-md border border-border bg-background px-2 uppercase outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'cursor-not-allowed bg-muted/40 text-muted-foreground',
        )}
      />
    </div>
  );
}

export function PurchaseProductManagementView() {
  const [products, setProducts] = useState<MockProduct[]>(() => MOCK_PRODUCTS.map((p) => ({ ...p, alternatives: p.alternatives.map((a) => ({ ...a })), supersedes: p.supersedes.map((s) => ({ ...s })) })));
  const [draftQuery, setDraftQuery] = useState<AppliedQuery>(() => ({
    ...DEFAULT_APPLIED_QUERY,
    seg: [...DEFAULT_APPLIED_QUERY.seg] as AppliedQuery['seg'],
  }));
  const [appliedQuery, setAppliedQuery] = useState<AppliedQuery>(() => ({
    ...DEFAULT_APPLIED_QUERY,
    seg: [...DEFAULT_APPLIED_QUERY.seg] as AppliedQuery['seg'],
  }));
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [listFocusIndex, setListFocusIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>('p1');
  const [panelMode, setPanelMode] = useState<PanelMode>('browse');
  const [detailDraft, setDetailDraft] = useState<DetailDraft>(() => productToDraft(MOCK_PRODUCTS[0]!));
  const [pricingEdit, setPricingEdit] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ a: 0, b: 0, c: 0, d: 0 });
  const [safetyEdit, setSafetyEdit] = useState(false);
  const [safetyDraft, setSafetyDraft] = useState({ mw1: 0, bw1: 0, bw2: 0 });
  const [maxDraft, setMaxDraft] = useState({ mw1: 0, bw1: 0, bw2: 0 });
  const [relatedTab, setRelatedTab] = useState<'alt' | 'super'>('alt');
  const [showAddAlt, setShowAddAlt] = useState(false);
  const [showAddSuper, setShowAddSuper] = useState(false);
  const [newVehicle, setNewVehicle] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => filterProducts(products, appliedQuery, quickFilter),
    [products, appliedQuery, quickFilter],
  );

  useEffect(() => {
    setListFocusIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    if (panelMode === 'create') return;
    if (!filtered.length) {
      if (panelMode === 'browse') setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((p) => p.id === selectedId)) {
      const first = filtered[0]!;
      setSelectedId(first.id);
      setListFocusIndex(0);
      setDetailDraft(productToDraft(first));
    }
  }, [filtered, selectedId, panelMode]);

  const selected = useMemo(
    () => (selectedId ? products.find((p) => p.id === selectedId) ?? null : null),
    [products, selectedId],
  );

  useEffect(() => {
    if (panelMode === 'browse' && selected) {
      setDetailDraft(productToDraft(selected));
    }
  }, [selected, panelMode]);

  useEffect(() => {
    if (selected && rightRef.current) {
      rightRef.current.scrollTop = 0;
    }
  }, [selectedId, panelMode]);

  const runSearch = useCallback(() => {
    setAppliedQuery({
      brand: draftQuery.brand,
      seg: [...draftQuery.seg] as AppliedQuery['seg'],
      country: draftQuery.country,
    });
    setListFocusIndex(0);
  }, [draftQuery]);

  const selectByIndex = useCallback(
    (idx: number) => {
      const p = filtered[idx];
      if (!p) return;
      setSelectedId(p.id);
      setPanelMode('browse');
      setPricingEdit(false);
      setSafetyEdit(false);
      setDetailDraft(productToDraft(p));
    },
    [filtered],
  );

  const startCreate = useCallback(() => {
    setSelectedId(null);
    setPanelMode('create');
    setDetailDraft(emptyDetailDraft());
    setPricingEdit(false);
    setSafetyEdit(false);
    rightRef.current?.scrollTo({ top: 0 });
  }, []);

  const startEdit = useCallback(() => {
    if (!selected) return;
    setPanelMode('edit');
    setDetailDraft(productToDraft(selected));
  }, [selected]);

  const cancelPanel = useCallback(() => {
    if (panelMode === 'create') {
      const first = filtered[0];
      if (first) {
        setSelectedId(first.id);
        setPanelMode('browse');
        setDetailDraft(productToDraft(first));
      } else {
        setSelectedId(null);
        setPanelMode('browse');
      }
    } else if (panelMode === 'edit' && selected) {
      setPanelMode('browse');
      setDetailDraft(productToDraft(selected));
    }
    setPricingEdit(false);
    setSafetyEdit(false);
  }, [panelMode, selected, filtered]);

  const saveDetail = useCallback(() => {
    if (panelMode === 'create') {
      const id = `p${Date.now()}`;
      const [s1, s2, s3, s4, s5] = detailDraft.seg;
      const codeKey = `${detailDraft.brand}-${[s1, s2, s3, s4, s5].filter(Boolean).join('-')}`.replace(/-+$/, '');
      const row: MockProduct = {
        id,
        brand: detailDraft.brand,
        brandType: 'aftermarket',
        seg1: s1,
        seg2: s2,
        seg3: s3,
        seg4: s4,
        seg5: s5,
        country: detailDraft.country || 'DEU',
        codeKey,
        name: detailDraft.name,
        group: detailDraft.group,
        warranty: detailDraft.warranty,
        vehicles: detailDraft.vehicles,
        remark: detailDraft.remark,
        active: detailDraft.active,
        cost: 0,
        prices: { a: 0, b: 0, c: 0, d: 0 },
        lastPriceDate: new Date().toISOString().slice(0, 10),
        lastPriceBy: '（新建）',
        stock: { mw1: 0, bw1: 0, bw2: 0 },
        safetyStock: { mw1: 0, bw1: 0, bw2: 0 },
        maxStock: { mw1: 0, bw1: 0, bw2: 0 },
        alternatives: [],
        supersedes: [],
      };
      setProducts((prev) => [...prev, row]);
      setSelectedId(id);
      setPanelMode('browse');
      return;
    }
    if (panelMode === 'edit' && selectedId) {
      const [s1, s2, s3, s4, s5] = detailDraft.seg;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedId
            ? {
                ...p,
                brand: detailDraft.brand,
                seg1: s1,
                seg2: s2,
                seg3: s3,
                seg4: s4,
                seg5: s5,
                country: detailDraft.country,
                codeKey: `${detailDraft.brand}-${[s1, s2, s3, s4, s5].filter(Boolean).join('-')}`.replace(/-+$/, ''),
                name: detailDraft.name,
                group: detailDraft.group,
                warranty: detailDraft.warranty,
                vehicles: detailDraft.vehicles,
                remark: detailDraft.remark,
                active: detailDraft.active,
              }
            : p,
        ),
      );
      setPanelMode('browse');
    }
  }, [panelMode, detailDraft, selectedId]);

  const openPricingEdit = useCallback(() => {
    if (!selected) return;
    setPriceDraft({ ...selected.prices });
    setPricingEdit(true);
  }, [selected]);

  const savePricing = useCallback(() => {
    if (!selectedId || !selected) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, prices: { ...priceDraft }, costAtLastPrice: p.cost } : p)),
    );
    setPricingEdit(false);
  }, [selectedId, selected, priceDraft]);

  const openSafetyEdit = useCallback(() => {
    if (!selected) return;
    setSafetyDraft({ ...selected.safetyStock });
    setMaxDraft({ ...selected.maxStock });
    setSafetyEdit(true);
  }, [selected]);

  const saveSafety = useCallback(() => {
    if (!selectedId) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, safetyStock: { ...safetyDraft }, maxStock: { ...maxDraft } } : p)),
    );
    setSafetyEdit(false);
  }, [selectedId, safetyDraft, maxDraft]);

  const trySave = useCallback(() => {
    if (pricingEdit) {
      savePricing();
      return;
    }
    if (safetyEdit) {
      saveSafety();
      return;
    }
    if (panelMode === 'edit' || panelMode === 'create') {
      saveDetail();
    }
  }, [pricingEdit, safetyEdit, panelMode, savePricing, saveSafety, saveDetail]);

  const tryDetailEdit = useCallback(() => {
    if (pricingEdit || safetyEdit) return;
    if (panelMode === 'browse' && selected) startEdit();
  }, [pricingEdit, safetyEdit, panelMode, selected, startEdit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (isEditableTarget(e.target)) {
        if (e.altKey) e.preventDefault();
        return;
      }
      if (e.altKey && e.ctrlKey && e.metaKey) return;
      if (e.key === 'Escape') {
        if (pricingEdit) {
          setPricingEdit(false);
          return;
        }
        if (safetyEdit) {
          setSafetyEdit(false);
          return;
        }
        if (panelMode === 'edit' || panelMode === 'create') {
          cancelPanel();
        }
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (showAddAlt || showAddSuper) return;
        startCreate();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        tryDetailEdit();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        trySave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pricingEdit, safetyEdit, panelMode, showAddAlt, showAddSuper, startCreate, tryDetailEdit, trySave, cancelPanel]);

  const cost = selected?.cost ?? 0;
  const floorA = cost * 1.1;
  const floorD = cost * 1.15;
  const costDriftPct =
    selected?.costAtLastPrice != null && selected.costAtLastPrice > 0
      ? ((selected.cost - selected.costAtLastPrice) / selected.costAtLastPrice) * 100
      : 0;
  const showCostAlert = selected?.costAtLastPrice != null && Math.abs(costDriftPct) > 5;

  const pricingWarnings = useMemo(() => {
    if (!pricingEdit) return [];
    const w: string[] = [];
    if (priceDraft.d < floorD) w.push(`D 價需 ≥ 成本 × 115%（$${floorD.toFixed(2)}）`);
    if (priceDraft.a < floorA) w.push(`A 價需 ≥ 成本 × 110%（$${floorA.toFixed(2)}）`);
    if (priceDraft.d < priceDraft.a) w.push('D 價需 ≥ A 價');
    return w;
  }, [pricingEdit, priceDraft, floorA, floorD]);

  const totalSafety = selected
    ? WAREHOUSE_ROWS.reduce((s, r) => s + selected.safetyStock[r.key], 0)
    : 0;
  const totalMax = selected ? WAREHOUSE_ROWS.reduce((s, r) => s + selected.maxStock[r.key], 0) : 0;
  const totalStock = selected ? WAREHOUSE_ROWS.reduce((s, r) => s + selected.stock[r.key], 0) : 0;

  const totalStatus = selected
    ? rowSafetyStatus(
        totalStock,
        totalSafety,
        totalMax === 0 ? totalStock + 1 : totalMax,
      )
    : 'ok';

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-4">
      {/* 左欄 */}
      <aside className="flex w-full shrink-0 flex-col border-border/60 lg:w-[320px] lg:border-r lg:pr-4">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">產品管理</h1>
        <p className="text-[11px] text-muted-foreground">NX02 採購｜定價、安全量、關聯料（DEMO）</p>

        <form
          className="mt-3 space-y-3 rounded-xl border border-border/70 bg-muted/10 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-xs">廠牌</Label>
            <select
              className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              value={draftQuery.brand}
              onChange={(e) => setDraftQuery((q) => ({ ...q, brand: e.target.value }))}
            >
              <option value="ALL">全部廠牌</option>
              {BRANDS.filter((b) => b !== 'ALL').map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">SEG</Label>
            <LeftSegSearch
              seg={draftQuery.seg}
              country={draftQuery.country}
              onSeg={(i, v) =>
                setDraftQuery((q) => {
                  const next = [...q.seg] as AppliedQuery['seg'];
                  next[i] = v;
                  return { ...q, seg: next };
                })
              }
              onCountry={(v) => setDraftQuery((q) => ({ ...q, country: v }))}
            />
          </div>
          <Button type="submit" className="w-full" variant="secondary">
            ENTER 搜尋
          </Button>
        </form>

        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">快速篩選</p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { k: 'all' as const, label: '全部' },
                { k: 'inStock' as const, label: '有庫存' },
                { k: 'noPrice' as const, label: '無售價' },
                { k: 'noSafety' as const, label: '無安全量' },
              ] as const
            ).map(({ k, label }) => (
              <button
                key={k}
                type="button"
                onClick={() => setQuickFilter(k)}
                className={cx(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition',
                  quickFilter === k
                    ? 'border-[#E8A020]/80 bg-[#E8A020]/20 text-foreground'
                    : 'border-border/80 bg-background/60 text-muted-foreground hover:bg-muted/50',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-border/70 bg-background/40">
          <div className="border-b border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            料號 / 廠牌 / 本倉庫存
          </div>
          <div
            ref={listRef}
            tabIndex={0}
            className="max-h-[min(52vh,28rem)] overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setListFocusIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setListFocusIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                selectByIndex(listFocusIndex);
              }
            }}
          >
            {filtered.map((p, idx) => {
              const active = p.id === selectedId;
              const kb = idx === listFocusIndex;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setListFocusIndex(idx);
                    selectByIndex(idx);
                  }}
                  className={cx(
                    'flex w-full flex-col gap-0.5 border-b border-border/40 px-3 py-2.5 text-left transition',
                    (active || kb) && 'bg-primary/5',
                    active && 'border-l-4 border-l-[#E8A020] pl-[calc(0.75rem-4px)]',
                    !active && kb && 'ring-1 ring-inset ring-primary/25',
                  )}
                >
                  <div className="font-mono text-xs text-primary">{formatPartDisplay(p.codeKey, p.country)}</div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <span className="line-clamp-1">{p.name}</span>
                    <span
                      className={cx(
                        'shrink-0 rounded px-1 py-px text-[10px] font-medium',
                        p.brandType === 'oem' ? 'bg-[#E8A020]/25 text-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {p.brandType === 'oem' ? 'OEM' : '副廠'}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    本倉{' '}
                    <span className={cx('tabular-nums', p.stock.mw1 === 0 && 'font-medium text-red-600')}>
                      {p.stock.mw1}
                    </span>{' '}
                    他倉 <span className="tabular-nums">{totalOtherStock(p)}</span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">無符合條件的料號</p>
            ) : null}
          </div>
          <div className="border-t border-border/60 p-2">
            <Button type="button" variant="outline" className="w-full text-xs" onClick={startCreate}>
              + 新增產品 <span className="ml-1 text-[10px] text-muted-foreground">Alt+A</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* 右欄 */}
      <div ref={rightRef} className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto pb-8">
        {!selected && panelMode !== 'create' ? (
          <p className="text-sm text-muted-foreground">請由左側選擇料號，或新增產品。</p>
        ) : (
          <>
            {/* 區塊二：詳細 */}
            <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">詳細資料</h2>
                <div className="flex flex-wrap gap-2">
                  {panelMode === 'browse' && selected ? (
                    <>
                      <Button type="button" size="sm" variant="secondary" onClick={startEdit}>
                        編輯 <span className="ml-1 text-[10px] text-muted-foreground">Alt+E</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.alert('DEMO：停用料號')}
                      >
                        停用料號
                      </Button>
                    </>
                  ) : null}
                  {panelMode === 'create' ? (
                    <>
                      <Button type="button" size="sm" onClick={saveDetail}>
                        儲存 <span className="ml-1 text-[10px] opacity-80">Alt+S</span>
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancelPanel}>
                        取消 Esc
                      </Button>
                    </>
                  ) : null}
                  {panelMode === 'edit' ? (
                    <>
                      <Button type="button" size="sm" onClick={saveDetail}>
                        儲存 <span className="ml-1 text-[10px] opacity-80">Alt+S</span>
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancelPanel}>
                        取消 Esc
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.alert('DEMO：停用料號')}
                      >
                        停用料號
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {panelMode === 'browse' && selected ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-primary">
                      {formatPartDisplay(selected.codeKey, selected.country)}
                    </span>
                    <span
                      className={cx(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        selected.active ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {selected.active ? '啟用' : '停用'}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">
                    {selected.name}{' '}
                    <span className="text-muted-foreground">|</span> {selected.group}{' '}
                    <span className="text-muted-foreground">|</span>{' '}
                    {selected.brandType === 'oem' ? 'OEM' : '副廠'}
                    <span className="text-muted-foreground"> |</span> 保固 {selected.warranty} 個月
                  </p>
                  <p className="text-xs text-muted-foreground">
                    適用車型：{selected.vehicles.length ? selected.vehicles.join('　') : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">備註：{selected.remark || '—'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs font-medium text-muted-foreground">【基本資料】</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">廠牌（必填）</Label>
                      <select
                        className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                        value={detailDraft.brand}
                        onChange={(e) => setDetailDraft((d) => ({ ...d, brand: e.target.value }))}
                      >
                        {BRANDS.filter((b) => b !== 'ALL').map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">料號（顯示）</Label>
                      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-muted-foreground">
                        {detailDraft.brand}-{detailDraft.seg.filter(Boolean).join('-') || '—'} #{detailDraft.country || '—'}
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">SEG 分段</Label>
                      <DetailSegInputs
                        seg={detailDraft.seg}
                        country={detailDraft.country}
                        onSeg={(i, v) =>
                          setDetailDraft((d) => {
                            const next = [...d.seg] as DetailDraft['seg'];
                            next[i] = v;
                            return { ...d, seg: next };
                          })
                        }
                        onCountry={(v) => setDetailDraft((d) => ({ ...d, country: v }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="nx02-p-name" className="text-xs">
                        品名（中文）
                      </Label>
                      <Input
                        id="nx02-p-name"
                        value={detailDraft.name}
                        onChange={(e) => setDetailDraft((d) => ({ ...d, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">零件族群</Label>
                      <select
                        className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                        value={detailDraft.group}
                        onChange={(e) => setDetailDraft((d) => ({ ...d, group: e.target.value as PartGroup }))}
                      >
                        {PART_GROUPS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nx02-p-war" className="text-xs">
                        保固月數
                      </Label>
                      <Input
                        id="nx02-p-war"
                        type="number"
                        min={0}
                        value={detailDraft.warranty}
                        onChange={(e) => setDetailDraft((d) => ({ ...d, warranty: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">適用車型（選填）</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {detailDraft.vehicles.map((v) => (
                          <span
                            key={v}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
                          >
                            {v}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setDetailDraft((d) => ({ ...d, vehicles: d.vehicles.filter((x) => x !== v) }))
                              }
                              aria-label={`移除 ${v}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <span className="flex gap-1">
                          <Input
                            className="h-8 w-36 text-xs"
                            placeholder="新增車型"
                            value={newVehicle}
                            onChange={(e) => setNewVehicle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newVehicle.trim()) {
                                setDetailDraft((d) => ({
                                  ...d,
                                  vehicles: [...d.vehicles, newVehicle.trim()],
                                }));
                                setNewVehicle('');
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => {
                              if (!newVehicle.trim()) return;
                              setDetailDraft((d) => ({ ...d, vehicles: [...d.vehicles, newVehicle.trim()] }));
                              setNewVehicle('');
                            }}
                          >
                            + 新增
                          </Button>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:col-span-2">
                      <span className="text-xs text-muted-foreground">狀態</span>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="radio"
                          checked={detailDraft.active}
                          onChange={() => setDetailDraft((d) => ({ ...d, active: true }))}
                        />
                        啟用
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="radio"
                          checked={!detailDraft.active}
                          onChange={() => setDetailDraft((d) => ({ ...d, active: false }))}
                        />
                        停用
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nx02-p-rm" className="text-xs">
                      備註
                    </Label>
                    <Textarea id="nx02-p-rm" rows={3} value={detailDraft.remark} onChange={(e) => setDetailDraft((d) => ({ ...d, remark: e.target.value }))} />
                  </div>
                </div>
              )}
            </section>

            {panelMode === 'browse' && selected ? (
              <>
                {/* 區塊四 */}
                <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
                  <Tabs
                    value={relatedTab}
                    onValueChange={(v) => {
                      setRelatedTab(v as 'alt' | 'super');
                      setShowAddAlt(false);
                      setShowAddSuper(false);
                    }}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <TabsList className="h-8">
                        <TabsTrigger value="alt" className="text-xs">
                          通用件對應
                        </TabsTrigger>
                        <TabsTrigger value="super" className="text-xs">
                          改號紀錄
                        </TabsTrigger>
                      </TabsList>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          if (relatedTab === 'alt') {
                            setShowAddAlt((v) => !v);
                            setShowAddSuper(false);
                          } else {
                            setShowAddSuper((v) => !v);
                            setShowAddAlt(false);
                          }
                        }}
                      >
                        + 新增{relatedTab === 'alt' ? '對應' : '改號'}
                      </Button>
                    </div>
                    <TabsContent value="alt" className="mt-0 space-y-3">
                      <div className="overflow-x-auto rounded-lg border border-border/60">
                        <table className="w-full min-w-[520px] text-left text-xs">
                          <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                            <tr>
                              <th className="px-2 py-2">料號</th>
                              <th className="px-2 py-2">廠牌</th>
                              <th className="px-2 py-2">類型</th>
                              <th className="px-2 py-2">本倉庫存</th>
                              <th className="px-2 py-2">關係</th>
                              <th className="px-2 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {selected.alternatives.map((r) => (
                              <tr key={r.id} className="border-b border-border/40">
                                <td className="px-2 py-2 font-mono">{r.codeDisplay}</td>
                                <td className="px-2 py-2">{r.brand}</td>
                                <td className="px-2 py-2">{r.type === 'oem' ? 'OEM' : '副廠'}</td>
                                <td className="px-2 py-2 tabular-nums">{r.stockLocal}</td>
                                <td className="px-2 py-2">{r.relation === 'replace' ? '可替代' : '功能相近'}</td>
                                <td className="px-2 py-2">
                                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]">
                                    移除
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {showAddAlt ? (
                        <div className="rounded-lg border border-dashed border-border p-3 text-xs space-y-2">
                          <p className="font-medium text-foreground">+ 新增對應</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <Label className="text-[11px]">搜尋料號（SEG）</Label>
                              <LeftSegSearch
                                seg={['', '', '', '', '']}
                                country=""
                                onSeg={() => {}}
                                onCountry={() => {}}
                                disabled
                              />
                              <p className="mt-1 text-[10px] text-muted-foreground">DEMO：輸入已停用，僅示意版型。</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground">關係類型</span>
                              <div className="flex flex-col gap-1">
                                <label className="flex items-center gap-2">
                                  <input type="radio" name="rel" defaultChecked /> 可替代
                                </label>
                                <label className="flex items-center gap-2">
                                  <input type="radio" name="rel" /> 功能相近（不完全相容）
                                </label>
                              </div>
                            </div>
                          </div>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddAlt(false)}>
                            確認新增
                          </Button>
                        </div>
                      ) : null}
                    </TabsContent>
                    <TabsContent value="super" className="mt-0 space-y-3">
                      <div className="overflow-x-auto rounded-lg border border-border/60">
                        <table className="w-full min-w-[560px] text-left text-xs">
                          <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                            <tr>
                              <th className="px-2 py-2">方向</th>
                              <th className="px-2 py-2">舊料號</th>
                              <th className="px-2 py-2">新料號</th>
                              <th className="px-2 py-2">日期</th>
                              <th className="px-2 py-2">原因</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.supersedes.map((r) => (
                              <tr key={r.id} className="border-b border-border/40">
                                <td className="px-2 py-2">{r.direction === 'up' ? '↑ 升版' : '↓'}</td>
                                <td className="px-2 py-2 font-mono">{r.oldDisplay}</td>
                                <td className="px-2 py-2 font-mono">{r.newDisplay}</td>
                                <td className="px-2 py-2">{r.date}</td>
                                <td className="px-2 py-2">{r.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        舊料號在系統內保留並標記「已停產」；歷史採購／銷售記錄不受影響。查詢舊料號時提示「此料號已改版，新料號為 XXX」。
                      </p>
                      {showAddSuper ? (
                        <div className="rounded-lg border border-dashed border-border p-3 text-xs space-y-2">
                          <p className="font-medium">+ 新增改號記錄</p>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2">
                              <input type="radio" name="dir" defaultChecked /> 此料號為新版（舊料號是 ___）
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="radio" name="dir" /> 此料號已改版（新料號是 ___）
                            </label>
                          </div>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddSuper(false)}>
                            確認建立
                          </Button>
                        </div>
                      ) : null}
                    </TabsContent>
                  </Tabs>
                </section>

                {/* 區塊五：定價 */}
                <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">定價表</h2>
                    {!pricingEdit ? (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          上次定價：{selected.lastPriceDate}　{selected.lastPriceBy}
                        </span>
                        <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={openPricingEdit}>
                          編輯定價
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button type="button" size="sm" className="h-8 text-xs" onClick={savePricing}>
                          儲存 Alt+S
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setPricingEdit(false)}>
                          取消
                        </Button>
                      </div>
                    )}
                  </div>

                  {showCostAlert ? (
                    <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                      <p className="font-medium text-amber-900 dark:text-amber-200">⚠️ 成本異動提醒</p>
                      <p className="mt-1 text-muted-foreground">
                        上次定價成本：${selected.costAtLastPrice?.toFixed(2)}　→　最近入帳成本：${selected.cost.toFixed(2)}{' '}
                        （{costDriftPct >= 0 ? '↑' : '↓'} {Math.abs(costDriftPct).toFixed(1)}%）
                      </p>
                      <Button type="button" size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={openPricingEdit}>
                        前往編輯定價
                      </Button>
                    </div>
                  ) : null}

                  {!pricingEdit ? (
                    <div className="space-y-3 text-xs">
                      <p>
                        進貨成本：<span className="font-mono text-sm text-foreground">${selected.cost.toFixed(2)}</span>（最近入帳）
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-border/60">
                        <table className="w-full min-w-[480px] text-left">
                          <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                            <tr>
                              <th className="px-2 py-2">等級</th>
                              <th className="px-2 py-2">售價</th>
                              <th className="px-2 py-2">毛利率</th>
                              <th className="px-2 py-2">最低毛利門檻</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(
                              [
                                { k: 'a' as const, label: 'A 價', floor: floorA },
                                { k: 'b' as const, label: 'B 價', floor: null },
                                { k: 'c' as const, label: 'C 價', floor: null },
                                { k: 'd' as const, label: 'D 價', floor: floorD },
                              ] as const
                            ).map(({ k, label, floor }) => {
                              const price = selected.prices[k];
                              const m = marginOnCost(price, selected.cost);
                              const okFloor = floor == null || price >= floor;
                              return (
                                <tr key={k} className="border-b border-border/40">
                                  <td className="px-2 py-2">{label}</td>
                                  <td className="px-2 py-2 font-mono">${price.toFixed(2)}</td>
                                  <td className="px-2 py-2 tabular-nums">{m.toFixed(1)}%</td>
                                  <td className="px-2 py-2 text-muted-foreground">
                                    {floor != null ? `≥ $${floor.toFixed(2)}（成本×${k === 'a' ? '110%' : '115%'}）` : '—'}{' '}
                                    {okFloor ? '✅' : '⚠️'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-muted-foreground">
                        最低售價（業務不得低於）：<span className="font-mono text-foreground">${selected.prices.a.toFixed(2)}</span>（= A 價）
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <p className="font-medium text-foreground">定價表（編輯中）</p>
                      <p>
                        進貨成本：<span className="font-mono">${cost.toFixed(2)}</span>
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-border/60">
                        <table className="w-full min-w-[440px] text-left">
                          <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                            <tr>
                              <th className="px-2 py-2">等級</th>
                              <th className="px-2 py-2">設定售價</th>
                              <th className="px-2 py-2">毛利率</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(['a', 'b', 'c', 'd'] as const).map((k) => {
                              const price = priceDraft[k];
                              const m = marginOnCost(price, cost);
                              return (
                                <tr key={k} className="border-b border-border/40">
                                  <td className="px-2 py-2">{k.toUpperCase()} 價</td>
                                  <td className="px-2 py-2">
                                    <Input
                                      className="h-8 w-28 font-mono text-xs"
                                      inputMode="decimal"
                                      value={String(priceDraft[k])}
                                      onChange={(e) => {
                                        const n = parseFloat(e.target.value);
                                        setPriceDraft((d) => ({ ...d, [k]: Number.isFinite(n) ? n : 0 }));
                                      }}
                                    />
                                  </td>
                                  <td className="px-2 py-2 tabular-nums">{m.toFixed(1)}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {pricingWarnings.length ? (
                        <div className="rounded-md border border-amber-500/35 bg-amber-500/10 p-2 text-[11px] text-amber-950 dark:text-amber-100">
                          <p className="font-medium">⚠️ 系統警示（儲存前檢核）</p>
                          <ul className="mt-1 list-inside list-disc">
                            {pricingWarnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-emerald-700 dark:text-emerald-400">✅ 符合門檻</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">儲存後通知業務組長：售價已更新（DEMO 未送出）。</p>
                    </div>
                  )}
                </section>

                {/* 區塊六 */}
                <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">安全量與最高量</h2>
                    {!safetyEdit ? (
                      <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={openSafetyEdit}>
                        編輯 Alt+E
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button type="button" size="sm" className="h-8 text-xs" onClick={saveSafety}>
                          儲存 Alt+S
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSafetyEdit(false)}>
                          取消
                        </Button>
                      </div>
                    )}
                  </div>

                  {!safetyEdit ? (
                    <div className="space-y-3 text-xs">
                      <div className="overflow-x-auto rounded-lg border border-border/60">
                        <table className="w-full min-w-[520px] text-left">
                          <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                            <tr>
                              <th className="px-2 py-2" />
                              <th className="px-2 py-2">安全量</th>
                              <th className="px-2 py-2">最高量</th>
                              <th className="px-2 py-2">目前庫存</th>
                              <th className="px-2 py-2">狀態</th>
                            </tr>
                          </thead>
                          <tbody>
                            {WAREHOUSE_ROWS.map(({ key, label }) => {
                              const st = selected.stock[key];
                              const sf = selected.safetyStock[key];
                              const mx = selected.maxStock[key];
                              const status = rowSafetyStatus(st, sf, mx);
                              const meta = statusCellMeta(status);
                              return (
                                <tr key={key} className="border-b border-border/40">
                                  <td className="px-2 py-2">{label}</td>
                                  <td className="px-2 py-2 tabular-nums">{sf}</td>
                                  <td className="px-2 py-2 tabular-nums">{mx}</td>
                                  <td className="px-2 py-2 tabular-nums">{st}</td>
                                  <td className={cx('px-2 py-2', meta.className)}>
                                    {meta.emoji} {meta.label}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="bg-muted/20 font-medium">
                              <td className="px-2 py-2">全公司合計</td>
                              <td className="px-2 py-2 tabular-nums">{totalSafety}</td>
                              <td className="px-2 py-2 tabular-nums">{totalMax}</td>
                              <td className="px-2 py-2 tabular-nums">{totalStock}</td>
                              <td className={cx('px-2 py-2', statusCellMeta(totalStatus).className)}>
                                {statusCellMeta(totalStatus).emoji} {statusCellMeta(totalStatus).label}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="rounded-md bg-muted/20 p-2 text-[11px] leading-relaxed text-muted-foreground">
                        <p>
                          系統計算參考：平均日出貨量 5 個 × 廠商交貨天數 7 天 + 緩衝 3 天 = 建議安全量 50；急迫性係數 × 3 = 建議最高量 150。
                        </p>
                        <p className="mt-1">
                          倉管組長建議（MW1 王組長，2026-04-18）：安全量 30 / 最高量 80　說明：體積小，主倉可多放。
                        </p>
                        <p className="mt-1">上次設定：2026-03-01　王採購組長</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <p className="font-medium">安全量與最高量（編輯中）</p>
                      <div className="overflow-x-auto rounded-lg border border-border/60">
                        <table className="w-full min-w-[560px] text-left">
                          <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                            <tr>
                              <th className="px-2 py-2" />
                              <th className="px-2 py-2">安全量</th>
                              <th className="px-2 py-2">最高量</th>
                              <th className="px-2 py-2">倉管建議安全量</th>
                              <th className="px-2 py-2">倉管建議最高量</th>
                            </tr>
                          </thead>
                          <tbody>
                            {WAREHOUSE_ROWS.map(({ key, label }) => (
                              <tr key={key} className="border-b border-border/40">
                                <td className="px-2 py-2">{label}</td>
                                <td className="px-2 py-2">
                                  <Input
                                    className="h-8 w-16 font-mono"
                                    inputMode="numeric"
                                    value={safetyDraft[key]}
                                    onChange={(e) =>
                                      setSafetyDraft((d) => ({ ...d, [key]: Number(e.target.value) || 0 }))
                                    }
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <Input
                                    className="h-8 w-16 font-mono"
                                    inputMode="numeric"
                                    value={maxDraft[key]}
                                    onChange={(e) => setMaxDraft((d) => ({ ...d, [key]: Number(e.target.value) || 0 }))}
                                  />
                                </td>
                                <td className="px-2 py-2 tabular-nums text-muted-foreground">{selected.safetyStock[key]}</td>
                                <td className="px-2 py-2 tabular-nums text-muted-foreground">{selected.maxStock[key]}</td>
                              </tr>
                            ))}
                            <tr className="bg-muted/20 font-medium">
                              <td className="px-2 py-2">全公司合計</td>
                              <td className="px-2 py-2 tabular-nums">
                                {WAREHOUSE_ROWS.reduce((s, r) => s + safetyDraft[r.key], 0)}
                              </td>
                              <td className="px-2 py-2 tabular-nums">{WAREHOUSE_ROWS.reduce((s, r) => s + maxDraft[r.key], 0)}</td>
                              <td className="px-2 py-2" colSpan={2} />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[11px] text-muted-foreground">儲存後系統自動啟動補貨偵測（DEMO）。</p>
                    </div>
                  )}
                </section>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
