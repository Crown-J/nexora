/**
 * @FUNCTION_CODE NX02-PROD-UI-001-F01
 * 採購產品管理：左欄查詢／清單 + 右欄詳細、關聯（R/S/C/B）、定價、安全量（DEMO mock）
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
  type PartTypeCode,
  type QuickFilter,
  type ReturnPolicyCode,
  cloneMockProducts,
  buildPartPreview,
  MOCK_PRODUCTS,
  CODE_RULES,
  COUNTRY_OPTIONS,
  getCodeRule,
  PART_TYPE_OPTIONS,
  RETURN_POLICY_OPTIONS,
  SEARCH_SEG_LIMITS,
  WAREHOUSE_ROWS,
  filterProducts,
  formatPartDisplay,
  suggestedPriceBandA,
  totalOtherStock,
} from './mock-data';

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

const BRANDS = ['ALL', 'VAG', 'MANN', 'BOSCH'] as const;
const PART_GROUPS: PartGroup[] = ['濾芯', '煞車', '燈具', '電子', '其他'];

type PanelMode = 'browse' | 'create' | 'edit';
type RelTab = 'R' | 'S' | 'C' | 'B';
type AddFor = null | RelTab;

type DetailDraft = {
  brand: string;
  codeRuleId: string;
  seg: [string, string, string, string, string];
  country: string;
  name: string;
  secCode: string;
  partType: PartTypeCode;
  group: PartGroup;
  spec: string;
  unit: string;
  warranty: number;
  returnPolicy: ReturnPolicyCode;
  vehicles: string[];
  remark: string;
  active: boolean;
  brandType: 'oem' | 'aftermarket';
};

function emptyDetailDraft(): DetailDraft {
  return {
    brand: '',
    codeRuleId: '',
    seg: ['', '', '', '', ''],
    country: '',
    name: '',
    secCode: '',
    partType: 'A',
    group: '濾芯',
    spec: '',
    unit: 'pcs',
    warranty: 12,
    returnPolicy: 'S',
    vehicles: [],
    remark: '',
    active: true,
    brandType: 'aftermarket',
  };
}

function productToDraft(p: MockProduct): DetailDraft {
  return {
    brand: p.brand,
    codeRuleId: p.codeRuleId,
    seg: [p.seg1, p.seg2, p.seg3, p.seg4, p.seg5],
    country: p.country,
    name: p.name,
    secCode: p.secCode,
    partType: p.partType,
    group: p.group,
    spec: p.spec,
    unit: p.unit,
    warranty: p.warranty,
    returnPolicy: p.returnPolicy,
    vehicles: [...p.vehicles],
    remark: p.remark,
    active: p.active,
    brandType: p.brandType,
  };
}

function buildCodeKey(brand: string, seg: readonly [string, string, string, string, string], limits: readonly number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (limits[i] <= 0) continue;
    const s = (seg[i] ?? '').trim();
    if (s) parts.push(s);
  }
  const b = brand.trim();
  if (!b) return parts.join('-');
  return parts.length ? `${b}-${parts.join('-')}` : `${b}-`;
}

function nextActiveSeg(limits: readonly number[], from: number): number | null {
  for (let j = from + 1; j < 5; j++) if (limits[j] > 0) return j;
  return null;
}

function prevActiveSeg(limits: readonly number[], from: number): number | null {
  for (let j = from - 1; j >= 0; j--) if (limits[j] > 0) return j;
  return null;
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

function partTypeLabel(code: PartTypeCode): string {
  return PART_TYPE_OPTIONS.find((o) => o.code === code)?.label ?? code;
}

function returnPolicyShort(code: ReturnPolicyCode): string {
  const row = RETURN_POLICY_OPTIONS.find((o) => o.code === code);
  return row ? row.label.split(' —')[0] ?? row.label : code;
}

/** 通用 SEG 列：依 limits 顯示／停用、填滿跳下一格、Backspace 回上一格 */
function SegInputRow({
  limits,
  idPrefix,
  seg,
  onSeg,
  disabled,
  size = 'sm',
}: {
  limits: readonly [number, number, number, number, number];
  idPrefix: string;
  seg: [string, string, string, string, string];
  onSeg: (i: number, v: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const h = size === 'md' ? 'h-9 w-[3.5rem] text-sm' : 'h-8 w-[3.25rem] text-xs';
  const ro = !!disabled;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-0.5 font-mono">
        {([0, 1, 2, 3, 4] as const).map((i) => {
          const lim = limits[i];
          if (lim <= 0) {
            return (
              <span key={i} className="flex items-center gap-0.5">
                <span
                  className={cx(
                    'flex items-center justify-center rounded border border-border/50 bg-muted/40 text-[10px] text-muted-foreground',
                    h,
                  )}
                  title="此段未使用"
                >
                  —
                </span>
                {i < 4 ? <span className="text-muted-foreground">·</span> : null}
              </span>
            );
          }
          const ph = '0'.repeat(Math.min(lim, 3));
          return (
            <span key={i} className="flex items-center gap-0.5">
              <input
                id={`${idPrefix}-seg${i + 1}`}
                disabled={ro}
                placeholder={ph}
                value={seg[i]}
                onChange={(e) => {
                  const raw = e.target.value;
                  const cap = raw.slice(0, lim);
                  onSeg(i, cap);
                  if (!ro && cap.length === lim) {
                    const n = nextActiveSeg(limits, i);
                    if (n != null) requestAnimationFrame(() => document.getElementById(`${idPrefix}-seg${n + 1}`)?.focus());
                  }
                }}
                onKeyDown={(e) => {
                  if (ro) return;
                  if (e.key === 'Backspace' && seg[i] === '') {
                    const p = prevActiveSeg(limits, i);
                    if (p != null) {
                      e.preventDefault();
                      requestAnimationFrame(() => {
                        const el = document.getElementById(`${idPrefix}-seg${p + 1}`) as HTMLInputElement | null;
                        el?.focus();
                        el?.setSelectionRange(el.value.length, el.value.length);
                      });
                    }
                  }
                }}
                className={cx(
                  'rounded border border-border bg-background px-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  h,
                  ro && 'cursor-not-allowed bg-muted/40 text-muted-foreground',
                )}
                maxLength={lim}
                aria-label={`SEG${i + 1}`}
              />
              {i < 4 ? <span className="text-muted-foreground">·</span> : null}
            </span>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">SEG1～SEG5 標籤依規則；有效段填滿自動跳下一格，Backspace 於空欄可退回上一段。</p>
    </div>
  );
}

export function PurchaseProductManagementView() {
  const [products, setProducts] = useState<MockProduct[]>(() => cloneMockProducts());
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
  const [relTab, setRelTab] = useState<RelTab>('R');
  const [addFor, setAddFor] = useState<AddFor>(null);
  const [newVehicle, setNewVehicle] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const draftRule = useMemo(() => getCodeRule(detailDraft.codeRuleId || CODE_RULES[0]!.id), [detailDraft.codeRuleId]);
  const draftLimits = draftRule.segMax;

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
    if (panelMode === 'edit' && selected?.hasTransactionHistory) {
      setDetailDraft((d) => ({
        ...d,
        seg: [selected.seg1, selected.seg2, selected.seg3, selected.seg4, selected.seg5],
      }));
    }
  }, [panelMode, selected?.id, selected?.hasTransactionHistory, selected?.seg1, selected?.seg2, selected?.seg3, selected?.seg4, selected?.seg5]);

  useEffect(() => {
    if ((selected || panelMode === 'create') && rightRef.current) {
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
      setAddFor(null);
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
    setAddFor(null);
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
    const rule = getCodeRule(detailDraft.codeRuleId || CODE_RULES[0]!.id);
    const lims = rule.segMax;
    if (panelMode === 'create') {
      if (!detailDraft.brand.trim() || !detailDraft.codeRuleId || !detailDraft.name.trim()) {
        window.alert('請填寫廠牌、編碼規則與品名（必填）');
        return;
      }
      const id = `p${Date.now()}`;
      const seg = detailDraft.seg;
      const codeKey = buildCodeKey(detailDraft.brand, seg, lims).replace(/-+$/, '');
      const row: MockProduct = {
        id,
        brand: detailDraft.brand.trim(),
        brandType: detailDraft.brandType,
        codeRuleId: detailDraft.codeRuleId,
        seg1: seg[0],
        seg2: seg[1],
        seg3: seg[2],
        seg4: seg[3],
        seg5: seg[4],
        country: detailDraft.country.trim(),
        codeKey,
        name: detailDraft.name.trim(),
        secCode: detailDraft.secCode.trim(),
        partType: detailDraft.partType,
        group: detailDraft.group,
        spec: detailDraft.spec.trim(),
        unit: detailDraft.unit.trim() || 'pcs',
        warranty: detailDraft.warranty,
        returnPolicy: detailDraft.returnPolicy,
        vehicles: detailDraft.vehicles,
        remark: detailDraft.remark.trim(),
        active: detailDraft.active,
        hasTransactionHistory: false,
        cost: 0,
        prices: { a: 0, b: 0, c: 0, d: 0 },
        lastPriceDate: new Date().toISOString().slice(0, 10),
        lastPriceBy: '（新建）',
        stock: { mw1: 0, bw1: 0, bw2: 0 },
        safetyStock: { mw1: 0, bw1: 0, bw2: 0 },
        maxStock: { mw1: 0, bw1: 0, bw2: 0 },
        alternatives: [],
        supersedes: [],
        companions: [],
        bundleRows: [],
      };
      setProducts((prev) => [...prev, row]);
      setSelectedId(id);
      setPanelMode('browse');
      return;
    }
    if (panelMode === 'edit' && selectedId && selected) {
      const locks = selected.hasTransactionHistory;
      const s = locks
        ? ([selected.seg1, selected.seg2, selected.seg3, selected.seg4, selected.seg5] as const)
        : detailDraft.seg;
      const codeKey = buildCodeKey(detailDraft.brand, s, lims).replace(/-+$/, '');
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedId
            ? {
                ...p,
                brand: detailDraft.brand,
                codeRuleId: detailDraft.codeRuleId,
                seg1: s[0],
                seg2: s[1],
                seg3: s[2],
                seg4: s[3],
                seg5: s[4],
                country: detailDraft.country,
                codeKey,
                name: detailDraft.name,
                secCode: detailDraft.secCode,
                partType: detailDraft.partType,
                group: detailDraft.group,
                spec: detailDraft.spec,
                unit: detailDraft.unit,
                warranty: detailDraft.warranty,
                returnPolicy: detailDraft.returnPolicy,
                vehicles: detailDraft.vehicles,
                remark: detailDraft.remark,
                active: detailDraft.active,
                brandType: detailDraft.brandType,
              }
            : p,
        ),
      );
      setPanelMode('browse');
    }
  }, [panelMode, detailDraft, selectedId, selected]);

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
        if (addFor) {
          setAddFor(null);
          return;
        }
        if (panelMode === 'edit' || panelMode === 'create') {
          cancelPanel();
        }
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (addFor) return;
        startCreate();
        return;
      }
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (panelMode === 'browse' && selected && !pricingEdit && !safetyEdit) openPricingEdit();
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
  }, [
    pricingEdit,
    safetyEdit,
    panelMode,
    addFor,
    startCreate,
    tryDetailEdit,
    trySave,
    cancelPanel,
    selected,
    openPricingEdit,
  ]);

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
    ? rowSafetyStatus(totalStock, totalSafety, totalMax === 0 ? totalStock + 1 : totalMax)
    : 'ok';

  const previewDisplay = buildPartPreview(
    detailDraft.brand,
    detailDraft.seg,
    draftLimits as [number, number, number, number, number],
    detailDraft.country,
  );

  const segEditableCreate = !!(detailDraft.brand && detailDraft.codeRuleId);
  const segLockedEdit = !!(panelMode === 'edit' && selected?.hasTransactionHistory);
  const segDisabled = panelMode === 'create' ? !segEditableCreate : segLockedEdit;

  const sumSafetyDraft = WAREHOUSE_ROWS.reduce((s, r) => s + safetyDraft[r.key], 0);
  const sumMaxDraft = WAREHOUSE_ROWS.reduce((s, r) => s + maxDraft[r.key], 0);
  const suggestSafe = 50;
  const suggestMax = 150;

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-4">
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
            <div className="flex flex-wrap items-end gap-2">
              <SegInputRow
                idPrefix="nx02-q"
                limits={SEARCH_SEG_LIMITS as [number, number, number, number, number]}
                seg={draftQuery.seg}
                onSeg={(i, v) =>
                  setDraftQuery((q) => {
                    const next = [...q.seg] as AppliedQuery['seg'];
                    next[i] = v;
                    return { ...q, seg: next };
                  })
                }
              />
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">產地</Label>
                <select
                  className="nx-native-select h-8 min-w-[8.5rem] rounded-md border border-input bg-transparent px-2 text-xs"
                  value={draftQuery.country}
                  onChange={(e) => setDraftQuery((q) => ({ ...q, country: e.target.value }))}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.iso || 'any'} value={c.iso}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
          <div className="border-b border-border/60 px-3 py-2 text-[11px] text-muted-foreground">料號 / 廠牌 / 本倉庫存</div>
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
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="text-foreground">{p.brand}</span>
                    <span className="text-muted-foreground">|</span>
                    <span>
                      本倉{' '}
                      <span className={cx('tabular-nums text-foreground', p.stock.mw1 === 0 && 'font-medium text-red-600')}>
                        {p.stock.mw1}
                      </span>
                    </span>
                  </div>
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
                    他倉 <span className="tabular-nums text-foreground">{totalOtherStock(p)}</span>
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

      <div ref={rightRef} className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto pb-8">
        {!selected && panelMode !== 'create' ? (
          <p className="text-sm text-muted-foreground">請由左側選擇料號，或新增產品。</p>
        ) : (
          <>
            <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">詳細資料</h2>
                <div className="flex flex-wrap gap-2">
                  {panelMode === 'browse' && selected ? (
                    <>
                      <Button type="button" size="sm" variant="secondary" onClick={startEdit}>
                        編輯 <span className="ml-1 text-[10px] text-muted-foreground">Alt+E</span>
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => window.alert('DEMO：停用料號')}>
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
                      <Button type="button" size="sm" variant="outline" onClick={() => window.alert('DEMO：停用料號')}>
                        停用料號
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {panelMode === 'browse' && selected ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-primary">{formatPartDisplay(selected.codeKey, selected.country)}</span>
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
                    {selected.name}
                    <span className="text-muted-foreground"> | </span>
                    {selected.group}
                    <span className="text-muted-foreground"> | </span>
                    {selected.brandType === 'oem' ? 'OEM' : '副廠'}
                    <span className="text-muted-foreground"> | </span>
                    {partTypeLabel(selected.partType)}
                    <span className="text-muted-foreground"> | </span>保固 {selected.warranty} 個月
                    <span className="text-muted-foreground"> | </span>
                    {returnPolicyShort(selected.returnPolicy)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    廠牌：{selected.brand}　　編碼規則：{getCodeRule(selected.codeRuleId).label}　　產地：
                    {selected.country ? COUNTRY_OPTIONS.find((c) => c.iso === selected.country)?.label ?? selected.country : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">規格：{selected.spec || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    適用車型：{selected.vehicles.length ? selected.vehicles.join('　') : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">備註：{selected.remark || '—'}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">【料號建立】</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">廠牌（必填）</Label>
                        <select
                          className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                          value={detailDraft.brand}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, brand: e.target.value }))}
                        >
                          <option value="">— 請選擇 —</option>
                          {BRANDS.filter((b) => b !== 'ALL').map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-muted-foreground">
                          選完顯示：前綴將為「{detailDraft.brand ? `${detailDraft.brand}-` : '…'}」
                        </p>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">編碼規則（必填，與廠牌獨立）</Label>
                        <select
                          className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                          value={detailDraft.codeRuleId}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, codeRuleId: e.target.value }))}
                        >
                          <option value="">— 請選擇 —</option>
                          {CODE_RULES.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">SEG 輸入（依規則動態調整）</Label>
                        {segLockedEdit ? (
                          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-950 dark:text-amber-100">
                            此料號已有採購／銷售／庫存記錄，料號不可變更；如需改號請使用「改號紀錄 (S)」功能。
                          </p>
                        ) : null}
                        <SegInputRow
                          idPrefix="nx02-d"
                          limits={draftLimits as [number, number, number, number, number]}
                          seg={detailDraft.seg}
                          onSeg={(i, v) =>
                            setDetailDraft((d) => {
                              const next = [...d.seg] as DetailDraft['seg'];
                              next[i] = v;
                              return { ...d, seg: next };
                            })
                          }
                          disabled={segDisabled}
                          size="md"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">產地（選填）</Label>
                        <select
                          className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                          value={detailDraft.country}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, country: e.target.value }))}
                        >
                          {COUNTRY_OPTIONS.map((c) => (
                            <option key={c.iso || 'none'} value={c.iso}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">料號預覽（唯讀）</Label>
                        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground">
                          {previewDisplay}
                        </div>
                        <p className="text-[10px] text-muted-foreground">格式：{'{廠牌}-'}SEG 組合 {'#{產地}'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">【產品資料】</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="nx02-name" className="text-xs">
                          品名（中文）（必填）
                        </Label>
                        <Input id="nx02-name" value={detailDraft.name} onChange={(e) => setDetailDraft((d) => ({ ...d, name: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="nx02-sec" className="text-xs">
                          副廠料號（選填）
                        </Label>
                        <Input
                          id="nx02-sec"
                          value={detailDraft.secCode}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, secCode: e.target.value }))}
                          placeholder="副廠件對應原廠料號"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <span className="text-xs text-muted-foreground">零件類型</span>
                        <div className="flex flex-wrap gap-3 text-xs">
                          {PART_TYPE_OPTIONS.map((o) => (
                            <label key={o.code} className="flex items-center gap-1.5">
                              <input
                                type="radio"
                                name="pt"
                                checked={detailDraft.partType === o.code}
                                onChange={() => setDetailDraft((d) => ({ ...d, partType: o.code }))}
                              />
                              {o.label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">零件族群（必填）</Label>
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
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="nx02-spec" className="text-xs">
                          規格／備註（選填）
                        </Label>
                        <Input
                          id="nx02-spec"
                          value={detailDraft.spec}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, spec: e.target.value }))}
                          placeholder="例：適用引擎型號、含附件說明"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="nx02-unit" className="text-xs">
                          單位
                        </Label>
                        <select
                          id="nx02-unit"
                          className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                          value={detailDraft.unit}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, unit: e.target.value }))}
                        >
                          <option value="pcs">pcs</option>
                          <option value="組">組</option>
                          <option value="套">套</option>
                        </select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <span className="text-xs text-muted-foreground">是否正廠件</span>
                        <div className="flex gap-4 text-xs">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              checked={detailDraft.brandType === 'oem'}
                              onChange={() => setDetailDraft((d) => ({ ...d, brandType: 'oem' }))}
                            />
                            OEM
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              checked={detailDraft.brandType === 'aftermarket'}
                              onChange={() => setDetailDraft((d) => ({ ...d, brandType: 'aftermarket' }))}
                            />
                            副廠
                          </label>
                        </div>
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
                                onClick={() => setDetailDraft((d) => ({ ...d, vehicles: d.vehicles.filter((x) => x !== v) }))}
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
                                  setDetailDraft((d) => ({ ...d, vehicles: [...d.vehicles, newVehicle.trim()] }));
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
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">【品質政策】</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="nx02-war" className="text-xs">
                          保固月數（0 = 不保固）
                        </Label>
                        <Input
                          id="nx02-war"
                          type="number"
                          min={0}
                          value={detailDraft.warranty}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, warranty: Number(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">退貨政策</Label>
                        <select
                          className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                          value={detailDraft.returnPolicy}
                          onChange={(e) => setDetailDraft((d) => ({ ...d, returnPolicy: e.target.value as ReturnPolicyCode }))}
                        >
                          {RETURN_POLICY_OPTIONS.map((o) => (
                            <option key={o.code} value={o.code}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-4 sm:col-span-2">
                        <span className="text-xs text-muted-foreground">狀態</span>
                        <label className="flex items-center gap-1.5 text-xs">
                          <input type="radio" checked={detailDraft.active} onChange={() => setDetailDraft((d) => ({ ...d, active: true }))} />
                          啟用
                        </label>
                        <label className="flex items-center gap-1.5 text-xs">
                          <input type="radio" checked={!detailDraft.active} onChange={() => setDetailDraft((d) => ({ ...d, active: false }))} />
                          停用
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nx02-rm" className="text-xs">
                      備註（選填）
                    </Label>
                    <Textarea id="nx02-rm" rows={2} value={detailDraft.remark} onChange={(e) => setDetailDraft((d) => ({ ...d, remark: e.target.value }))} />
                  </div>
                </div>
              )}
            </section>

            {panelMode === 'browse' && selected ? (
              <>
                <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
                  <Tabs
                    value={relTab}
                    onValueChange={(v) => {
                      setRelTab(v as RelTab);
                      setAddFor(null);
                    }}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <TabsList className="h-auto min-h-8 w-full flex-wrap justify-start gap-1 p-1">
                        <TabsTrigger value="R" className="text-[11px] sm:text-xs">
                          可替代 (R)
                        </TabsTrigger>
                        <TabsTrigger value="S" className="text-[11px] sm:text-xs">
                          改號紀錄 (S)
                        </TabsTrigger>
                        <TabsTrigger value="C" className="text-[11px] sm:text-xs">
                          改版換周邊 (C)
                        </TabsTrigger>
                        <TabsTrigger value="B" className="text-[11px] sm:text-xs">
                          組合／拆解 (B/F)
                        </TabsTrigger>
                      </TabsList>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => setAddFor((f) => (f === relTab ? null : relTab))}
                      >
                        + 新增{relTab === 'R' ? '可替代' : relTab === 'S' ? '改號' : relTab === 'C' ? '周邊' : '明細'}（關閉再開）
                      </Button>
                    </div>

                    <TabsContent value="R" className="mt-0 space-y-3">
                      <div className="overflow-x-auto rounded-lg border border-border/60">
                        <table className="w-full min-w-[520px] text-left text-xs">
                          <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                            <tr>
                              <th className="px-2 py-2">料號</th>
                              <th className="px-2 py-2">廠牌</th>
                              <th className="px-2 py-2">OEM／副廠</th>
                              <th className="px-2 py-2">本倉庫存</th>
                              <th className="px-2 py-2">備註</th>
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
                                <td className="px-2 py-2 text-muted-foreground">{r.note || '—'}</td>
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
                      {addFor === 'R' ? (
                        <div className="rounded-lg border border-dashed border-border p-3 text-xs space-y-2">
                          <p className="font-medium">+ 新增可替代料號</p>
                          <SegInputRow
                            idPrefix="nx02-add-r"
                            limits={SEARCH_SEG_LIMITS as [number, number, number, number, number]}
                            seg={['', '', '', '', '']}
                            onSeg={() => {}}
                            disabled
                          />
                          <p className="text-[10px] text-muted-foreground">DEMO：SEG 搜尋僅示意。</p>
                          <Label className="text-[11px]">備註（選填）</Label>
                          <Input className="h-8 max-w-md" placeholder="例：尺寸略有差異，需確認" disabled />
                          <Button type="button" size="sm" variant="secondary" onClick={() => setAddFor(null)}>
                            確認新增
                          </Button>
                        </div>
                      ) : null}
                    </TabsContent>

                    <TabsContent value="S" className="mt-0 space-y-3">
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
                                <td className="px-2 py-2">舊→新</td>
                                <td className="px-2 py-2 font-mono">{r.oldDisplay}</td>
                                <td className="px-2 py-2 font-mono">{r.newDisplay}</td>
                                <td className="px-2 py-2">{r.date}</td>
                                <td className="px-2 py-2">{r.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[11px] text-amber-800 dark:text-amber-200">
                        ⚠️ 舊料號自動標記「已停產」，歷史記錄完整保留。查詢舊料號時提示「此料號已改版，目前料號：XXX」。
                      </p>
                      {addFor === 'S' ? (
                        <div className="rounded-lg border border-dashed border-border p-3 text-xs space-y-2">
                          <p className="font-medium">+ 新增改號記錄</p>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2">
                              <input type="radio" name="sv" defaultChecked /> 此料號是：新版（我有舊料號）
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="radio" name="sv" /> 已停產（我有新料號）
                            </label>
                          </div>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setAddFor(null)}>
                            確認建立
                          </Button>
                        </div>
                      ) : null}
                    </TabsContent>

                    <TabsContent value="C" className="mt-0 space-y-3">
                      <div className="overflow-x-auto rounded-lg border border-border/60">
                        <table className="w-full min-w-[480px] text-left text-xs">
                          <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                            <tr>
                              <th className="px-2 py-2">關聯料號</th>
                              <th className="px-2 py-2">品名</th>
                              <th className="px-2 py-2">說明</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.companions.map((r) => (
                              <tr key={r.id} className="border-b border-border/40">
                                <td className="px-2 py-2 font-mono">{r.codeDisplay}</td>
                                <td className="px-2 py-2">{r.name}</td>
                                <td className="px-2 py-2 text-muted-foreground">{r.note}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {addFor === 'C' ? (
                        <div className="rounded-lg border border-dashed border-border p-3 text-xs space-y-2">
                          <p className="font-medium">+ 新增</p>
                          <Input disabled placeholder="搜尋料號（SEG）" className="h-8 max-w-sm" />
                          <Input disabled placeholder="說明" className="h-8 max-w-sm" />
                          <Button type="button" size="sm" variant="secondary" onClick={() => setAddFor(null)}>
                            確認新增
                          </Button>
                        </div>
                      ) : null}
                    </TabsContent>

                    <TabsContent value="B" className="mt-0 space-y-3">
                      <div className="overflow-x-auto rounded-lg border border-border/60">
                        <table className="w-full min-w-[440px] text-left text-xs">
                          <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                            <tr>
                              <th className="px-2 py-2">類型</th>
                              <th className="px-2 py-2">料號</th>
                              <th className="px-2 py-2">品名</th>
                              <th className="px-2 py-2">數量</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.bundleRows.map((r) => (
                              <tr key={r.id} className="border-b border-border/40">
                                <td className="px-2 py-2">{r.kind === 'B' ? '包含' : '拆解'}</td>
                                <td className="px-2 py-2 font-mono">{r.codeDisplay}</td>
                                <td className="px-2 py-2">{r.name}</td>
                                <td className="px-2 py-2 tabular-nums">{r.qty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {selected.partType === 'C' ? (
                        <p className="text-[11px] text-muted-foreground">
                          ⚠️ 此為組合型零件（type=C），銷售時以整組計算，不拆單出售。
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">DEMO：若零件類型為「組合型(C)」將顯示組合包提示。</p>
                      )}
                      {addFor === 'B' ? (
                        <div className="rounded-lg border border-dashed border-border p-3 text-xs space-y-2">
                          <p className="font-medium">+ 新增明細</p>
                          <Input disabled placeholder="搜尋料號" className="h-8 max-w-sm" />
                          <Input disabled placeholder="數量" className="h-8 w-24" />
                          <Button type="button" size="sm" variant="secondary" onClick={() => setAddFor(null)}>
                            確認新增
                          </Button>
                        </div>
                      ) : null}
                    </TabsContent>
                  </Tabs>
                </section>

                <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">定價表</h2>
                    {!pricingEdit ? (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          上次定價：{selected.lastPriceDate}　{selected.lastPriceBy}
                        </span>
                        <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={openPricingEdit}>
                          編輯定價 <span className="ml-1 text-[10px] opacity-80">Shift+Alt+E</span>
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
                        <table className="w-full min-w-[520px] text-left">
                          <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                            <tr>
                              <th className="px-2 py-2">等級</th>
                              <th className="px-2 py-2">設定售價</th>
                              <th className="px-2 py-2">建議區間</th>
                              <th className="px-2 py-2">毛利率</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(['a', 'b', 'c', 'd'] as const).map((k) => {
                              const price = priceDraft[k];
                              const m = marginOnCost(price, cost);
                              const band = k === 'a' ? suggestedPriceBandA(cost) : null;
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
                                  <td className="px-2 py-2 text-muted-foreground">
                                    {band ? `$${band.lo.toFixed(2)}~$${band.hi.toFixed(2)}` : '—'}
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
                      <p className="text-[11px] text-muted-foreground">儲存後通知業務組長：售價已更新（DEMO）。</p>
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">安全量與最高量</h2>
                    {!safetyEdit ? (
                      <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={openSafetyEdit}>
                        編輯
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
                          系統計算參考：平均日出貨量 5 個 × 廠商交貨天數 7 天 + 緩衝 3 天 = 建議安全量 {suggestSafe}；急迫性係數 × 3 = 建議最高量 {suggestMax}。
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
                                    onChange={(e) => setSafetyDraft((d) => ({ ...d, [key]: Number(e.target.value) || 0 }))}
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
                              <td className="px-2 py-2 tabular-nums">{sumSafetyDraft}</td>
                              <td className="px-2 py-2 tabular-nums">{sumMaxDraft}</td>
                              <td className="px-2 py-2" colSpan={2} />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        建議最低安全量（系統計算）：{suggestSafe}　← 目前合計 {sumSafetyDraft}{' '}
                        {sumSafetyDraft >= suggestSafe ? '✅' : '⚠️'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        建議最高量（系統計算）：{suggestMax}　← 目前合計 {sumMaxDraft}
                        {sumMaxDraft <= suggestMax * 1.1 ? ' 可接受' : ' 稍高'}
                      </p>
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
