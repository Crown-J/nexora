'use client';

import { Fragment, useState } from 'react';
import {
  ClipboardList,
  Search,
  FileText,
  ShieldCheck,
  PackageCheck,
  PackageX,
  Banknote,
  CheckCircle2,
  Check,
  ChevronRight,
  Plus,
  X,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
// T1-fix-c 進貨對齊批次 2026-06-07：移除 showPlus 版本守、審核節點對所有版本顯示。
// 註：KPI BAR（isPro）屬 NX10 遊戲化付費差異、不在進貨範圍、保留。
import { cn } from '@design/utils/cn';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';

// ─── Types ───────────────────────────────────────────────────────────────────

type StepId = 'demand' | 'rfq' | 'po' | 'approve' | 'rr' | 'return' | 'posting' | 'done';

type FlowNodeDef = {
  id: StepId;
  label: string;
  icon: LucideIcon;
  count: number;
  isDone?: boolean;
  /** 支線節點所屬主線節點 ID */
  branchFrom?: StepId;
};

// ─── Node Definitions ────────────────────────────────────────────────────────

const MAIN_NODES: FlowNodeDef[] = [
  { id: 'demand',  label: '需求',   icon: ClipboardList, count: 3 },
  { id: 'rfq',     label: '詢價',   icon: Search,        count: 2 },
  { id: 'po',      label: '採購單', icon: FileText,      count: 1 },
  { id: 'approve', label: '審核',   icon: ShieldCheck,   count: 1 },
  { id: 'rr',      label: '驗收',   icon: PackageCheck,  count: 2 },
  { id: 'posting', label: '入帳',   icon: Banknote,      count: 1 },
  { id: 'done',    label: '完成',   icon: CheckCircle2,  count: 9, isDone: true },
];

/** 退貨掛在驗收節點下方 */
const BRANCH_NODES: FlowNodeDef[] = [
  { id: 'return', label: '退貨', icon: PackageX, count: 0, branchFrom: 'rr' },
];

// ─── KPI BAR (PRO only) ──────────────────────────────────────────────────────

const KPI_ITEMS = [
  { key: 'speed',    label: '需求處理速度', value: '2.3 小時', target: '< 4 小時', pct: 43, state: 'good'   as const },
  { key: 'reply',    label: '詢價回覆率',   value: '82%',      target: '90%',       pct: 82, state: 'warn'   as const },
  { key: 'abnormal', label: '驗收異常率',   value: '8%',       target: '< 5%',      pct: 62, state: 'danger' as const },
];

function KpiBar() {
  return (
    <div className="rounded-2xl border border-primary/20 bg-card/40 px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">本月採購 KPI</span>
          <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">PRO</span>
        </div>
        <span className="text-[10px] text-muted-foreground">還有 18 天結算</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {KPI_ITEMS.map((item) => (
          <div key={item.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className={cn(
                'text-xs font-semibold tabular-nums',
                item.state === 'good' ? 'text-emerald-400' :
                item.state === 'warn' ? 'text-amber-400' : 'text-destructive',
              )}>
                {item.value}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
              <div
                className={cn('h-full rounded-full transition-all duration-500',
                  item.state === 'good' ? 'bg-emerald-500' :
                  item.state === 'warn' ? 'bg-amber-400' : 'bg-destructive',
                )}
                style={{ width: `${item.pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">目標 {item.target}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Two-tier Flow Chart ──────────────────────────────────────────────────────

type FlowChartProps = {
  mainNodes: FlowNodeDef[];
  branchNodes: FlowNodeDef[];
  activeId: StepId;
  onSelect: (id: StepId) => void;
};

function FlowNodeBtn({
  node, isActive, isPast, isBranch, onClick,
}: {
  node: FlowNodeDef; isActive: boolean; isPast: boolean; isBranch?: boolean; onClick: () => void;
}) {
  const Icon = node.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors min-w-[60px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        isActive && !isBranch && 'bg-primary/10',
        isActive &&  isBranch && 'bg-amber-500/10',
        !isActive && 'hover:bg-muted/40',
      )}
    >
      <span className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
        isBranch ? 'border-2 border-dashed' : 'border-2',
        isPast && !isBranch && 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300',
        isActive && !isBranch && 'border-primary/70 bg-primary/20 text-primary shadow-[0_0_14px_rgba(244,176,52,0.3)]',
        isActive &&  isBranch && 'border-amber-500/60 bg-amber-500/15 text-amber-400',
        !isActive && !isPast && !isBranch && 'border-border/70 bg-secondary/40 text-muted-foreground',
        !isActive && !isPast &&  isBranch && 'border-border/50 bg-secondary/20 text-muted-foreground/50',
      )}>
        {isPast && !isBranch
          ? <Check className="h-4 w-4" aria-hidden />
          : <Icon className="h-4 w-4" aria-hidden />
        }
      </span>
      <span className={cn(
        'text-[11px] font-medium sm:text-xs',
        isActive && !isBranch && 'text-foreground',
        isActive &&  isBranch && 'text-amber-300',
        !isActive && !isBranch && 'text-muted-foreground',
        !isActive &&  isBranch && 'text-muted-foreground/50',
      )}>
        {node.label}
      </span>
      <span className={cn(
        'text-[10px] tabular-nums',
        node.isDone ? 'text-amber-400/80' :
        node.count > 0 && !isBranch ? 'text-primary' :
        node.count > 0 &&  isBranch ? 'text-amber-400/60' :
        'text-muted-foreground/40',
      )}>
        {node.count} 筆
      </span>
    </button>
  );
}

function FlowChart({ mainNodes, branchNodes, activeId, onSelect }: FlowChartProps) {
  const mainActiveIdx = mainNodes.findIndex((n) => n.id === activeId);

  return (
    <section aria-label="採購流程進度" className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">流程進度</p>
      <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-block min-w-full sm:w-full">

          {/* 主線（上層） */}
          <div className="flex items-center">
            {mainNodes.map((node, i) => {
              const isActive = node.id === activeId;
              const isPast   = i < mainActiveIdx;
              const hasBranch = branchNodes.some((b) => b.branchFrom === node.id);

              return (
                <Fragment key={node.id}>
                  <div className="flex flex-col items-center">
                    <FlowNodeBtn node={node} isActive={isActive} isPast={isPast} onClick={() => onSelect(node.id)} />
                    {/* 支線落下連接線 */}
                    {hasBranch
                      ? <div className="h-6 w-px border-l-2 border-dashed border-primary/35" aria-hidden />
                      : <div className="h-6" aria-hidden />
                    }
                  </div>
                  {i < mainNodes.length - 1 ? (
                    <div
                      className={cn(
                        'mb-[60px] h-0.5 flex-1 min-w-[6px] rounded-full',
                        i < mainActiveIdx ? 'bg-primary/55' : 'bg-border/50',
                      )}
                      aria-hidden
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </div>

          {/* 支線（下層） */}
          {branchNodes.length > 0 ? (
            <div className="flex items-start">
              {mainNodes.map((mainNode, i) => {
                const branch = branchNodes.find((b) => b.branchFrom === mainNode.id);
                return (
                  <Fragment key={mainNode.id}>
                    <div className="flex min-w-[60px] justify-center px-2">
                      {branch ? (
                        <FlowNodeBtn
                          node={branch}
                          isActive={branch.id === activeId}
                          isPast={false}
                          isBranch
                          onClick={() => onSelect(branch.id)}
                        />
                      ) : null}
                    </div>
                    {i < mainNodes.length - 1 ? (
                      <div className="flex-1 min-w-[6px]" aria-hidden />
                    ) : null}
                  </Fragment>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─── Shared: Step Indicator ───────────────────────────────────────────────────

function StepBar({
  steps, active, onSelect, amber,
}: {
  steps: string[]; active: number; onSelect: (i: number) => void; amber?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((label, i) => (
        <Fragment key={i}>
          <button
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors',
              active === i && !amber && 'border-primary/40 bg-primary/10 text-primary',
              active === i &&  amber && 'border-amber-500/40 bg-amber-500/10 text-amber-400',
              i < active && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
              i > active && 'border-border/50 bg-card/30 text-muted-foreground',
            )}
          >
            <span className={cn(
              'flex h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
              active === i && !amber && 'border-primary/50 bg-primary/15 text-primary',
              active === i &&  amber && 'border-amber-500/50 bg-amber-500/12 text-amber-400',
              i < active && 'border-emerald-500/40 bg-emerald-500/12 text-emerald-400',
              i > active && 'border-border/60 bg-secondary/40 text-muted-foreground',
            )}>
              {i < active ? <Check className="h-2.5 w-2.5" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </button>
          {i < steps.length - 1 ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" aria-hidden />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

// ─── Stage: 需求 ──────────────────────────────────────────────────────────────

const DEMAND_DATA = [
  { id: 'DR-202604-MW1-00003', partNo: 'BOS-F026T02001', name: 'BOSCH 火星塞',  qty: 20, src: 'vendor', urgency: 'low',    date: '04-13', vendor: '德國汽車配件' },
  { id: 'DR-202604-MW1-00002', partNo: 'ATE-24.0124',    name: 'ATE 剎車碟片',  qty: 4,  src: 'sales',  urgency: 'high',   date: '04-12', vendor: '永昌汽材' },
  { id: 'DR-202604-MW1-00001', partNo: 'MK20-BP2200',    name: 'MK20 剎車片',   qty: 10, src: 'system', urgency: 'medium', date: '04-11', vendor: '德國汽車配件' },
];
const SRC_LABELS: Record<string, string> = { system: '系統自動', sales: '業務提交', vendor: '廠商特價' };
const SRC_TONE:   Record<string, string> = {
  system: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  sales:  'border-amber-500/30 bg-amber-500/10 text-amber-400',
  vendor: 'border-primary/30 bg-primary/10 text-primary',
};
const URG_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' };
const URG_TONE:  Record<string, string> = { high: 'text-destructive', medium: 'text-amber-400', low: 'text-muted-foreground' };

type DemandFilter = 'all' | 'system' | 'sales' | 'vendor';

function DemandContent() {
  const [filter, setFilter] = useState<DemandFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set(['DR-202604-MW1-00002', 'DR-202604-MW1-00001']));

  const displayed = filter === 'all' ? DEMAND_DATA : DEMAND_DATA.filter((d) => d.src === filter);
  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectedItems = DEMAND_DATA.filter((d) => selected.has(d.id));
  const byVendor = selectedItems.reduce<Record<string, typeof DEMAND_DATA>>((a, d) => { (a[d.vendor] ??= []).push(d); return a; }, {});

  const FILTERS: { k: DemandFilter; l: string }[] = [
    { k: 'all', l: '全部' }, { k: 'system', l: '系統自動' }, { k: 'sales', l: '業務提交' }, { k: 'vendor', l: '廠商特價' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
      {/* 左：需求清單 */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(({ k, l }) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={cn('rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                filter === k ? 'border-primary/40 bg-primary/12 text-primary' : 'border-border/50 bg-card/30 text-muted-foreground hover:bg-secondary/50')}>
              {l}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-border/50 bg-background/20">
          <div className="grid grid-cols-[24px_1fr_52px_88px_44px_56px] gap-2 border-b border-border/50 bg-muted/20 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span /><span>料號 / 品名</span><span className="text-right">需求量</span><span>來源</span><span>緊急</span><span>日期</span>
          </div>
          {displayed.map((d) => (
            <label key={d.id} className={cn('grid cursor-pointer grid-cols-[24px_1fr_52px_88px_44px_56px] gap-2 items-center border-b border-border/20 px-3 py-2.5 transition-colors last:border-0', selected.has(d.id) ? 'bg-primary/5' : 'hover:bg-muted/15')}>
              <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
              <div>
                <div className="text-[10px] font-medium text-muted-foreground">{d.partNo}</div>
                <div className="text-sm font-semibold text-foreground">{d.name}</div>
              </div>
              <div className="text-right text-sm font-semibold tabular-nums text-foreground">{d.qty}</div>
              <span className={cn('inline-flex w-fit rounded border px-1.5 py-0.5 text-[10px] font-medium', SRC_TONE[d.src])}>{SRC_LABELS[d.src]}</span>
              <span className={cn('text-xs font-semibold', URG_TONE[d.urgency])}>{URG_LABEL[d.urgency]}</span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{d.date}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 右：決策彙總 */}
      <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
        <p className="text-xs font-semibold text-foreground">決策彙總</p>
        <p className="text-[11px] text-muted-foreground">{selected.size} 個項目已勾選</p>
        <div className="space-y-1.5">
          {Object.entries(byVendor).map(([vendor, items]) => (
            <div key={vendor} className="space-y-1 rounded-lg border border-border/40 bg-background/20 px-3 py-2">
              <p className="text-[11px] font-medium text-muted-foreground">{vendor}</p>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{item.name}</span>
                  <span className="tabular-nums text-muted-foreground">{item.qty} 個</span>
                </div>
              ))}
            </div>
          ))}
          {selected.size === 0 && <p className="py-4 text-center text-xs text-muted-foreground/60">請勾選需求項目</p>}
        </div>
        {Object.keys(byVendor).length > 0 && (
          <p className="border-t border-border/40 pt-2 text-[10px] text-muted-foreground">共 {Object.keys(byVendor).length} 家廠商</p>
        )}
        <button type="button" disabled={selected.size === 0}
          className={cn('w-full rounded-xl border py-2 text-sm font-medium transition-colors',
            selected.size > 0 ? 'border-primary/40 bg-primary/12 text-primary hover:bg-primary/18' : 'cursor-not-allowed border-border/40 bg-muted/20 text-muted-foreground/50')}>
          加入詢價
        </button>
      </div>
    </div>
  );
}

// ─── Stage: 詢價 ──────────────────────────────────────────────────────────────

const RFQ_LIST = [
  { id: 'RF-202604-MW1-00002', vendor: '永昌汽材股份有限公司', parts: 2, status: '待回覆', date: '04-12' },
  { id: 'RF-202604-MW1-00001', vendor: '德國汽車配件有限公司', parts: 1, status: '已回覆', date: '04-11' },
];

function RfqContent() {
  const [sel, setSel] = useState('RF-202604-MW1-00001');
  const [step, setStep] = useState(2);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[188px_1fr]">
      {/* 左：詢價單列表 */}
      <div className="space-y-1.5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">詢價單列表</p>
          <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-primary/35 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/18">
            <Plus className="h-3 w-3" /><span>新增</span>
          </button>
        </div>
        {RFQ_LIST.map((r) => (
          <button key={r.id} type="button" onClick={() => setSel(r.id)}
            className={cn('w-full rounded-xl border px-3 py-2.5 text-left transition-colors', sel === r.id ? 'border-primary/40 bg-primary/10' : 'border-border/50 bg-card/30 hover:bg-card/60')}>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground">{r.id}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{r.vendor}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className={cn('rounded border px-1.5 py-0.5 text-[10px]', r.status === '待回覆' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400')}>{r.status}</span>
              <span className="text-[10px] text-muted-foreground">{r.date}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 右：步驟區 + 決策彙總 */}
      <div className="space-y-4">
        <StepBar steps={['詢價廠商', '確認詢價項目', '填入廠商回覆報價']} active={step} onSelect={setStep} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_188px]">
          <div className="min-h-[140px] rounded-xl border border-border/50 bg-background/20 p-4">
            {step === 0 && (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold text-foreground">① 詢價廠商</p>
                <div className="flex gap-2 text-sm"><span className="text-muted-foreground">廠商</span><span className="font-medium text-foreground">德國汽車配件有限公司</span></div>
                <p className="text-xs text-muted-foreground">已由需求節點帶入，Enter 進入步驟二</p>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold text-foreground">② 確認詢價項目</p>
                <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/10">
                  <div className="grid grid-cols-[1fr_64px_80px] gap-2 border-b border-border/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span>品名</span><span className="text-right">需求量</span><span className="text-right">確認量</span>
                  </div>
                  <div className="grid grid-cols-[1fr_64px_80px] gap-2 items-center px-3 py-2.5 text-sm">
                    <span className="text-foreground">MK20 剎車片</span>
                    <span className="text-right tabular-nums text-muted-foreground">10</span>
                    <input defaultValue="10" className="w-full rounded border border-border/60 bg-background/50 px-1.5 py-0.5 text-right text-xs" />
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold text-foreground">③ 填入廠商回覆報價</p>
                <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/10">
                  <div className="grid grid-cols-[1fr_80px_80px] gap-2 border-b border-border/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span>品名</span><span className="text-right">廠商報價</span><span className="text-right">小計</span>
                  </div>
                  <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-3 py-2.5 text-sm">
                    <span className="text-foreground">MK20 剎車片</span>
                    <input defaultValue="850" className="w-full rounded border border-border/60 bg-background/50 px-1.5 py-0.5 text-right text-xs" />
                    <span className="text-right font-semibold tabular-nums text-foreground">$8,500</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">預計到貨</span>
                  <input type="date" defaultValue="2026-04-20" className="rounded border border-border/60 bg-background/50 px-2 py-0.5 text-xs text-foreground" />
                </div>
              </div>
            )}
          </div>
          {/* 決策彙總 */}
          <div className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3">
            <p className="text-xs font-semibold text-foreground">決策彙總</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-foreground">MK20 剎車片</span><span className="text-emerald-400">→ 建採購單</span></div>
            </div>
            <div className="border-t border-border/40 pt-2 text-[10px] text-muted-foreground">共 1 個料號建採購單</div>
            <button type="button" className="w-full rounded-xl border border-primary/40 bg-primary/12 py-2 text-xs font-medium text-primary hover:bg-primary/18">生成採購單</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stage: 採購單 ────────────────────────────────────────────────────────────

const PO_LIST = [
  { id: 'PO-202604-MW1-00001', vendor: '德國汽車配件有限公司', amount: 45000, status: '待廠商確認', date: '04-12' },
];

function PoContent() {
  const [sel, setSel] = useState('PO-202604-MW1-00001');
  const [step, setStep] = useState(1);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[188px_1fr]">
      {/* 左：採購單列表 */}
      <div className="space-y-1.5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">採購單列表</p>
          <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-primary/35 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/18">
            <Plus className="h-3 w-3" /><span>新增</span>
          </button>
        </div>
        {PO_LIST.map((po) => (
          <button key={po.id} type="button" onClick={() => setSel(po.id)}
            className={cn('w-full rounded-xl border px-3 py-2.5 text-left transition-colors', sel === po.id ? 'border-primary/40 bg-primary/10' : 'border-border/50 bg-card/30 hover:bg-card/60')}>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground">{po.id}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{po.vendor}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{po.status}</span>
              <span className="tabular-nums text-[10px] text-muted-foreground">NT${po.amount.toLocaleString()}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 右：步驟區 + 狀態追蹤 */}
      <div className="space-y-4">
        <StepBar steps={['採購廠商', '確認採購明細', '寄出採購單']} active={step} onSelect={setStep} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_188px]">
          <div className="min-h-[140px] rounded-xl border border-border/50 bg-background/20 p-4">
            {step === 0 && (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold text-foreground">① 採購廠商</p>
                <div className="flex gap-2 text-sm"><span className="text-muted-foreground">廠商</span><span className="font-medium text-foreground">德國汽車配件有限公司</span></div>
                <p className="text-xs text-muted-foreground">Enter 進入確認明細</p>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold text-foreground">② 確認採購明細</p>
                <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/10">
                  <div className="grid grid-cols-[1fr_48px_72px_72px] gap-2 border-b border-border/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span>品名</span><span className="text-right">數量</span><span className="text-right">單價</span><span className="text-right">小計</span>
                  </div>
                  {[{ name: 'MK20 剎車片', qty: 10, price: 3200, total: 32000 }, { name: 'ATE 剎車碟片', qty: 4, price: 3250, total: 13000 }].map((r) => (
                    <div key={r.name} className="grid grid-cols-[1fr_48px_72px_72px] gap-2 items-center border-b border-border/20 px-3 py-2 text-sm last:border-0">
                      <span className="text-foreground">{r.name}</span>
                      <span className="text-right tabular-nums text-muted-foreground">{r.qty}</span>
                      <span className="text-right tabular-nums text-muted-foreground">{r.price.toLocaleString()}</span>
                      <span className="text-right font-semibold tabular-nums text-foreground">{r.total.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 border-t border-border/40 text-sm font-semibold">
                    <span className="text-muted-foreground">總計</span><span className="tabular-nums text-foreground">NT$45,000</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span><span className="text-muted-foreground">付款條件</span><span className="ml-1.5 font-medium text-foreground">NET30</span></span>
                  <span><span className="text-muted-foreground">預計到貨</span><span className="ml-1.5 font-medium text-foreground">2026-04-25</span></span>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <p className="mb-2 text-xs font-semibold text-foreground">③ 寄出採購單</p>
                <p className="text-xs text-muted-foreground">確認後系統產生採購單 PDF，選擇寄送方式</p>
                <div className="flex gap-2">
                  <button type="button" className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/18">Email 寄出</button>
                  <button type="button" className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30">列印</button>
                </div>
              </div>
            )}
          </div>
          {/* 狀態追蹤 */}
          <div className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3">
            <p className="text-xs font-semibold text-foreground">狀態追蹤</p>
            <div className="space-y-1.5 text-xs">
              {[['單號', 'PO-202604-MW1-00001'], ['廠商', '德國汽配'], ['狀態', '待廠商確認'], ['寄出時間', '04-12 14:30']].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-1">
                  <span className="text-muted-foreground">{l}</span>
                  <span className={cn('font-medium text-right', l === '狀態' ? 'text-primary' : 'text-foreground text-[10px]')}>{v}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border/40 pt-2">
              <button type="button" className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15">廠商已確認</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stage: 審核 (PLUS+) ──────────────────────────────────────────────────────

function ApprovalContent() {
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_232px]">
      {/* 左：採購單明細（唯讀） */}
      <div className="space-y-4 rounded-xl border border-border/50 bg-background/20 p-4">
        <div>
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground">PO-202604-MW1-00001</p>
          <h3 className="mt-0.5 text-sm font-semibold text-foreground">德國汽車配件有限公司</h3>
        </div>
        <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/10">
          <div className="grid grid-cols-[1fr_48px_72px_72px] gap-2 border-b border-border/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>品名</span><span className="text-right">數量</span><span className="text-right">單價</span><span className="text-right">小計</span>
          </div>
          {[{ name: 'MK20 剎車片', qty: 10, price: 3200, total: 32000 }, { name: 'ATE 剎車碟片', qty: 4, price: 3250, total: 13000 }].map((r) => (
            <div key={r.name} className="grid grid-cols-[1fr_48px_72px_72px] gap-2 items-center border-b border-border/20 px-3 py-2 text-sm last:border-0">
              <span className="text-foreground">{r.name}</span>
              <span className="text-right tabular-nums text-muted-foreground">{r.qty}</span>
              <span className="text-right tabular-nums text-muted-foreground">{r.price.toLocaleString()}</span>
              <span className="text-right tabular-nums text-foreground">{r.total.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between px-3 py-2 border-t border-border/40 text-sm font-semibold">
            <span className="text-muted-foreground">總計</span><span className="tabular-nums text-foreground">NT$45,000</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[['付款條件', 'NET30'], ['採購人員', '張小明'], ['預計到貨', '2026-04-25'], ['建立時間', '04-12 14:30']].map(([l, v]) => (
            <div key={l}><span className="text-muted-foreground">{l}</span><span className="ml-2 font-medium text-foreground">{v}</span></div>
          ))}
        </div>
      </div>

      {/* 右：審核決定 */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
        <p className="text-xs font-semibold text-foreground">審核決定</p>
        <div className="space-y-2">
          {[
            { k: 'approve' as const, icon: Check,  label: '核准', on: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400', off: 'hover:border-emerald-500/30 hover:text-emerald-400' },
            { k: 'reject'  as const, icon: X,      label: '退件', on: 'border-destructive/50 bg-destructive/15 text-destructive',  off: 'hover:border-destructive/30 hover:text-destructive' },
          ].map(({ k, icon: Icon, label, on, off }) => (
            <button key={k} type="button" onClick={() => setDecision(k)}
              className={cn('flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors', decision === k ? on : cn('border-border/50 bg-card/30 text-muted-foreground', off))}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </button>
          ))}
        </div>
        {decision === 'reject' && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">退件原因（必填）</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="請說明退件原因…"
              className="w-full resize-none rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none" rows={3} />
          </div>
        )}
        {decision && (
          <button type="button" disabled={decision === 'reject' && !reason.trim()}
            className={cn('w-full rounded-xl border py-2 text-sm font-medium transition-colors',
              decision === 'approve' ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/18' :
              reason.trim() ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15' :
              'cursor-not-allowed border-border/40 bg-muted/20 text-muted-foreground/50')}>
            確認{decision === 'approve' ? '核准' : '退件'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Stage: 驗收 ──────────────────────────────────────────────────────────────

const RR_LIST = [
  { id: 'RR-202604-MW1-00002', vendor: '德國汽車配件有限公司', status: '驗收中', date: '04-13' },
  { id: 'RR-202604-MW1-00001', vendor: '永昌汽材股份有限公司', status: '待到貨', date: '04-11' },
];

function ReceivingContent() {
  const [sel, setSel] = useState('RR-202604-MW1-00002');
  const [step, setStep] = useState(1);
  const [disp, setDisp] = useState<'all-ok' | 'split' | null>(null);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[188px_1fr]">
      {/* 左：進貨驗收單列表 */}
      <div className="space-y-1.5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">進貨驗收單</p>
          <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-primary/35 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/18">
            <Plus className="h-3 w-3" /><span>新增</span>
          </button>
        </div>
        {RR_LIST.map((rr) => (
          <button key={rr.id} type="button" onClick={() => setSel(rr.id)}
            className={cn('w-full rounded-xl border px-3 py-2.5 text-left transition-colors', sel === rr.id ? 'border-primary/40 bg-primary/10' : 'border-border/50 bg-card/30 hover:bg-card/60')}>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground">{rr.id}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{rr.vendor}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className={cn('rounded border px-1.5 py-0.5 text-[10px]', rr.status === '驗收中' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-border/40 bg-muted/20 text-muted-foreground')}>{rr.status}</span>
              <span className="text-[10px] text-muted-foreground">{rr.date}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 右：步驟 + 決策彙總 */}
      <div className="space-y-4">
        <StepBar steps={['確認廠商', '執行驗收', '驗收結果']} active={step} onSelect={setStep} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
          <div className="min-h-[140px] rounded-xl border border-border/50 bg-background/20 p-4">
            {step === 0 && (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold text-foreground">① 確認廠商</p>
                <div className="flex gap-2 text-sm"><span className="text-muted-foreground">廠商</span><span className="font-medium text-foreground">德國汽車配件有限公司</span></div>
                <p className="text-xs text-muted-foreground">Enter 進入執行驗收</p>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold text-foreground">② 執行驗收</p>
                <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/10">
                  <div className="grid grid-cols-[1fr_72px_72px_80px] gap-2 border-b border-border/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span>品名</span><span className="text-right">預期量</span><span className="text-right">實收量</span><span>外觀</span>
                  </div>
                  {[{ name: 'MK20 剎車片', exp: 10 }, { name: 'ATE 剎車碟片', exp: 4 }].map((r) => (
                    <div key={r.name} className="grid grid-cols-[1fr_72px_72px_80px] gap-2 items-center border-b border-border/20 px-3 py-2.5 last:border-0">
                      <span className="text-sm text-foreground">{r.name}</span>
                      <span className="text-right tabular-nums text-sm text-muted-foreground">{r.exp}</span>
                      <input defaultValue={r.exp} className="w-full rounded border border-border/60 bg-background/50 px-1.5 py-0.5 text-right text-xs" />
                      <select className="rounded border border-border/60 bg-background/50 px-1 py-0.5 text-[10px] text-foreground">
                        <option>正常</option><option>數量異常</option><option>瑕疵品</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold text-foreground">③ 驗收結果 / 異常處置</p>
                <div className="space-y-2">
                  {[
                    { k: 'all-ok' as const, icon: CheckCircle2, label: '全數正常，直接入帳', tone: 'emerald' },
                    { k: 'split'  as const, icon: AlertTriangle, label: '正常品入帳，異常品退貨', tone: 'amber' },
                  ].map(({ k, icon: Icon, label, tone }) => (
                    <button key={k} type="button" onClick={() => setDisp(k)}
                      className={cn('flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                        disp === k ? tone === 'emerald' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                        : 'border-border/50 bg-card/30 text-muted-foreground hover:bg-muted/20')}>
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* 決策彙總 + 狀態追蹤 */}
          <div className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3">
            <p className="text-xs font-semibold text-foreground">決策彙總</p>
            <div className="space-y-1.5 text-xs">
              {[['MK20 剎車片', '→ 入帳', 'text-emerald-400'], ['ATE 剎車碟片', '→ 入帳', 'text-emerald-400']].map(([n, s, c]) => (
                <div key={n} className="flex justify-between"><span className="text-foreground">{n}</span><span className={c}>{s}</span></div>
              ))}
            </div>
            <div className="border-t border-border/40 pt-2 text-[10px] text-muted-foreground space-y-0.5">
              <p>→ 入帳：2 個料號</p><p>→ 退貨：0 個料號</p>
            </div>
            <button type="button" className="w-full rounded-xl border border-primary/40 bg-primary/12 py-2 text-xs font-medium text-primary hover:bg-primary/18">確認驗收</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stage: 退貨 ──────────────────────────────────────────────────────────────

function ReturnContent() {
  const [step, setStep] = useState(0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[188px_1fr]">
      {/* 左：退貨單列表（空） */}
      <div className="space-y-1.5">
        <p className="mb-2 text-xs font-medium text-muted-foreground">退貨單列表</p>
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 px-4 py-10 text-center">
          <PackageX className="mx-auto mb-2 h-7 w-7 text-muted-foreground/30" aria-hidden />
          <p className="text-xs text-muted-foreground/60">目前無退貨記錄</p>
        </div>
      </div>

      {/* 右：步驟區 + 狀態追蹤 */}
      <div className="space-y-4">
        <StepBar steps={['確認廠商', '確認退貨項目']} active={step} onSelect={setStep} amber />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_188px]">
          <div className="min-h-[120px] rounded-xl border border-border/50 bg-background/20 p-4">
            <p className="text-xs text-muted-foreground">由驗收節點異常品自動產生退貨單，選取後進入退貨步驟</p>
          </div>
          <div className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3">
            <p className="text-xs font-semibold text-foreground">狀態追蹤</p>
            <p className="text-xs text-muted-foreground/60">無進行中退貨</p>
            <div className="border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
              <p>廠商已收貨 → AP 自動沖銷</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stage: 入帳 ──────────────────────────────────────────────────────────────

function PostingContent() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_212px]">
      {/* 左：入帳確認 */}
      <div className="space-y-4 rounded-xl border border-border/50 bg-background/20 p-4">
        <div>
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground">RR-202604-MW1-00003</p>
          <h3 className="mt-0.5 text-sm font-semibold text-foreground">BOSCH 濾清器進貨入帳</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">廠商：德國汽車配件有限公司</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/10">
          <div className="grid grid-cols-[1fr_52px_72px_80px] gap-2 border-b border-border/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>品名</span><span className="text-right">數量</span><span className="text-right">均價</span><span className="text-right">小計</span>
          </div>
          <div className="grid grid-cols-[1fr_52px_72px_80px] gap-2 items-center px-3 py-2.5 text-sm">
            <span className="text-foreground">BOSCH 機油濾清器</span>
            <span className="text-right tabular-nums text-muted-foreground">16</span>
            <span className="text-right tabular-nums text-muted-foreground">800</span>
            <span className="text-right font-semibold tabular-nums text-foreground">12,800</span>
          </div>
          <div className="flex justify-between border-t border-border/40 px-3 py-2 text-sm font-semibold">
            <span className="text-muted-foreground">總入帳金額</span><span className="tabular-nums text-foreground">NT$12,800</span>
          </div>
        </div>
        <button type="button" className="w-full rounded-2xl border border-primary/50 bg-primary/15 py-3 text-sm font-semibold text-primary shadow-[0_0_18px_rgba(244,176,52,0.18)] transition-colors hover:bg-primary/22">
          確認入帳
        </button>
      </div>
      {/* 右：入帳後觸發 */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
        <p className="text-xs font-semibold text-foreground">入帳後觸發</p>
        {[['庫存增加', '→ NX03 分貨入庫'], ['AP 應付帳款', '→ NX05 財務']].map(([l, s]) => (
          <div key={l} className="flex items-start gap-2 rounded-lg border border-border/40 bg-background/20 px-3 py-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            <div><p className="text-xs font-medium text-foreground">{l}</p><p className="text-[10px] text-muted-foreground">{s}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stage: 完成 ──────────────────────────────────────────────────────────────

const DONE_LIST = [
  { id: 'PO-202604-MW1-00008', title: 'FEBI BILSTEIN 水幫浦',  vendor: '德國汽車配件', amount: 8500,  onTime: true,  date: '2026-04-09' },
  { id: 'PO-202604-MW1-00007', title: 'MANN 機油濾清器',        vendor: '永昌汽材',     amount: 3200,  onTime: true,  date: '2026-04-08' },
  { id: 'PO-202604-MW1-00006', title: 'ATE 剎車來令片套組',     vendor: '永昌汽材',     amount: 12000, onTime: false, date: '2026-04-06' },
];

function DoneContent() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_192px]">
      {/* 左：已完成列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">已完成採購單</p>
          <span className="text-[10px] font-semibold text-amber-400">本月完成：9 筆</span>
        </div>
        <div className="overflow-hidden divide-y divide-border/50 rounded-xl border border-border/50 bg-background/20">
          {DONE_LIST.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/15">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground">{row.id}</span>
                  <span className={cn('text-[10px] font-medium', row.onTime ? 'text-emerald-400' : 'text-amber-400')}>
                    {row.onTime ? '✓ 準時' : '⚠ 延遲'}
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-foreground">{row.title}</p>
                <p className="text-xs text-muted-foreground">{row.vendor}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-foreground">NT${row.amount.toLocaleString()}</p>
                <p className="text-[10px] tabular-nums text-muted-foreground">{row.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 右：本月採購統計 */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
        <p className="text-xs font-semibold text-foreground">本月採購統計</p>
        {[['採購總額', 'NT$320,000'], ['完成單數', '9 張'], ['平均到貨天數', '4.2 天'], ['驗收異常率', '8%'], ['退貨金額', 'NT$0']].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{l}</span>
            <span className="font-semibold tabular-nums text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProcurementFlowHub() {
  const { planCode } = useSessionMe();
  const isPro = planCode === 'PRO';

  const [activeId, setActiveId] = useState<StepId>('demand');

  return (
    <div className="space-y-5 text-foreground">
      {/* KPI BAR（PRO 限定） */}
      {isPro ? <KpiBar /> : null}

      {/* 兩層流程圖 */}
      <FlowChart
        mainNodes={MAIN_NODES}
        branchNodes={BRANCH_NODES}
        activeId={activeId}
        onSelect={setActiveId}
      />

      {/* 節點作業區 */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-4 backdrop-blur-sm sm:p-5">
        {activeId === 'demand'  && <DemandContent />}
        {activeId === 'rfq'     && <RfqContent />}
        {activeId === 'po'      && <PoContent />}
        {activeId === 'approve' && <ApprovalContent />}
        {activeId === 'rr'      && <ReceivingContent />}
        {activeId === 'return'  && <ReturnContent />}
        {activeId === 'posting' && <PostingContent />}
        {activeId === 'done'    && <DoneContent />}
      </div>
    </div>
  );
}
