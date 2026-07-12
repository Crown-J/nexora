// apps/nx-ui/src/features/nx04/quote/ui/QuoteWorkspace.tsx
// F2 即時報價工作台（執行長 2026-07-12 深夜拍板・A/B/C 三區五階段、取代三層疊窗）：
//   A 階段軌（純圖示、Alt+1~5 切換）：對象 → 搜尋 → 檢查庫存 → 報價 → 發送訊息
//   B 主容器／C 副容器 各階段內容：
//     1 對象：B 客戶搜尋（Alt+N 散客跳過）｜C 客戶基本資訊
//     2 搜尋：B 三查法輸入（料號／品名+車型／進階）｜C 搜尋結果（↑↓ Enter 選定）
//     3 檢查庫存：B 上基本資訊、下通用零件（↑↓ 選、Space 加入報價、Alt+D 加調貨）｜C 該件庫存
//     4 報價：B 已選零件量價（Enter 鏈、末欄 → 階段5）｜C 該件歷史價五格
//     5 發送訊息：B 訊息（Alt+A 全選、Enter 存檔→確認）｜C 訊息內容設定（記憶）
//   防呆沿用：無庫存且近月無同行詢價→報價前提示；公司有貨→加調貨前提示。
'use client';

import {
  Check,
  FilePlus,
  MessageSquareText,
  PackageSearch,
  UserRound,
  Warehouse as WarehouseIcon,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listPartners, type PartnerDto } from '@data/endpoints/nx01/api/partner';
import {
  getPartCompatGroup,
  getPartDetail,
  getPartStockSummary,
  quickSearchParts,
} from '@data/endpoints/nx01/part-search/api/part-search';
import { getQuoteCandidates } from '@data/endpoints/nx04/quote/api/quote';
import {
  createQuoteRecord,
  listInquiryRecords,
} from '@data/endpoints/nx04/record/api/record';
import type { PartDetailDto, PartSearchRow, PartStockSummaryDto } from '@data/types/nx01/part-search';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import { PriceIntelPanel } from './PriceIntelPanel';
import { addTransferItems, listTransferItems, TRANSFER_LIST_EVENT } from './transfer-inquiry-store';

type Stage = 1 | 2 | 3 | 4 | 5;
type CompatRow = { partId: string; code: string; name: string; brand: string | null; avail: number; suggested: string | null; prefill: string };
type QuoteLine = CompatRow & { qty: string; price: string };
type MsgOpts = { baseNo: boolean; secCode: boolean; partName: boolean; qtyAlways: boolean };

const STAGES: { n: Stage; label: string; icon: React.ReactNode }[] = [
  { n: 1, label: '對象', icon: <UserRound className="size-[18px]" /> },
  { n: 2, label: '搜尋', icon: <PackageSearch className="size-[18px]" /> },
  { n: 3, label: '檢查庫存', icon: <WarehouseIcon className="size-[18px]" /> },
  { n: 4, label: '報價', icon: <FilePlus className="size-[18px]" /> },
  { n: 5, label: '發送訊息', icon: <MessageSquareText className="size-[18px]" /> },
];

function formatNt(n: number): string {
  if (n < 100 && n !== Math.floor(n)) return n.toFixed(2);
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}
const MSG_OPTS_KEY = 'nx-f2-msg-opts';
const defaultOpts: MsgOpts = { baseNo: true, secCode: false, partName: true, qtyAlways: false };

