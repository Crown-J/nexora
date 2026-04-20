/**
 * @FUNCTION_CODE NX02-VEND-UI-001-F01
 * 採購供應商管理：左欄清單 + 右欄詳細／採購記錄／評鑑／談判（DEMO mock）
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDashboardHomePlanOptional } from '@/features/sys-dashboard/context/DashboardHomePlanContext';
import { cx } from '@/shared/lib/cx';
import { COUNTRY_OPTIONS } from '@/features/purchase/product/mock-data';
import type { PlanCode } from '@/mocks/dashboard';
import type { MockVendor, MockVendorEval, MockVendorNegotiation, VendorGrade, VendorType } from './mock-data';
import {
  cloneVendors,
  INCOTERM_OPTIONS,
  PAYMENT_DOMESTIC_OPTIONS,
  PAYMENT_IMPORT_OPTIONS,
  paymentDomesticLabel,
  vendorTypeLabel,
} from './mock-data';

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

type PanelMode = 'browse' | 'create' | 'edit';
type StatusFilter = 'all' | 'active' | 'inactive';
type GradeFilter = 'all' | VendorGrade;

type VendorDraft = {
  code: string;
  name: string;
  nameEn: string;
  type: VendorType;
  country: string;
  grade: VendorGrade;
  paymentDomestic: string;
  paymentImport: string;
  incoterm: string;
  taxId: string;
  address: string;
  contact: string;
  phone: string;
  mobile: string;
  email: string;
  minMoq: string;
  productLine: string;
  note: string;
  isActive: boolean;
};

function emptyDraft(): VendorDraft {
  return {
    code: '',
    name: '',
    nameEn: '',
    type: 'S',
    country: 'TWN',
    grade: 'B',
    paymentDomestic: 'NET30',
    paymentImport: 'TT',
    incoterm: 'FOB',
    taxId: '',
    address: '',
    contact: '',
    phone: '',
    mobile: '',
    email: '',
    minMoq: '',
    productLine: '',
    note: '',
    isActive: true,
  };
}

function vendorToDraft(v: MockVendor): VendorDraft {
  return {
    code: v.code,
    name: v.name,
    nameEn: v.nameEn,
    type: v.type,
    country: v.country,
    grade: v.grade,
    paymentDomestic: v.paymentDomestic,
    paymentImport: v.paymentImport ?? 'TT',
    incoterm: v.incoterm ?? 'FOB',
    taxId: v.taxId,
    address: v.address,
    contact: v.contact,
    phone: v.phone,
    mobile: v.mobile,
    email: v.email,
    minMoq: v.minMoq == null ? '' : String(v.minMoq),
    productLine: v.productLine,
    note: v.note,
    isActive: v.isActive,
  };
}

function draftToVendorPatch(
  d: VendorDraft,
  recentOrders: MockVendor['recentOrders'],
  evaluations: MockVendorEval[],
  negotiations: MockVendorNegotiation[],
): Omit<MockVendor, 'id'> {
  const minMoq = d.minMoq.trim() === '' ? null : Number(d.minMoq) || 0;
  const foreign = d.country !== 'TWN' && d.country !== '';
  return {
    code: d.code,
    name: d.name,
    nameEn: d.nameEn,
    type: d.type,
    country: d.country,
    grade: d.grade,
    paymentDomestic: d.paymentDomestic,
    paymentImport: foreign ? d.paymentImport : undefined,
    incoterm: foreign ? d.incoterm : undefined,
    taxId: d.taxId,
    address: d.address,
    contact: d.contact,
    phone: d.phone,
    mobile: d.mobile,
    email: d.email,
    minMoq,
    productLine: d.productLine,
    note: d.note,
    isActive: d.isActive,
    recentOrders,
    evaluations,
    negotiations,
  };
}

function nextVendorCode(list: MockVendor[]): string {
  let max = 0;
  for (const v of list) {
    const m = /^S(\d+)$/i.exec(v.code);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `S${String(max + 1).padStart(3, '0')}`;
}

function isProPlan(plan: PlanCode | undefined): boolean {
  return plan === 'PRO';
}

function GradeCell({ grade, show }: { grade: VendorGrade; show: boolean }) {
  if (!show) return <span className="text-muted-foreground">—</span>;
  if (grade === 'A') return <span className="text-amber-700 dark:text-amber-300">A ⭐</span>;
  if (grade === 'B') return <span>{grade}</span>;
  if (grade === 'C') return <span className="text-amber-600">C ⚠️</span>;
  return <span className="text-red-600">D 🚫</span>;
}

export function PurchaseVendorManagementView() {
  const planCtx = useDashboardHomePlanOptional();
  const plan: PlanCode = planCtx?.planCode ?? 'PRO';
  const isPro = isProPlan(plan);

  const [vendors, setVendors] = useState<MockVendor[]>(() => cloneVendors());
  const [q, setQ] = useState('');
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [listFocusIndex, setListFocusIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>('v1');
  const [panelMode, setPanelMode] = useState<PanelMode>('browse');
  const [draft, setDraft] = useState<VendorDraft>(() => vendorToDraft(vendors[0]!));
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalPrice, setEvalPrice] = useState(5);
  const [evalService, setEvalService] = useState(5);
  const [evalGradePick, setEvalGradePick] = useState<VendorGrade>('A');
  const [evalNote, setEvalNote] = useState('');
  const [negOpen, setNegOpen] = useState(false);
  const [negDate, setNegDate] = useState('2026-04-15');
  const [negContact, setNegContact] = useState('');
  const [negCond, setNegCond] = useState('');
  const [negAssess, setNegAssess] = useState('');
  const [negResult, setNegResult] = useState<'拒絕' | '接受' | '繼續談判'>('拒絕');
  const [negUpdateMaster, setNegUpdateMaster] = useState(false);
  const [negRemark, setNegRemark] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return vendors.filter((v) => {
      if (statusFilter === 'active' && !v.isActive) return false;
      if (statusFilter === 'inactive' && v.isActive) return false;
      if (isPro && gradeFilter !== 'all' && v.grade !== gradeFilter) return false;
      if (!t) return true;
      const hay = `${v.code} ${v.name} ${v.nameEn} ${v.contact}`.toLowerCase();
      return hay.includes(t);
    });
  }, [vendors, q, statusFilter, gradeFilter, isPro]);

  useEffect(() => {
    setListFocusIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((v) => v.id === selectedId)) {
      const first = filtered[0]!;
      setSelectedId(first.id);
      setDraft(vendorToDraft(first));
      setPanelMode('browse');
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => (selectedId ? vendors.find((v) => v.id === selectedId) ?? null : null),
    [vendors, selectedId],
  );

  useEffect(() => {
    if (panelMode === 'browse' && selected) {
      setDraft(vendorToDraft(selected));
    }
  }, [selected, panelMode]);

  useEffect(() => {
    if (selected || panelMode === 'create') {
      rightRef.current?.scrollTo({ top: 0 });
    }
  }, [selectedId, panelMode]);

  const selectByIndex = useCallback(
    (idx: number) => {
      const v = filtered[idx];
      if (!v) return;
      setSelectedId(v.id);
      setPanelMode('browse');
      setDraft(vendorToDraft(v));
    },
    [filtered],
  );

  const startCreate = useCallback(() => {
    setSelectedId(null);
    setPanelMode('create');
    const d = emptyDraft();
    d.code = nextVendorCode(vendors);
    setDraft(d);
    setEvalOpen(false);
    setNegOpen(false);
  }, [vendors]);

  const startEdit = useCallback(() => {
    if (!selected) return;
    setPanelMode('edit');
    setDraft(vendorToDraft(selected));
  }, [selected]);

  const cancelPanel = useCallback(() => {
    if (panelMode === 'create') {
      const first = filtered[0];
      if (first) {
        setSelectedId(first.id);
        setPanelMode('browse');
        setDraft(vendorToDraft(first));
      } else {
        setSelectedId(null);
        setPanelMode('browse');
      }
    } else if (panelMode === 'edit' && selected) {
      setPanelMode('browse');
      setDraft(vendorToDraft(selected));
    }
  }, [panelMode, selected, filtered]);

  const saveEval = useCallback(() => {
    if (!selectedId || !selected) return;
    const sc = Math.min(100, Math.round(40 + 30 + evalPrice * 4 + evalService * 2));
    const row: MockVendorEval = {
      quarter: '2026 Q2',
      onTime: 98,
      defect: 0.3,
      price: evalPrice,
      service: evalService,
      score: sc,
      grade: evalGradePick,
      by: '王採購組長',
    };
    setVendors((prev) =>
      prev.map((v) => (v.id === selectedId ? { ...v, evaluations: [row, ...v.evaluations], grade: evalGradePick } : v)),
    );
    setEvalOpen(false);
  }, [selectedId, selected, evalPrice, evalService, evalGradePick]);

  const saveNeg = useCallback(() => {
    if (!selectedId) return;
    const row: MockVendorNegotiation = {
      date: negDate,
      contact: negContact,
      condition: negCond,
      result: negResult,
    };
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id !== selectedId) return v;
        let paymentDomestic = v.paymentDomestic;
        if (negResult === '接受' && negUpdateMaster) {
          if (/PREPAY/i.test(negCond)) paymentDomestic = 'PREPAY';
          else {
            const m = negCond.match(/NET\d+/i);
            if (m) paymentDomestic = m[0]!.toUpperCase();
          }
        }
        return { ...v, negotiations: [row, ...v.negotiations], paymentDomestic };
      }),
    );
    setNegOpen(false);
    setNegContact('');
    setNegCond('');
    setNegAssess('');
    setNegRemark('');
    setNegUpdateMaster(false);
  }, [selectedId, negDate, negContact, negCond, negResult, negUpdateMaster]);

  const saveVendor = useCallback(() => {
    if (!draft.name.trim()) {
      window.alert('請填寫廠商名稱');
      return;
    }
    if (panelMode === 'create') {
      const id = `v${Date.now()}`;
      const row: MockVendor = {
        id,
        ...draftToVendorPatch(draft, [], [], []),
      };
      setVendors((prev) => [...prev, row]);
      setSelectedId(id);
      setPanelMode('browse');
      return;
    }
    if (panelMode === 'edit' && selectedId && selected) {
      setVendors((prev) =>
        prev.map((v) =>
          v.id === selectedId
            ? {
                ...v,
                ...draftToVendorPatch(draft, v.recentOrders, v.evaluations, v.negotiations),
              }
            : v,
        ),
      );
      setPanelMode('browse');
    }
  }, [panelMode, draft, selectedId, selected]);

  const trySave = useCallback(() => {
    if (evalOpen || negOpen) return;
    if (panelMode === 'create' || panelMode === 'edit') {
      saveVendor();
    }
  }, [evalOpen, negOpen, panelMode, saveVendor]);

  const tryEdit = useCallback(() => {
    if (evalOpen || negOpen) return;
    if (panelMode === 'browse' && selected) startEdit();
  }, [evalOpen, negOpen, panelMode, selected, startEdit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (isEditableTarget(e.target)) {
        if (e.altKey) e.preventDefault();
        return;
      }
      if (e.key === 'Escape') {
        if (evalOpen) {
          setEvalOpen(false);
          return;
        }
        if (negOpen) {
          setNegOpen(false);
          return;
        }
        if (panelMode === 'create' || panelMode === 'edit') {
          cancelPanel();
        }
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!evalOpen && !negOpen) startCreate();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        tryEdit();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (evalOpen) {
          saveEval();
          return;
        }
        if (negOpen) {
          saveNeg();
          return;
        }
        trySave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [evalOpen, negOpen, panelMode, cancelPanel, startCreate, tryEdit, trySave, saveEval, saveNeg]);

  const foreign = draft.country !== 'TWN' && draft.country !== '';
  const orderSum = selected?.recentOrders.reduce((s, o) => s + o.amount, 0) ?? 0;
  const orderCount = selected?.recentOrders.length ?? 0;

  const proLockCard = (title: string, body: string) => (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-6 text-center opacity-70 grayscale">
      <p className="text-xs font-medium text-muted-foreground">🔒 PRO</p>
      <h3 className="mt-2 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">{body}</p>
    </div>
  );

  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-4">
      <aside className="flex w-full shrink-0 flex-col border-border/60 lg:w-[320px] lg:border-r lg:pr-4">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">供應商管理</h1>
        <p className="text-[11px] text-muted-foreground">NX02 採購｜廠商主檔、付款條件（DEMO）</p>

        <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-muted/10 p-3">
          <Label className="text-xs">搜尋</Label>
          <Input
            className="h-9 text-sm"
            placeholder="廠商名稱 / 代碼 / 聯絡人"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {isPro ? (
            <div className="space-y-1.5 pt-2">
              <p className="text-[11px] font-medium text-muted-foreground">等級篩選（PRO）</p>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'A', 'B', 'C', 'D'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGradeFilter(g)}
                    className={cx(
                      'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
                      gradeFilter === g
                        ? 'border-[#E8A020]/80 bg-[#E8A020]/20 text-foreground'
                        : 'border-border/80 bg-background/60 text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    {g === 'all' ? '全部' : `${g}級`}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-medium text-muted-foreground">狀態篩選</p>
            <div className="flex flex-wrap gap-1.5">
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
                  onClick={() => setStatusFilter(k)}
                  className={cx(
                    'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition',
                    statusFilter === k
                      ? 'border-[#E8A020]/80 bg-[#E8A020]/20 text-foreground'
                      : 'border-border/80 bg-background/60 text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-border/70 bg-background/40">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            <span>廠商列表</span>
            <span className="tabular-nums">共 {filtered.length} 家</span>
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
            <div className="grid grid-cols-[2.5rem_1fr_2.5rem] gap-x-1 border-b border-border/50 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[3rem_1fr_2.5rem_4rem_3rem]">
              <span>代碼</span>
              <span className="min-w-0">廠商名稱</span>
              <span>國別</span>
              {isPro ? <span>等級</span> : null}
              <span className="hidden sm:block">狀態</span>
            </div>
            {filtered.map((v, idx) => {
              const active = v.id === selectedId;
              const kb = idx === listFocusIndex;
              const dim = v.grade === 'D' && isPro;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setListFocusIndex(idx);
                    selectByIndex(idx);
                  }}
                  className={cx(
                    'grid w-full grid-cols-[2.5rem_1fr_2.5rem] items-center gap-x-1 border-b border-border/40 px-2 py-2 text-left text-xs transition sm:grid-cols-[3rem_1fr_2.5rem_4rem_3rem]',
                    (active || kb) && 'bg-primary/5',
                    active && 'border-l-4 border-l-[#E8A020] pl-[calc(0.5rem-4px)]',
                    !active && kb && 'ring-1 ring-inset ring-primary/25',
                    dim && 'opacity-60',
                  )}
                >
                  <span className="font-mono text-primary">{v.code}</span>
                  <span className="min-w-0 truncate text-foreground">{v.name}</span>
                  <span className="text-muted-foreground">{v.country}</span>
                  {isPro ? (
                    <span className="text-[11px]">
                      <GradeCell grade={v.grade} show />
                    </span>
                  ) : null}
                  <span className="hidden text-[11px] sm:block">{v.isActive ? '啟用' : '停用'}</span>
                </button>
              );
            })}
            {filtered.length === 0 ? <p className="p-4 text-center text-sm text-muted-foreground">無符合廠商</p> : null}
          </div>
          <div className="border-t border-border/60 p-2">
            <Button type="button" variant="outline" className="w-full text-xs" onClick={startCreate}>
              + 新增廠商 <span className="ml-1 text-[10px] text-muted-foreground">Alt+A</span>
            </Button>
          </div>
        </div>
      </aside>

      <div ref={rightRef} className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto pb-8">
        {!selected && panelMode !== 'create' ? (
          <p className="text-sm text-muted-foreground">請由左側選擇廠商，或新增廠商。</p>
        ) : (
          <>
            <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-sm font-semibold">廠商詳細資料</h2>
                <div className="flex flex-wrap gap-2">
                  {panelMode === 'browse' && selected ? (
                    <>
                      <Button type="button" size="sm" variant="secondary" onClick={startEdit}>
                        編輯 <span className="ml-1 text-[10px] text-muted-foreground">Alt+E</span>
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => window.alert('DEMO：停用廠商')}>
                        停用廠商
                      </Button>
                    </>
                  ) : null}
                  {panelMode === 'create' ? (
                    <>
                      <Button type="button" size="sm" onClick={saveVendor}>
                        儲存 <span className="ml-1 text-[10px] opacity-80">Alt+S</span>
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancelPanel}>
                        取消 Esc
                      </Button>
                    </>
                  ) : null}
                  {panelMode === 'edit' ? (
                    <>
                      <Button type="button" size="sm" onClick={saveVendor}>
                        儲存 <span className="ml-1 text-[10px] opacity-80">Alt+S</span>
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancelPanel}>
                        取消 Esc
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => window.alert('DEMO：停用廠商')}>
                        停用廠商
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {panelMode === 'browse' && selected ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">{selected.name}</span>
                    <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs">{selected.code}</span>
                    {isPro ? (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-900 dark:text-amber-200">
                        {selected.grade} 級（PRO）
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {vendorTypeLabel(selected.type)}　|　{COUNTRY_OPTIONS.find((c) => c.iso === selected.country)?.label ?? selected.country}　|　
                    {paymentDomesticLabel(selected.paymentDomestic)}
                    {selected.country !== 'TWN' && selected.incoterm ? `　|　${selected.incoterm}` : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    聯絡：{selected.contact || '—'}　|　{selected.email || '—'}　|　{selected.phone || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">主要產品線：{selected.productLine || '—'}</p>
                  <p className="text-xs text-muted-foreground">備註：{selected.note || '—'}</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-200">
                    ⚠️ 停用後該廠商無法建立新詢價單與採購單，歷史記錄保留。
                  </p>
                </div>
              ) : (
                <div className="space-y-5 text-sm">
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">【基本資料】</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">廠商代碼</Label>
                        <Input className="bg-muted/40 font-mono" value={draft.code} readOnly={panelMode !== 'create'} onChange={(e) => panelMode === 'create' && setDraft((d) => ({ ...d, code: e.target.value }))} />
                        <p className="text-[10px] text-muted-foreground">系統自動產生，唯讀</p>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <span className="text-xs text-muted-foreground">廠商類型（必填）</span>
                        <div className="flex flex-col gap-1.5 text-xs">
                          {(['S', 'T', 'V'] as const).map((t) => (
                            <label key={t} className="flex items-center gap-2">
                              <input type="radio" checked={draft.type === t} onChange={() => setDraft((d) => ({ ...d, type: t }))} />
                              {vendorTypeLabel(t)}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">廠商名稱（必填）</Label>
                        <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">英文名稱（選填）</Label>
                        <Input value={draft.nameEn} onChange={(e) => setDraft((d) => ({ ...d, nameEn: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">統一編號／VAT（選填）</Label>
                        <Input value={draft.taxId} onChange={(e) => setDraft((d) => ({ ...d, taxId: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">國別</Label>
                        <select
                          className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                          value={draft.country}
                          onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                        >
                          {COUNTRY_OPTIONS.filter((c) => c.iso).map((c) => (
                            <option key={c.iso} value={c.iso}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">地址（選填）</Label>
                        <Input value={draft.address} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">【聯絡資料】</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">主要聯絡人</Label>
                        <Input value={draft.contact} onChange={(e) => setDraft((d) => ({ ...d, contact: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">電話</Label>
                        <Input value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">手機</Label>
                        <Input value={draft.mobile} onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email</Label>
                        <Input value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">【採購條件】</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">付款條件（國內）</Label>
                        <select
                          className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                          value={draft.paymentDomestic}
                          onChange={(e) => setDraft((d) => ({ ...d, paymentDomestic: e.target.value }))}
                        >
                          {PAYMENT_DOMESTIC_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {foreign ? (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">付款條件（進口）</Label>
                            <select
                              className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                              value={draft.paymentImport}
                              onChange={(e) => setDraft((d) => ({ ...d, paymentImport: e.target.value }))}
                            >
                              {PAYMENT_IMPORT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">貿易條件</Label>
                            <select
                              className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                              value={draft.incoterm}
                              onChange={(e) => setDraft((d) => ({ ...d, incoterm: e.target.value }))}
                            >
                              {INCOTERM_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : null}
                      <div className="space-y-1.5">
                        <Label className="text-xs">最低訂單量（選填）</Label>
                        <Input inputMode="numeric" value={draft.minMoq} onChange={(e) => setDraft((d) => ({ ...d, minMoq: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">主要產品線（選填）</Label>
                        <Input value={draft.productLine} onChange={(e) => setDraft((d) => ({ ...d, productLine: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  {isPro ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs">廠商等級（PRO）</Label>
                      <select
                        className="nx-native-select h-9 max-w-xs rounded-md border border-input bg-transparent px-2 text-sm"
                        value={draft.grade}
                        onChange={(e) => setDraft((d) => ({ ...d, grade: e.target.value as VendorGrade }))}
                      >
                        {(['A', 'B', 'C', 'D'] as const).map((g) => (
                          <option key={g} value={g}>
                            {g} 級
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label className="text-xs">備註</Label>
                    <Textarea rows={2} value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} />
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">狀態</span>
                    <label className="flex items-center gap-1.5">
                      <input type="radio" checked={draft.isActive} onChange={() => setDraft((d) => ({ ...d, isActive: true }))} />
                      啟用
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="radio" checked={!draft.isActive} onChange={() => setDraft((d) => ({ ...d, isActive: false }))} />
                      停用
                    </label>
                  </div>
                </div>
              )}
            </section>

            {panelMode === 'browse' && selected ? (
              <>
                <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">採購記錄</h3>
                    <span className="text-[11px] text-muted-foreground">最近 6 個月</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border/60">
                    <table className="w-full min-w-[400px] text-left text-xs">
                      <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2">單號</th>
                          <th className="px-2 py-2">日期</th>
                          <th className="px-2 py-2">金額</th>
                          <th className="px-2 py-2">狀態</th>
                        </tr>
                      </thead>
                        <tbody>
                          {selected.recentOrders.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">
                                無近期採購記錄
                              </td>
                            </tr>
                          ) : (
                            selected.recentOrders.map((o) => (
                              <tr key={o.no} className="border-b border-border/40">
                                <td className="px-2 py-2 font-mono">{o.no}</td>
                                <td className="px-2 py-2">{o.date}</td>
                                <td className="px-2 py-2 tabular-nums">NT${o.amount.toLocaleString('zh-TW')}</td>
                                <td className="px-2 py-2">
                                  {o.status} ✅
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    本年度合計：NT${orderSum.toLocaleString('zh-TW')}　|　共 {orderCount} 筆
                  </p>
                  <Button type="button" variant="link" className="h-auto p-0 text-xs" asChild>
                    <Link href={`/dashboard/nx02/domestic?vendor=${encodeURIComponent(selected.code)}`}>查看全部採購記錄</Link>
                  </Button>
                </section>

                {isPro ? (
                  <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">評鑑歷史</h3>
                      <Button type="button" size="sm" variant="secondary" className="text-xs" onClick={() => setEvalOpen(true)}>
                        執行本季評鑑
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-xs">
                      <p className="font-medium text-foreground">本季績效快覽（2026 Q2）</p>
                      <p className="mt-1 text-muted-foreground">準時交貨率：98% ✅（目標 &gt;95%）</p>
                      <p className="text-muted-foreground">進貨瑕疵率：0.3% ✅（目標 &lt;1%）</p>
                      <p className="text-muted-foreground">本季採購金額：NT$450,000</p>
                      <p className="mt-1 text-foreground">綜合評分：94 分 → A 級</p>
                    </div>
                    <div className="mt-3 overflow-x-auto rounded-lg border border-border/60">
                      <table className="w-full min-w-[560px] text-left text-xs">
                        <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                          <tr>
                            <th className="px-2 py-2">季度</th>
                            <th className="px-2 py-2">準時率</th>
                            <th className="px-2 py-2">瑕疵率</th>
                            <th className="px-2 py-2">價格</th>
                            <th className="px-2 py-2">服務</th>
                            <th className="px-2 py-2">綜合分</th>
                            <th className="px-2 py-2">等級</th>
                            <th className="px-2 py-2">評鑑人</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.evaluations.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">
                                尚無評鑑記錄
                              </td>
                            </tr>
                          ) : (
                            selected.evaluations.map((e) => (
                              <tr key={e.quarter} className="border-b border-border/40">
                                <td className="px-2 py-2">{e.quarter}</td>
                                <td className="px-2 py-2 tabular-nums">{e.onTime}%</td>
                                <td className="px-2 py-2 tabular-nums">{e.defect}%</td>
                                <td className="px-2 py-2">{e.price}/5</td>
                                <td className="px-2 py-2">{e.service}/5</td>
                                <td className="px-2 py-2 tabular-nums">{e.score} 分</td>
                                <td className="px-2 py-2">
                                  {e.grade}
                                  {e.gradeNote ? <span className="ml-1 text-muted-foreground">{e.gradeNote}</span> : null}
                                </td>
                                <td className="px-2 py-2">{e.by}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : (
                  proLockCard('評鑑歷史', '升級 PRO 版解鎖廠商評鑑功能')
                )}

                {isPro ? (
                  <section className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">談判記錄</h3>
                      <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setNegOpen(true)}>
                        + 新增談判記錄
                      </Button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border/60">
                      <table className="w-full min-w-[480px] text-left text-xs">
                        <thead className="border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
                          <tr>
                            <th className="px-2 py-2">日期</th>
                            <th className="px-2 py-2">談判對象</th>
                            <th className="px-2 py-2">提出條件</th>
                            <th className="px-2 py-2">結果</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.negotiations.map((n, i) => (
                            <tr key={`${n.date}-${i}`} className="border-b border-border/40">
                              <td className="px-2 py-2">{n.date}</td>
                              <td className="px-2 py-2">{n.contact}</td>
                              <td className="px-2 py-2">{n.condition}</td>
                              <td className="px-2 py-2">
                                {n.result}
                                {n.result === '接受' ? ' ✅' : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : (
                  proLockCard('談判記錄', '升級 PRO 版解鎖廠商談判記錄功能')
                )}
              </>
            ) : null}
          </>
        )}
      </div>

      {evalOpen && selected ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="廠商評鑑"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-sm font-semibold">
              2026 Q2 廠商評鑑　{selected.name}
            </h3>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <p>系統自動帶入（2026-04-01 ~ 今日）：</p>
              <p>準時交貨率：98%（= 40 分）</p>
              <p>進貨瑕疵率：0.3%（= 30 分）</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>價格競爭力（滿 5 分）</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={evalPrice}
                  onChange={(e) => setEvalPrice(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label>服務配合度（滿 5 分）</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={evalService}
                  onChange={(e) => setEvalService(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-foreground">
              綜合評分：{Math.round(40 + 30 + evalPrice * 4 + evalService * 2)} 分（DEMO 公式）
            </p>
            <div className="mt-3 space-y-1">
              <Label className="text-xs">採購組長確認等級</Label>
              <select
                className="nx-native-select h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={evalGradePick}
                onChange={(e) => setEvalGradePick(e.target.value as VendorGrade)}
              >
                {(['A', 'B', 'C', 'D'] as const).map((g) => (
                  <option key={g} value={g}>
                    {g} 級
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 space-y-1">
              <Label className="text-xs">備註</Label>
              <Textarea rows={2} value={evalNote} onChange={(e) => setEvalNote(e.target.value)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={saveEval}>
                確認評鑑結果 Alt+S
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEvalOpen(false)}>
                取消
              </Button>
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              等級異動：升 A 通知組長；降 C 標記觀察；降 D 停用需主管確認（DEMO 未實作通知）。
            </p>
          </div>
        </div>
      ) : null}

      {negOpen && selected ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-sm font-semibold">新增談判記錄</h3>
            <div className="mt-3 grid gap-3">
              <div className="space-y-1">
                <Label className="text-xs">談判日期</Label>
                <Input type="date" value={negDate} onChange={(e) => setNegDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">談判對象</Label>
                <Input value={negContact} onChange={(e) => setNegContact(e.target.value)} placeholder="Hans Schmidt（業務代表）" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">廠商提出條件</Label>
                <Textarea rows={2} value={negCond} onChange={(e) => setNegCond(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">我方評估</Label>
                <Textarea rows={2} value={negAssess} onChange={(e) => setNegAssess(e.target.value)} />
              </div>
              <div className="space-y-1 text-xs">
                <span className="text-muted-foreground">結果</span>
                <div className="flex flex-col gap-1">
                  {(['拒絕', '接受', '繼續談判'] as const).map((r) => (
                    <label key={r} className="flex items-center gap-2">
                      <input type="radio" name="negres" checked={negResult === r} onChange={() => setNegResult(r)} />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
              {negResult === '接受' ? (
                <div className="space-y-1 text-xs">
                  <span className="text-muted-foreground">接受後是否更新廠商主檔付款條件？</span>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={negUpdateMaster} onChange={(e) => setNegUpdateMaster(e.target.checked)} />
                    是，立即更新（否則僅記錄）
                  </label>
                </div>
              ) : null}
              <div className="space-y-1">
                <Label className="text-xs">備註</Label>
                <Textarea rows={2} value={negRemark} onChange={(e) => setNegRemark(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" size="sm" onClick={saveNeg}>
                儲存談判記錄 Alt+S
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setNegOpen(false)}>
                取消
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