export function QuoteWorkspace({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<Stage>(1);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  // 階段 2 搜尋
  const [method, setMethod] = useState<'partNo' | 'keyword' | 'advanced'>('partNo');
  const [q1, setQ1] = useState(''); // 料號 / 品名 / 廠牌
  const [q2, setQ2] = useState(''); // 車型 / 族群
  const [results, setResults] = useState<PartSearchRow[]>([]);
  const [resSel, setResSel] = useState(0);
  const [searching, setSearching] = useState(false);
  // 階段 3 檢查庫存
  const [currentPartId, setCurrentPartId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PartDetailDto | null>(null);
  const [compat, setCompat] = useState<CompatRow[]>([]);
  const [compatSel, setCompatSel] = useState(0);
  const [stock, setStock] = useState<PartStockSummaryDto | null>(null);
  // 階段 4/5
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [lineSel, setLineSel] = useState(0);
  const [stockWarn, setStockWarn] = useState<string[]>([]);
  const [msgOpts, setMsgOpts] = useState<MsgOpts>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(MSG_OPTS_KEY) : null;
      if (raw) return { ...defaultOpts, ...(JSON.parse(raw) as Partial<MsgOpts>) };
    } catch {
      /* 走預設 */
    }
    return defaultOpts;
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [transferCount, setTransferCount] = useState(0);
  // 階段 1 C 欄：客戶基本資訊（客編/名稱/地址/電話/備註、執行長 07/12）
  const [partnerInfo, setPartnerInfo] = useState<PartnerDto | null>(null);

  const custBoxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resListRef = useRef<HTMLDivElement>(null);
  const compatListRef = useRef<HTMLDivElement>(null);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceRefs = useRef<(HTMLInputElement | null)[]>([]);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const reqRef = useRef(0);

  // ── 全域鍵：Alt+1~5 切階段 ──
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        setStage(Number(e.key) as Stage);
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);

  // 調貨清單徽章
  useEffect(() => {
    const sync = () => setTransferCount(listTransferItems().length);
    sync();
    window.addEventListener(TRANSFER_LIST_EVENT, sync);
    return () => window.removeEventListener(TRANSFER_LIST_EVENT, sync);
  }, []);

  // 選定客戶 → 抓完整基本資訊（電話/備註；地址為結構化衛星表、v1 未接）
  useEffect(() => {
    if (!customer) {
      setPartnerInfo(null);
      return;
    }
    let alive = true;
    void listPartners({ q: customer.code, partnerType: 'C', pageSize: 5 })
      .then((r) => {
        if (!alive) return;
        setPartnerInfo(r.items.find((p) => p.code === customer.code) ?? r.items[0] ?? null);
      })
      .catch(() => alive && setPartnerInfo(null));
    return () => {
      alive = false;
    };
  }, [customer]);

  // 階段切換 → 聚焦該階段主要元素
  // ⚠️ 階段 1 必須在這裡補聚焦：FocusLockedDialog 開啟時的預設聚焦會落在
  //   DOM 第一個 focusable（右上關閉鈕）、蓋掉 CustomerPicker 的 autoFocus
  //   ——執行長 07/12「F2 後不能直接打字」的病灶
  useEffect(() => {
    const t = setTimeout(() => {
      if (stage === 1) custBoxRef.current?.querySelector('input')?.focus();
      else if (stage === 2) searchInputRef.current?.focus();
      else if (stage === 3) compatListRef.current?.focus();
      else if (stage === 4) qtyRefs.current[0]?.focus();
      else if (stage === 5) {
        msgRef.current?.focus();
        msgRef.current?.select();
      }
    }, 60);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (confirmOpen) confirmRef.current?.focus();
  }, [confirmOpen]);

  // ── 階段 2：查詢 ──
  const runSearch = useCallback(async () => {
    setSearching(true);
    try {
      const r = await quickSearchParts({
        ...(method === 'partNo' ? { partNo: q1.trim() || undefined } : {}),
        ...(method === 'keyword' ? { keyword: q1.trim() || undefined, modelQuery: q2.trim() || undefined } : {}),
        ...(method === 'advanced' ? { brandQuery: q1.trim() || undefined, partGroupQuery: q2.trim() || undefined } : {}),
        pageSize: 50,
      });
      setResults(r.rows);
      setResSel(0);
      setTimeout(() => resListRef.current?.focus(), 30);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [method, q1, q2]);

  // ── 階段 3：載明細＋通用件（候選帶建議售價；散客退回通用件群組）──
  useEffect(() => {
    if (!currentPartId) return;
    const myReq = ++reqRef.current;
    setDetail(null);
    setCompat([]);
    setCompatSel(0);
    void (async () => {
      try {
        const [d, rows] = await Promise.all([
          getPartDetail(currentPartId),
          customer
            ? getQuoteCandidates(customer.id, currentPartId, customer.defaultWarehouseId ?? undefined).then((r) =>
                r.candidates.map((c) => ({
                  partId: c.id,
                  code: c.code,
                  name: c.name,
                  brand: c.brandCode ?? c.brandName,
                  avail: Object.values(c.stockByWh).reduce((s, v) => s + Number(v), 0),
                  suggested: c.suggestedPrice,
                  prefill: c.customerLastAmount ?? c.suggestedPrice ?? '',
                })),
              )
            : getPartCompatGroup(currentPartId).then((r) => {
                const g = r.groups.find((x) => x.primary?.id === currentPartId) ?? r.groups[0];
                const members = g ? [...(g.primary ? [g.primary] : []), ...g.alts] : [];
                return members.map((m) => ({
                  partId: m.id,
                  code: m.code,
                  name: m.name,
                  brand: m.brandCode ?? m.brandName,
                  avail: Number(m.onHandTotal),
                  suggested: null,
                  prefill: '',
                }));
              }),
        ]);
        if (reqRef.current !== myReq) return;
        setDetail(d);
        // 群組空（單一料）→ 至少列自己
        setCompat(
          rows.length > 0
            ? rows
            : [{ partId: d.id, code: d.code, name: d.name, brand: d.brand?.code ?? null, avail: 0, suggested: null, prefill: '' }],
        );
      } catch {
        if (reqRef.current === myReq) setDetail(null);
      }
    })();
  }, [currentPartId, customer]);

  // C 欄庫存：跟著階段 3 選中列（或階段 4 聚焦行）
  const focusPartId =
    stage === 4 ? (lines[lineSel]?.partId ?? null) : (compat[compatSel]?.partId ?? currentPartId);
  useEffect(() => {
    if (!focusPartId || (stage !== 3 && stage !== 4)) return;
    let alive = true;
    setStock(null);
    void getPartStockSummary(focusPartId)
      .then((s) => alive && setStock(s))
      .catch(() => alive && setStock(null));
    return () => {
      alive = false;
    };
  }, [focusPartId, stage]);

  // ── Space 加入/移除報價、Alt+D 加調貨 ──
  const toggleLine = useCallback(
    (row: CompatRow) => {
      setLines((prev) => {
        const i = prev.findIndex((l) => l.partId === row.partId);
        if (i >= 0) return prev.filter((l) => l.partId !== row.partId);
        return [...prev, { ...row, qty: '1', price: row.prefill }];
      });
    },
    [],
  );
  const addTransfer = useCallback((row: CompatRow) => {
    if (row.avail > 0 && !window.confirm(`⚠️ ${row.code} 公司有現貨（可出 ${row.avail}）——確定加入調貨詢價清單？`)) return;
    addTransferItems([{ partId: row.partId, code: row.code, name: row.name }]);
  }, []);

  // 進階段 4 → 防呆檢查（無庫存且近月無同行詢價）
  useEffect(() => {
    if (stage !== 4) return;
    const zero = lines.filter((l) => l.avail <= 0);
    if (zero.length === 0) {
      setStockWarn([]);
      return;
    }
    let alive = true;
    const dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    void Promise.all(
      zero.map(async (l) => {
        try {
          const r = await listInquiryRecords({ partNo: l.code, dateFrom, pageSize: 1 });
          return r.items.length === 0 ? l.code : null;
        } catch {
          return null;
        }
      }),
    ).then((codes) => alive && setStockWarn(codes.filter((c): c is string => c !== null)));
    return () => {
      alive = false;
    };
  }, [stage, lines]);

  // ── 訊息 ──
  const validLines = lines.filter((l) => l.price !== '' && Number(l.qty) > 0 && Number(l.price) >= 0);
  const copyText = useMemo(
    () =>
      validLines
        .map((l) => {
          const parts: string[] = [];
          if (msgOpts.baseNo) parts.push(l.code);
          if (msgOpts.secCode && detail && detail.id === l.partId && detail.secCode) parts.push(detail.secCode);
          if (msgOpts.partName) parts.push(l.name);
          const qtyPart = msgOpts.qtyAlways || Number(l.qty) > 1 ? `　數量 ${Number(l.qty)}` : '';
          return `${parts.join(' ')}${qtyPart}　報價 NT$ ${formatNt(Number(l.price))}`;
        })
        .join('\n'),
    [validLines, msgOpts, detail],
  );
  const setOpt = (patch: Partial<MsgOpts>) =>
    setMsgOpts((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(MSG_OPTS_KEY, JSON.stringify(next));
      } catch {
        /* 存不了不擋 */
      }
      return next;
    });

  async function save() {
    if (!customer || validLines.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      for (const l of validLines) {
        await createQuoteRecord({
          customerId: customer.id,
          partId: l.partId,
          qty: Number(l.qty),
          unitPrice: Number(l.price),
          warehouseId: customer.defaultWarehouseId ?? undefined,
          source: 'INSTANT',
        });
      }
      setSaved(validLines.length);
      setConfirmOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '報價紀錄儲存失敗');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const resetForNextCall = () => {
    setStage(1);
    setCustomer(null);
    setResults([]);
    setQ1('');
    setQ2('');
    setCurrentPartId(null);
    setDetail(null);
    setCompat([]);
    setLines([]);
    setSaved(null);
    setErr(null);
  };

  // 穩定身分（防 FocusLockedDialog 掛載 effect 重跑搶焦點——07/12 走查坑）
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const guardedClose = useCallback(() => {
    if (
      savedRef.current === null &&
      linesRef.current.length > 0 &&
      !window.confirm('報價還沒存、確定關閉？（清單會消失）')
    )
      return;
    onClose();
  }, [onClose]);

  const lineIds = new Set(lines.map((l) => l.partId));
  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm tabular-nums text-right';
  const secHead = 'text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80';

  return (
    <FocusLockedDialog
      open
      onClose={guardedClose}
      ariaLabel="即時報價工作台"
      backdropClassName="bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      dialogClassName="flex flex-col rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_-18px_rgba(232,160,32,0.22)] animate-in fade-in zoom-in-95 duration-200"
      dialogStyle={{ width: 'min(1400px, 96vw)', height: 'min(820px, 94vh)' }}
    >
      <>
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-2.5">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
          <FilePlus className="size-4 text-primary" />
          <h2 className="text-sm font-bold tracking-wide">即時報價</h2>
          <span className="text-[12px] text-muted-foreground">{STAGES.find((s) => s.n === stage)?.label}</span>
          <span className="ml-2 inline-flex items-center gap-1.5 rounded border border-primary/50 bg-primary/12 px-2 py-0.5 text-[11px] text-primary">
            {customer ? (
              <>
                <span className="font-mono">{customer.code}</span>
                {customer.name}
              </>
            ) : (
              <span className="text-muted-foreground">散客／未選</span>
            )}
            {lines.length > 0 ? <span className="rounded bg-primary/20 px-1 font-mono">{lines.length}</span> : null}
            {transferCount > 0 ? (
              <span className="rounded bg-amber-500/20 px-1 font-mono text-amber-500" title="調貨清單（F5）">
                調{transferCount}
              </span>
            ) : null}
          </span>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60">
            F2 · QUOTE WORKSPACE
          </span>
          <button
            type="button"
            onClick={guardedClose}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* A 階段軌 ｜ B 主容器 ｜ C 副容器 */}
        <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(420px,1.15fr)_minmax(380px,1fr)]">
          {/* A：純圖示階段軌（Alt+1~5、車站路線式：平均分散＋連結線——執行長 07/12）*/}
          <nav className="relative flex flex-col items-center justify-evenly border-r border-border/40 bg-background/30 py-6">
            {/* 路線連結線（貫穿五站、置於圖示下層）*/}
            <span aria-hidden className="absolute bottom-10 left-1/2 top-10 w-[2px] -translate-x-1/2 bg-border/70" />
            {STAGES.map((s) => {
              const active = s.n === stage;
              const done =
                (s.n === 1 && !!customer) ||
                (s.n === 2 && results.length > 0) ||
                (s.n === 3 && !!currentPartId) ||
                (s.n === 4 && lines.length > 0) ||
                (s.n === 5 && saved !== null);
              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setStage(s.n)}
                  title={`${s.label}（Alt+${s.n}）`}
                  className={`relative z-10 grid size-10 place-items-center rounded-full border-2 transition-colors ${
                    active
                      ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_-2px_rgba(232,160,32,0.6)]'
                      : done
                        ? 'border-[#22D88F]/70 bg-popover text-[#22D88F] hover:border-primary/60'
                        : 'border-border/60 bg-popover text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {s.icon}
                  {done && !active ? (
                    <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#22D88F] text-background">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                  <span className="absolute -bottom-1 -right-1 rounded bg-popover px-0.5 font-mono text-[9px] opacity-70">{s.n}</span>
                </button>
              );
            })}
          </nav>

          {/* B 主容器 */}
          <section className="flex min-h-0 flex-col overflow-auto border-r border-border/40 px-5 py-4">
            {stage === 1 && (
              <div ref={custBoxRef} className="mx-auto w-full max-w-md space-y-3 pt-8">
                <div className={secHead}>客戶搜尋</div>
                <CustomerPicker
                  autoFocus
                  onPick={(c) => {
                    setCustomer(c);
                    setStage(2);
                  }}
                  onCommit={() => {}}
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                  <span>Enter 選定 → 搜尋</span>
                  <button
                    type="button"
                    onClick={() => setStage(2)}
                    className="rounded border border-border px-2.5 py-1 hover:border-primary/50"
                  >
                    散客／新客戶、先跳過 <kbd className="ml-1 rounded border border-border/50 bg-muted/40 px-1 font-mono text-[10px]">Alt+N</kbd>
                  </button>
                </div>
              </div>
            )}

            {stage === 2 && (
              <div className="space-y-3">
                <div className={secHead}>查零件（Enter 查詢 → 右欄選結果）</div>
                <div className="flex gap-1.5">
                  {(
                    [
                      ['partNo', '料號'],
                      ['keyword', '品名+車型'],
                      ['advanced', '進階（廠牌/族群）'],
                    ] as const
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMethod(m);
                        setTimeout(() => searchInputRef.current?.focus(), 30);
                      }}
                      className={`rounded-md border px-2.5 py-1 text-[12px] ${
                        method === m ? 'border-primary bg-primary/12 text-primary' : 'border-border/50 text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  ref={searchInputRef}
                  value={q1}
                  onChange={(e) => setQ1(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void runSearch();
                    }
                  }}
                  placeholder={method === 'partNo' ? '料號（如 021 115 562）' : method === 'keyword' ? '品名關鍵字（如 機油芯）' : '廠牌（如 BOSCH）'}
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                />
                {method !== 'partNo' && (
                  <input
                    value={q2}
                    onChange={(e) => setQ2(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void runSearch();
                      }
                    }}
                    placeholder={method === 'keyword' ? '車型（選填、如 GOLF）' : '族群（選填、如 引擎）'}
                    className="w-full rounded border bg-background px-3 py-2 text-sm"
                  />
                )}
                <div className="text-[11px] text-muted-foreground/70">{searching ? '查詢中…' : `找到 ${results.length} 筆（右欄 ↑↓ 選、Enter 進檢查庫存）`}</div>
              </div>
            )}

            {stage === 3 && (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div>
                  <div className={secHead}>基本資訊</div>
                  {detail ? (
                    <div className="mt-1 space-y-1 text-[13.5px]">
                      <div className="font-mono text-[15px] font-semibold text-primary">{detail.code}</div>
                      <div className="text-foreground">{detail.name}</div>
                      <div className="text-[12.5px] text-muted-foreground">
                        廠牌 {detail.brand ? detail.brand.code : '—'}　·　{detail.isOem ? '正廠' : '副廠'}
                        {detail.spec ? `　·　${detail.spec}` : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-[12px] text-muted-foreground">{currentPartId ? '載入中…' : '先在「搜尋」選一顆料（Alt+2）'}</div>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className={secHead}>通用零件（↑↓ 選、Space 加入報價、Alt+D 加調貨、Enter → 報價）</div>
                  <div
                    ref={compatListRef}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (compat.length === 0) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setCompatSel((i) => Math.min(compat.length - 1, i + 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setCompatSel((i) => Math.max(0, i - 1));
                      } else if (e.key === ' ') {
                        e.preventDefault();
                        const r = compat[compatSel];
                        if (r) toggleLine(r);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (lines.length > 0) setStage(4);
                      } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
                        e.preventDefault();
                        const r = compat[compatSel];
                        if (r) addTransfer(r);
                      }
                    }}
                    className="mt-1 min-h-0 flex-1 space-y-1.5 overflow-auto outline-none"
                  >
                    {compat.map((r, i) => (
                      <div
                        key={r.partId}
                        onClick={() => {
                          setCompatSel(i);
                          toggleLine(r);
                        }}
                        className={`flex cursor-pointer items-baseline justify-between gap-3 rounded-lg border-2 px-3 py-2 ${
                          i === compatSel
                            ? 'border-primary bg-primary/10'
                            : 'border-border/35 bg-secondary/40 hover:border-primary/45'
                        } ${lineIds.has(r.partId) ? 'ring-2 ring-[#22D88F]/60' : ''}`}
                      >
                        <span className="min-w-0">
                          <span className="font-mono text-[13.5px] font-semibold text-primary/90">{r.code}</span>
                          {lineIds.has(r.partId) ? <Check className="ml-1 inline size-3.5 text-[#22D88F]" /> : null}
                          <span className="ml-2 text-[13px]">{r.name}</span>
                          <span className="ml-2 text-[11.5px] text-muted-foreground">{r.brand ?? ''}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[13px] tabular-nums">
                          <span className={r.avail > 0 ? 'text-[#22D88F]' : 'text-destructive'}>{r.avail}</span>
                          {r.suggested ? <span className="ml-2 text-primary">建議 {formatNt(Number(r.suggested))}</span> : null}
                        </span>
                      </div>
                    ))}
                    {compat.length === 0 && currentPartId ? (
                      <div className="py-6 text-center text-[12px] text-muted-foreground">載入中…</div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {stage === 4 && (
              <div className="space-y-3">
                <div className={secHead}>報價清單（量↵價↵下一顆、末欄↵ → 發送訊息）</div>
                {stockWarn.length > 0 && (
                  <div className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-600">
                    ⚠️ {stockWarn.join('、')} 全公司無庫存、近一個月也沒問過同行——報了可能交不出來
                  </div>
                )}
                {lines.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    還沒選零件——回「檢查庫存」用 Space 加入（Alt+3）
                  </div>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left">料號／品名</th>
                        <th className="w-16 px-2 py-1.5 text-right">可出</th>
                        <th className="w-20 px-2 py-1.5 text-right">數量</th>
                        <th className="w-28 px-2 py-1.5 text-right">單價</th>
                        <th className="w-8 px-1 py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={l.partId} className={`border-b border-border/40 last:border-b-0 ${i === lineSel ? 'bg-primary/[0.06]' : ''}`}>
                          <td className="px-2 py-1.5">
                            <span className="font-mono text-xs text-muted-foreground">{l.code}</span>
                            <span className="ml-2">{l.name}</span>
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                            <span className={l.avail > 0 ? 'text-[#22D88F]' : 'text-destructive'}>{l.avail}</span>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              ref={(el) => {
                                qtyRefs.current[i] = el;
                              }}
                              type="number"
                              min="0"
                              value={l.qty}
                              onFocus={(e) => {
                                e.target.select();
                                setLineSel(i);
                              }}
                              onChange={(e) => setLines((p) => p.map((x, xi) => (xi === i ? { ...x, qty: e.target.value } : x)))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  priceRefs.current[i]?.focus();
                                }
                              }}
                              className={inputCls}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              ref={(el) => {
                                priceRefs.current[i] = el;
                              }}
                              type="number"
                              min="0"
                              step="0.01"
                              value={l.price}
                              onFocus={(e) => {
                                e.target.select();
                                setLineSel(i);
                              }}
                              onChange={(e) => setLines((p) => p.map((x, xi) => (xi === i ? { ...x, price: e.target.value } : x)))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const next = qtyRefs.current[i + 1];
                                  if (next) next.focus();
                                  else setStage(5);
                                }
                              }}
                              placeholder="留白＝不報"
                              className={`${inputCls} font-semibold`}
                            />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => setLines((p) => p.filter((_, xi) => xi !== i))}
                              className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                              aria-label="移除"
                            >
                              <X className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {stage === 5 && (
              <div
                className="space-y-3"
                onKeyDown={(e) => {
                  if (e.altKey && (e.key === 'a' || e.key === 'A')) {
                    e.preventDefault();
                    msgRef.current?.focus();
                    msgRef.current?.select();
                  }
                }}
              >
                <div className={secHead}>
                  給客戶的訊息（<kbd className="rounded border border-border/50 bg-muted/40 px-1 font-mono text-[10px]">Alt+A</kbd> 全選 → Ctrl+C；Enter 存檔）
                </div>
                <textarea
                  ref={msgRef}
                  readOnly
                  rows={Math.min(10, Math.max(3, copyText.split('\n').length + 1))}
                  value={copyText || '（沒有可發送的報價行——回「報價」填量價）'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && saved === null) {
                      e.preventDefault();
                      if (customer && validLines.length > 0) setConfirmOpen(true);
                    }
                  }}
                  className="w-full resize-y rounded-md border border-border bg-muted/20 px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground"
                />
                {!customer && saved === null ? (
                  <div className="space-y-2 rounded-lg border border-dashed border-border px-4 py-3">
                    <div className="text-[12px] text-muted-foreground">
                      散客：訊息可直接複製；<b className="text-foreground">要存報價紀錄請先補客戶</b>
                    </div>
                    <CustomerPicker onPick={setCustomer} onCommit={() => {}} />
                  </div>
                ) : null}
                {err ? <div className="text-xs text-destructive">{err}</div> : null}
                <div className="flex items-center justify-end gap-2">
                  {saved !== null ? (
                    <>
                      <span className="mr-auto text-sm text-[#22D88F]">✅ 已存 {saved} 筆報價紀錄</span>
                      <button type="button" onClick={resetForNextCall} className="rounded border px-4 py-1.5 text-sm">
                        下一通（回對象）
                      </button>
                      <button type="button" onClick={onClose} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
                        關閉
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(copyText)}
                        disabled={!copyText}
                        className="rounded border px-4 py-1.5 text-sm disabled:opacity-50"
                      >
                        複製訊息
                      </button>
                      <button
                        type="button"
                        disabled={busy || !customer || validLines.length === 0}
                        onClick={() => setConfirmOpen(true)}
                        className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                      >
                        存檔（Enter）
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* C 副容器 */}
          <aside className="flex min-h-0 flex-col overflow-auto bg-background/20 px-5 py-4">
            {stage === 1 && (
              <div className="space-y-2">
                <div className={secHead}>客戶基本資訊</div>
                {customer ? (
                  <div className="space-y-1.5 rounded-lg border border-border/40 bg-secondary/30 px-4 py-3">
                    {(
                      [
                        ['客編', customer.code, true],
                        ['名稱', customer.name, false],
                        ['地址', '—（結構化地址待接、v1）', false],
                        ['電話', partnerInfo ? (partnerInfo.phone ?? partnerInfo.mobile ?? '—') : '載入中…', false],
                        ['備註', partnerInfo ? (partnerInfo.remark ?? '—') : '載入中…', false],
                      ] as const
                    ).map(([label, value, mono]) => (
                      <div key={label} className="flex items-baseline gap-3 border-b border-border/25 pb-1.5 text-[13.5px] last:border-b-0 last:pb-0">
                        <span className="w-10 shrink-0 text-[12px] text-foreground/60">{label}</span>
                        <span className={`min-w-0 flex-1 break-words ${mono ? 'font-mono text-primary' : 'text-foreground/95'}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[12px] text-muted-foreground">左欄搜尋客戶、選定後這裡顯示基本資訊；散客可跳過</div>
                )}
              </div>
            )}

            {stage === 2 && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className={secHead}>搜尋結果（↑↓ 選、Enter 進檢查庫存）</div>
                <div
                  ref={resListRef}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (results.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setResSel((i) => Math.min(results.length - 1, i + 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setResSel((i) => Math.max(0, i - 1));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const r = results[resSel];
                      if (r) {
                        setCurrentPartId(r.id);
                        setStage(3);
                      }
                    }
                  }}
                  className="mt-1 min-h-0 flex-1 space-y-1 overflow-auto outline-none"
                >
                  {results.map((r, i) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setCurrentPartId(r.id);
                        setStage(3);
                      }}
                      className={`flex cursor-pointer items-baseline justify-between gap-2 rounded-md border px-3 py-1.5 text-[13px] ${
                        i === resSel ? 'border-primary bg-primary/10' : 'border-border/30 hover:border-primary/40'
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-primary/90">{r.code}</span>
                        <span className="ml-2">{r.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[12px] tabular-nums">
                        <span className={Number(r.availableTotal) > 0 ? 'text-[#22D88F]' : 'text-destructive'}>{Number(r.availableTotal)}</span>
                      </span>
                    </div>
                  ))}
                  {results.length === 0 ? <div className="py-6 text-center text-[12px] text-muted-foreground">左欄輸入條件、Enter 查詢</div> : null}
                </div>
              </div>
            )}

            {(stage === 3 || stage === 4) && (
              <div className="space-y-3">
                <div className={secHead}>{stage === 3 ? '庫存狀況（跟著選中件）' : '歷史價（跟著聚焦行）'}</div>
                {stage === 4 && customer && focusPartId ? (
                  <PriceIntelPanel customerId={customer.id} partId={focusPartId} />
                ) : null}
                {stage === 4 && !customer ? (
                  <div className="text-[12px] text-muted-foreground">散客——不帶歷史價（發送訊息前可補客戶）</div>
                ) : null}
                {stock ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {(
                        [
                          ['總可出', stock.company.available, '#22D88F'],
                          ['總庫存', stock.company.onHand, 'var(--foreground)'],
                          ['在途', stock.company.inTransit, '#FFB347'],
                        ] as const
                      ).map(([label, v, color]) => (
                        <div key={label} className="rounded-md border border-border/50 bg-secondary px-2 py-1.5">
                          <div className="text-[10.5px] text-foreground/60">{label}</div>
                          <div className="font-mono text-[17px] font-semibold" style={{ color: Number(v) === 0 ? '#5A5A60' : color }}>
                            {Number(v)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <table className="w-full border-collapse text-[12.5px]">
                      <tbody>
                        {stock.warehouses
                          .filter((w) => Number(w.onHand) > 0 || w.isPrimary)
                          .map((w) => (
                            <tr key={w.warehouseId} className="border-b border-border/15 last:border-b-0">
                              <td className="py-1 pr-2 font-mono text-primary/90">{w.warehouseCode}</td>
                              <td className="py-1 pr-2 text-muted-foreground">{w.warehouseName}</td>
                              <td className="py-1 text-right font-mono tabular-nums">
                                <span className={Number(w.available) > 0 ? 'text-[#22D88F]' : 'text-destructive'}>{Number(w.available)}</span>
                                <span className="text-muted-foreground/50"> / {Number(w.onHand)}</span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : stage === 3 ? (
                  <div className="text-[12px] text-muted-foreground">{focusPartId ? '載入中…' : '尚未選件'}</div>
                ) : null}
              </div>
            )}

            {stage === 5 && (
              <div className="space-y-3">
                <div className={secHead}>訊息內容設定（會記住）</div>
                {(
                  [
                    ['baseNo', '顯示基準料號'],
                    ['secCode', '顯示副廠料號（主件）'],
                    ['partName', '顯示品名'],
                    ['qtyAlways', '數量恆顯示（否則 >1 才顯示）'],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="flex cursor-pointer items-center gap-2 text-[13px]">
                    <input type="checkbox" checked={msgOpts[k]} onChange={(e) => setOpt({ [k]: e.target.checked })} className="accent-[#22D88F]" />
                    {label}
                  </label>
                ))}
                <div className="pt-2 text-[11px] text-muted-foreground/70">勾選即時反映在左側訊息；設定存在這台瀏覽器</div>
              </div>
            )}
          </aside>
        </div>

        {/* 存檔確認（Enter 確認 → 存 N 筆）*/}
        {confirmOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl">
              <h2 className="text-sm font-semibold">確認存檔</h2>
              <p className="text-sm text-muted-foreground">
                {customer ? `${customer.code} ${customer.name}` : '—'}
                <br />共 {validLines.length} 筆報價紀錄。
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmOpen(false)} className="rounded border px-4 py-1.5 text-sm">
                  返回
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  disabled={busy}
                  onClick={() => void save()}
                  className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                >
                  {busy ? '儲存中…' : '確認 (Enter)'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    </FocusLockedDialog>
  );
}
