// apps/nx-ui/src/features/nx04/sales-return/ui/InstantSalesReturnWorkspace.tsx
// F2 即時工作檯・站 5「即時銷退」——業務發起退貨/保固快速開單精靈
//
// 拍板（執行長 2026-07-19、五步重整版）：
//   · 五步＝客戶→零件→保固→退貨→訊息（原確認步併入退貨步）
//   · 零件步每行選「方式」：退貨 or 保固（零件主檔退貨政策 W=保固期內可退 → 預設保固）
//   · 保固行不退款、不進銷退單——開保固申請單（客訴型連原單）等供應商審核（換新/退錢/維修/駁回）
//   · 保固步收：車號/故障碼（⚠️ 執行長「先保留」＝選填、暫塞問題描述模板、不動 schema）、
//     問題描述必填、附件必附照片或影片 ≥1、行照選填（可事後到保固單補）
//   · 保固供應商：自動帶該料最近進貨（RR）供應商、可換手選
//   · 退貨行送出→銷退單直轉「檢驗中」（待驗收池、倉管驗完過帳或作廢）
//   · 訊息步：本次送出即時訊息＋「近期退貨單追蹤」（倉管驗收結果→生成回覆客戶文字）
// 範式對齊站 4：FocusLockedDialog、Alt+1~5 跳步、關窗/切站守衛、主動作鈕掛載聚焦。
'use client';

import { MessageSquareText, ShieldCheck, Truck, Undo2, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { listReturnableSoLines } from '@data/endpoints/nx04/so/api/so';
import { createSr, listSr, updateSr } from '@data/endpoints/nx04/sales-return/api/sales-return';
import {
  createAttachment,
  createWarrantyClaim,
  submitWarrantyClaim,
  suggestWarrantySupplier,
} from '@data/endpoints/nx03/warranty-claim/api/warranty-claim';
import type { Sr } from '@data/types/nx04/sales-return';
import type { ReturnableSo, ReturnableSoLine } from '@data/types/nx04/so';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from '@/features/nx04/quote/ui/CustomerPicker';
import { PillGroup } from '@/features/nx04/sales/ui/InstantSalesWorkspace';
import { registerStationDirtyChecker } from '@/features/shared/instant-workbench/station-registry';

type SrStage = 1 | 2 | 3 | 4 | 5;

const STAGE_DEFS: { n: SrStage; label: string; icon: ReactNode; hint: string }[] = [
  { n: 1, label: '客戶', icon: <UserRound size={18} />, hint: '選擇客戶' },
  { n: 2, label: '零件', icon: <Undo2 size={18} />, hint: '挑原單・退量・方式（退貨/保固）・原因' },
  { n: 3, label: '保固', icon: <ShieldCheck size={18} />, hint: '保固件文件：車號/故障碼/描述/照片影片' },
  { n: 4, label: '退貨', icon: <Truck size={18} />, hint: '取件方式・覆核送出' },
  { n: 5, label: '訊息', icon: <MessageSquareText size={18} />, hint: '結果訊息・倉管驗收追蹤' },
];

/** 行方式：一般退貨（銷退退款）/ 保固（開保固申請、不退款等審核） */
const LINE_MODES: { v: 'RETURN' | 'WARRANTY'; label: string }[] = [
  { v: 'RETURN', label: '退貨' },
  { v: 'WARRANTY', label: '保固' },
];

/** 退貨原因（schema returnReason 值域；退貨行用） */
const RETURN_REASONS: { v: string; label: string }[] = [
  { v: 'C', label: '客戶不需要' },
  { v: 'D', label: '商品有瑕疵' },
  { v: 'W', label: '送錯料號' },
  { v: 'Q', label: '送錯數量' },
  { v: 'O', label: '其他' },
];
const reasonLabel = (v: string) => RETURN_REASONS.find((r) => r.v === v)?.label ?? v;

/** 取件方式（schema returnMethod 值域；預設外務取回＝恆迎常態） */
const RETURN_METHODS: { v: string; label: string }[] = [
  { v: 'C', label: '外務取回' },
  { v: 'S', label: '客戶自送回' },
  { v: 'P', label: '客戶寄回' },
];
const methodLabel = (v: string) => RETURN_METHODS.find((m) => m.v === v)?.label ?? v;
const METHOD_MSG: Record<string, string> = {
  C: '外務將安排取回',
  S: '再麻煩將商品送回門市/倉庫',
  P: '再麻煩打包寄回（寄送方式另洽）',
};

/** 退貨政策標籤（part.returnPolicy 快照） */
const POLICY_LABEL: Record<string, string> = { F: '自由退', S: '標準', R: '限制', N: '不可退', W: '保固' };

/** 銷退單狀態 → 顯示＋回覆訊息模板（訊息步追蹤用） */
const SR_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  INSPECTING: '驗收中',
  POSTED: '已退款',
  REJECTED: '已退件',
  CANCELLED: '已作廢',
};

const nf = new Intl.NumberFormat('zh-TW');
const money = (n: number) => `$${nf.format(Math.round(n))}`;
const soStatusLabel = (s: string) => (s === 'SHIPPED' ? '已出貨' : s === 'INVOICED' ? '已開票' : s);

/** 已勾的行草稿 */
type RetLine = {
  soItemId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  unitPrice: number;
  maxQty: number;
  qty: number;
  /** 方式：退貨（銷退）/ 保固（保固申請） */
  mode: 'RETURN' | 'WARRANTY';
  returnReason: string;
  returnPolicy: string;
  concessionReason: string;
};

/** 保固行的文件草稿（車號/故障碼「先保留」＝選填、塞問題描述模板、不動 schema） */
type WarrantyDraft = {
  plateNo: string;
  faultCode: string;
  description: string;
  /** 照片/影片（必附 ≥1；PHO/VID 依 mime 判） */
  media: File[];
  /** 行照（選填、可事後到保固單補） */
  lic: File | null;
  supplier: { id: string; code: string; name: string; source: string } | null;
  supplierLoading: boolean;
};

const emptyWarrantyDraft = (): WarrantyDraft => ({
  plateNo: '',
  faultCode: '',
  description: '',
  media: [],
  lic: null,
  supplier: null,
  supplierLoading: true,
});

type SrResult = {
  srDocNo: string | null;
  srInspectOk: boolean;
  srTotal: number;
  claims: { docNo: string; partNo: string }[];
  errors: string[];
};

/** File → base64（去 data URL prefix、對齊保固附件 base64 範式） */
function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

/** 送出後的即時客戶訊息 */
function buildSubmitMessage(
  customerName: string,
  result: SrResult,
  lines: RetLine[],
  method: string,
): string {
  const parts: string[] = [`【${customerName}】退貨受理`];
  if (result.srDocNo) {
    parts.push(`退貨單 ${result.srDocNo}（待驗收）：`);
    lines
      .filter((l) => l.mode === 'RETURN')
      .forEach((l) => parts.push(`・${l.partNo} ${l.partName} ×${nf.format(l.qty)}（${reasonLabel(l.returnReason)}）`));
    parts.push(`退款合計（含稅）${money(result.srTotal)}——倉庫驗收完成後退款/折讓`);
  }
  if (result.claims.length) {
    parts.push(`保固申請（待供應商審核、結果另行通知）：`);
    result.claims.forEach((c) => parts.push(`・${c.partNo}　${c.docNo}`));
  }
  parts.push(METHOD_MSG[method] ?? '');
  return parts.filter(Boolean).join('\n');
}

/** 追蹤列 → 回覆客戶訊息（倉管驗收結果） */
function buildTrackMessage(customerName: string, sr: Sr): string {
  const head = `【${customerName}】退貨單 ${sr.docNo}`;
  switch (sr.status) {
    case 'INSPECTING':
      return `${head}\n已收到您的退貨申請、倉庫驗收中，完成後通知您。`;
    case 'POSTED':
      return `${head}\n驗收完成✓　退款/折讓 ${money(Number(sr.totalAmount))} 已入帳，感謝您的配合。`;
    case 'CANCELLED':
      return `${head}\n很抱歉、退貨驗收未通過，此次退貨已取消——詳情請與業務聯繫。`;
    case 'REJECTED':
      return `${head}\n退貨未核准${sr.rejectReason ? `（${sr.rejectReason}）` : ''}——詳情請與業務聯繫。`;
    default:
      return `${head}\n狀態：${SR_STATUS_LABEL[sr.status] ?? sr.status}`;
  }
}

/** 對外：受控元件，殼以 open/onClosed 掛載（比照站 4 切走即關） */
export function InstantSalesReturnWorkspace({ open, onClosed }: { open: boolean; onClosed: () => void }) {
  if (!open) return null;
  return <InstantSrDialog onClose={onClosed} />;
}

function InstantSrDialog({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<SrStage>(1);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [sos, setSos] = useState<ReturnableSo[]>([]);
  const [sosLoading, setSosLoading] = useState(false);
  const [selectedSoId, setSelectedSoId] = useState<string | null>(null);
  const [retLines, setRetLines] = useState<RetLine[]>([]);
  const [warranty, setWarranty] = useState<Record<string, WarrantyDraft>>({});
  const [returnMethod, setReturnMethod] = useState('C');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SrResult | null>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);

  const selectedSo = sos.find((s) => s.soId === selectedSoId) ?? null;
  const taxRate = selectedSo ? Number(selectedSo.taxRate) : 5;
  const returnLines = retLines.filter((l) => l.mode === 'RETURN');
  const warrantyLines = retLines.filter((l) => l.mode === 'WARRANTY');
  const subtotal = returnLines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + taxAmount;

  // 選客戶 → 抓可退貨原單清單；換不同客戶 → 全部歸零
  const pickedIdRef = useRef<string | null>(null);
  const handlePickCustomer = useCallback((c: PickedCustomer) => {
    if (pickedIdRef.current !== null && pickedIdRef.current !== c.id) {
      setSelectedSoId(null);
      setRetLines([]);
      setWarranty({});
    }
    pickedIdRef.current = c.id;
    setCustomer(c);
    setSosLoading(true);
    listReturnableSoLines(c.id)
      .then((rows) => setSos(rows))
      .catch(() => setSos([]))
      .finally(() => setSosLoading(false));
  }, []);

  // 換原單（一張銷退/保固鏈綁一張原單）：已勾行 → 先確認再清
  const selectSo = useCallback(
    (soId: string) => {
      if (soId === selectedSoId) return;
      if (retLines.length > 0 && !window.confirm('換原單會清掉已勾的行——確定切換？')) return;
      setSelectedSoId(soId);
      setRetLines([]);
      setWarranty({});
    },
    [selectedSoId, retLines.length],
  );

  // 保固行草稿初始化＋建議供應商（最近進貨 RR、查無留 null 手選）
  const ensureWarrantyDraft = useCallback((soItemId: string, partId: string) => {
    setWarranty((prev) => {
      if (prev[soItemId]) return prev;
      return { ...prev, [soItemId]: emptyWarrantyDraft() };
    });
    suggestWarrantySupplier(partId)
      .then((s) => {
        setWarranty((prev) => {
          const d = prev[soItemId];
          if (!d) return prev;
          return {
            ...prev,
            [soItemId]: {
              ...d,
              supplierLoading: false,
              supplier:
                d.supplier ??
                (s ? { id: s.supplierId, code: s.supplierCode, name: s.supplierName, source: s.sourceRrDocNo } : null),
            },
          };
        });
      })
      .catch(() => {
        setWarranty((prev) =>
          prev[soItemId] ? { ...prev, [soItemId]: { ...prev[soItemId], supplierLoading: false } } : prev,
        );
      });
  }, []);

  const upsertLine = useCallback(
    (line: RetLine) => {
      setRetLines((prev) => {
        const idx = prev.findIndex((l) => l.soItemId === line.soItemId);
        if (idx === -1) return [...prev, line];
        const next = [...prev];
        next[idx] = line;
        return next;
      });
      if (line.mode === 'WARRANTY') ensureWarrantyDraft(line.soItemId, line.partId);
      else
        setWarranty((prev) => {
          if (!prev[line.soItemId]) return prev;
          const rest = { ...prev };
          delete rest[line.soItemId];
          return rest;
        });
    },
    [ensureWarrantyDraft],
  );
  const removeLine = useCallback((soItemId: string) => {
    setRetLines((prev) => prev.filter((l) => l.soItemId !== soItemId));
    setWarranty((prev) => {
      if (!prev[soItemId]) return prev;
      const rest = { ...prev };
      delete rest[soItemId];
      return rest;
    });
  }, []);
  const patchWarranty = useCallback((soItemId: string, patch: Partial<WarrantyDraft>) => {
    setWarranty((prev) => (prev[soItemId] ? { ...prev, [soItemId]: { ...prev[soItemId], ...patch } } : prev));
  }, []);

  /** 保固步完整性檢查：描述必填、照片/影片 ≥1、供應商必選（車號/故障碼選填——執行長「先保留」） */
  const warrantyIssues = warrantyLines
    .map((l) => {
      const d = warranty[l.soItemId];
      const miss: string[] = [];
      if (!d) return { line: l, miss: ['保固資料未填'] };
      if (!d.description.trim()) miss.push('問題描述');
      if (d.media.length === 0) miss.push('照片或影片');
      if (!d.supplier) miss.push('供應商');
      return { line: l, miss };
    })
    .filter((x) => x.miss.length > 0);

  // 送出：退貨行→銷退單(轉檢驗中)；保固行→逐行建保固申請＋附件＋送出
  const submit = useCallback(async () => {
    if (!selectedSo || retLines.length === 0 || submitting || result) return;
    if (warrantyIssues.length > 0) {
      setSubmitError(`保固件資料不完整（${warrantyIssues.map((x) => x.line.partNo).join('、')}）——回步驟 3 補齊`);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const errors: string[] = [];
    try {
      // 1) 退貨行 → 銷退單（單一 POST 原子）→ 轉檢驗中
      let srDocNo: string | null = null;
      let srInspectOk = true;
      if (returnLines.length > 0) {
        const sr = await createSr({
          soId: selectedSo.soId,
          srDate: new Date().toISOString().slice(0, 10),
          returnMethod,
          initiationType: 'A',
          taxRate,
          remark: remark.trim() || undefined,
          items: returnLines.map((l) => ({
            soItemId: l.soItemId,
            qty: l.qty,
            returnReason: l.returnReason,
            ...(l.returnPolicy === 'N' ? { returnType: 'E', concessionReason: l.concessionReason } : {}),
          })),
        });
        srDocNo = sr.docNo;
        try {
          await updateSr(sr.id, { status: 'INSPECTING' });
        } catch {
          srInspectOk = false;
        }
      }
      // 2) 保固行 → 逐行建保固申請（客訴型連原單）＋附件（先建單拿 id 再傳檔）＋送出
      const claims: { docNo: string; partNo: string }[] = [];
      for (const l of warrantyLines) {
        const d = warranty[l.soItemId]!;
        try {
          const desc = [
            `【站5即時銷退】原單 ${selectedSo.docNo}`,
            `車號：${d.plateNo.trim() || '—'}｜故障碼：${d.faultCode.trim() || '—'}`,
            d.description.trim(),
          ]
            .join('\n')
            .slice(0, 1000);
          const claim = await createWarrantyClaim({
            claimType: 'CUST',
            sourceSoId: selectedSo.soId,
            sourceSoNo: selectedSo.docNo,
            supplierId: d.supplier!.id,
            partId: l.partId,
            qty: l.qty,
            claimDate: new Date().toISOString().slice(0, 10),
            issueDescription: desc,
            remark: `取件方式：${methodLabel(returnMethod)}`,
          });
          for (const f of [...d.media, ...(d.lic ? [d.lic] : [])]) {
            try {
              await createAttachment(claim.id, {
                fileType: f === d.lic ? 'LIC' : f.type.startsWith('video/') ? 'VID' : 'PHO',
                base64Content: await fileToBase64(f),
                origFilename: f.name,
                mimeType: f.type || 'application/octet-stream',
              });
            } catch {
              errors.push(`${l.partNo} 附件「${f.name}」上傳失敗（保固單 ${claim.docNo} 建立成功、請到保固單補傳）`);
            }
          }
          try {
            await submitWarrantyClaim(claim.id);
          } catch {
            errors.push(`${l.partNo} 保固單 ${claim.docNo} 送出失敗（停留草稿、請到保固單手動送出）`);
          }
          claims.push({ docNo: claim.docNo, partNo: l.partNo });
        } catch (e) {
          errors.push(`${l.partNo} 保固申請建立失敗：${e instanceof Error ? e.message : '未知錯誤'}`);
        }
      }
      if (!srDocNo && claims.length === 0) {
        setSubmitError(errors.join('；') || '送出失敗');
        return;
      }
      setResult({ srDocNo, srInspectOk, srTotal: total, claims, errors });
      setStage(5);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '送出失敗');
    } finally {
      setSubmitting(false);
    }
  }, [selectedSo, retLines, returnLines, warrantyLines, warranty, warrantyIssues, submitting, result, returnMethod, taxRate, remark, total]);

  // Alt+1~5 跳步（比照站 4）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        e.preventDefault();
        e.stopPropagation();
        setStage(n as SrStage);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, []);

  // 關窗/切站守衛
  const dirtyRef = useRef(false);
  dirtyRef.current = !result && (customer !== null || retLines.length > 0);
  useEffect(() => registerStationDirtyChecker(5, () => dirtyRef.current), []);
  const guardedClose = useCallback(() => {
    if (dirtyRef.current && !window.confirm('退貨還沒送出、關閉會清空已填內容——確定關閉？')) return;
    onClose();
  }, [onClose]);

  const cur = STAGE_DEFS.find((s) => s.n === stage)!;

  return (
    <FocusLockedDialog
      open
      onClose={guardedClose}
      ariaLabel="即時銷退"
      initialFocusRef={customerInputRef}
      backdropClassName="bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: 'min(1080px, 96vw)', height: 'min(680px, 92vh)' }}
    >
      {/* header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
        <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
        <h2 className="text-sm font-bold tracking-wide">即時銷退</h2>
        <span className="text-[11px] text-muted-foreground">・業務發起退貨/保固開單</span>
        {customer ? (
          <span className="ml-3 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {customer.code}　{customer.name}
          </span>
        ) : null}
        <kbd className="ml-auto rounded border border-border/60 bg-background/60 px-1.5 font-mono text-[10px] text-muted-foreground">
          F2
        </kbd>
        <button
          type="button"
          onClick={guardedClose}
          aria-label="關閉"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* body：52px 流程軌 | 主區 | 副區 */}
      <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(360px,1.15fr)_minmax(300px,1fr)]">
        <nav className="relative flex flex-col items-center justify-evenly border-r border-border/40 py-6">
          <span aria-hidden className="absolute bottom-12 left-1/2 top-12 w-[2px] -translate-x-1/2 bg-border/70" />
          {STAGE_DEFS.map((s) => {
            const active = s.n === stage;
            const done = s.n < stage;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => setStage(s.n)}
                title={`${s.label}（Alt+${s.n}）`}
                className={
                  active
                    ? 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(2,237,171,0.35)]'
                    : done
                      ? 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-primary/50 bg-primary/8 text-primary/70 hover:text-primary'
                      : 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-border/60 bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }
              >
                {s.icon}
                <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border border-border/60 bg-background font-mono text-[9px] text-muted-foreground">
                  {s.n}
                </span>
              </button>
            );
          })}
        </nav>

        <section className="flex min-h-0 flex-col overflow-hidden p-5">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-base font-bold">
              {cur.n}. {cur.label}
            </span>
            <span className="text-[12px] text-muted-foreground">{cur.hint}</span>
          </div>

          {stage === 1 ? (
            <CustomerStep customer={customer} inputRef={customerInputRef} onPick={handlePickCustomer} onNext={() => setStage(2)} />
          ) : stage === 2 ? (
            <PartsStep
              customer={customer}
              sos={sos}
              loading={sosLoading}
              selectedSo={selectedSo}
              onSelectSo={selectSo}
              retLines={retLines}
              upsertLine={upsertLine}
              removeLine={removeLine}
              onNext={() => setStage(warrantyLines.length > 0 ? 3 : 4)}
            />
          ) : stage === 3 ? (
            <WarrantyStep
              warrantyLines={warrantyLines}
              warranty={warranty}
              patchWarranty={patchWarranty}
              issues={warrantyIssues}
              onNext={() => setStage(4)}
            />
          ) : stage === 4 ? (
            <ReturnStep
              returnMethod={returnMethod}
              setReturnMethod={setReturnMethod}
              remark={remark}
              setRemark={setRemark}
              selectedSo={selectedSo}
              returnLines={returnLines}
              warrantyLines={warrantyLines}
              total={total}
              submitting={submitting}
              submitError={submitError}
              onSubmit={() => void submit()}
            />
          ) : (
            <MessageStep customer={customer} retLines={retLines} result={result} returnMethod={returnMethod} onClose={onClose} />
          )}
        </section>

        {/* 副區：摘要 */}
        <aside className="flex min-h-0 flex-col overflow-auto border-l border-border/40 p-5">
          <div className="mb-3 text-[12px] font-bold text-muted-foreground">本次摘要</div>
          <div className="rounded-xl border border-border/40 p-3 text-[13px]">
            <div>
              <span className="text-muted-foreground">客戶　</span>
              {customer ? `${customer.code}　${customer.name}` : <span className="text-muted-foreground">未選</span>}
            </div>
            <div className="mt-1">
              <span className="text-muted-foreground">原單　</span>
              {selectedSo ? selectedSo.docNo : <span className="text-muted-foreground">未選</span>}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-border/40 p-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">退貨行</span>
              <span className="tabular-nums">{returnLines.length}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">退款小計</span>
              <span className="tabular-nums">{money(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">稅額（{taxRate}%）</span>
              <span className="tabular-nums">{money(taxAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border/40 pt-1 font-bold">
              <span>退款合計</span>
              <span className="tabular-nums text-primary">{money(total)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border/40 pt-1">
              <span className="text-muted-foreground">保固行（不退款）</span>
              <span className="tabular-nums">{warrantyLines.length}</span>
            </div>
          </div>
          {retLines.length ? (
            <div className="mt-3 flex flex-col gap-1 text-[12px]">
              {retLines.map((l) => (
                <div key={l.soItemId} className="flex justify-between gap-2">
                  <span className="truncate">
                    {l.mode === 'WARRANTY' ? <span className="mr-1 text-amber-600">保</span> : null}
                    {l.partNo}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    ×{nf.format(l.qty)}
                    {l.mode === 'RETURN' ? `・${reasonLabel(l.returnReason)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>

      <div className="border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
        Alt+1~5 跳步・Enter 下一步・Esc 關閉
      </div>
    </FocusLockedDialog>
  );
}

/** 步驟 1：客戶 */
function CustomerStep({
  customer,
  inputRef,
  onPick,
  onNext,
}: {
  customer: PickedCustomer | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (c: PickedCustomer) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <CustomerPicker onPick={onPick} onCommit={onNext} inputRef={inputRef} />
      {customer ? (
        <div className="rounded-xl border border-primary/40 bg-primary/8 p-3 text-sm">
          已選客戶　<span className="font-bold">{customer.code}　{customer.name}</span>
          <div className="mt-1 text-[12px] text-muted-foreground">Enter 下一步：挑原銷貨單勾要退/保固的零件。</div>
        </div>
      ) : (
        <div className="text-[12px] text-muted-foreground">輸入客戶編號或名稱搜尋（Alt+Z 注音首碼）。</div>
      )}
      <div className="mt-auto flex justify-end">
        <button
          type="button"
          disabled={!customer}
          onClick={onNext}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          下一步：零件 →
        </button>
      </div>
    </div>
  );
}

/** 行內編輯草稿 */
type EditDraft = {
  line: ReturnableSoLine;
  qty: string;
  mode: 'RETURN' | 'WARRANTY';
  reason: string;
  concession: string;
};

/** 步驟 2：挑原單＋勾行（退量→方式（退貨/保固）→退貨行選原因） */
function PartsStep({
  customer,
  sos,
  loading,
  selectedSo,
  onSelectSo,
  retLines,
  upsertLine,
  removeLine,
  onNext,
}: {
  customer: PickedCustomer | null;
  sos: ReturnableSo[];
  loading: boolean;
  selectedSo: ReturnableSo | null;
  onSelectSo: (soId: string) => void;
  retLines: RetLine[];
  upsertLine: (l: RetLine) => void;
  removeLine: (soItemId: string) => void;
  onNext: () => void;
}) {
  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const modeGroupRef = useRef<HTMLDivElement>(null);
  const reasonGroupRef = useRef<HTMLDivElement>(null);
  const concessionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => listRef.current?.querySelector<HTMLElement>('button[data-row]')?.focus());
  }, [selectedSo?.soId]);
  useEffect(() => {
    if (edit) queueMicrotask(() => qtyRef.current?.focus());
  }, [edit?.line.soItemId]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveRow = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if ((e.target as HTMLElement).closest('[data-sr-editor]')) return;
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>('button[data-row]') ?? []);
    if (!rows.length) return;
    e.preventDefault();
    const idx = rows.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? Math.min(rows.length - 1, idx + 1) : Math.max(0, idx - 1);
    rows[next >= 0 ? next : 0]?.focus();
  };

  const openEditor = (line: ReturnableSoLine) => {
    const exist = retLines.find((l) => l.soItemId === line.soItemId);
    const max = Number(line.returnableQty);
    setEditErr(null);
    setEdit({
      line,
      qty: String(exist?.qty ?? max),
      // 零件主檔退貨政策 W=保固期內可退 → 預設保固
      mode: exist?.mode ?? (line.returnPolicy === 'W' ? 'WARRANTY' : 'RETURN'),
      reason: exist?.returnReason ?? 'C',
      concession: exist?.concessionReason ?? '',
    });
  };

  const commitEditor = () => {
    if (!edit) return;
    const max = Number(edit.line.returnableQty);
    const q = Number(edit.qty);
    if (!(q > 0) || q > max) {
      setEditErr(`數量需介於 1 ~ ${nf.format(max)}（可退量）`);
      qtyRef.current?.focus();
      return;
    }
    if (edit.mode === 'RETURN' && edit.line.returnPolicy === 'N' && !edit.concession.trim()) {
      setEditErr('不可退品項走業務通融、通融原因必填');
      concessionRef.current?.focus();
      return;
    }
    upsertLine({
      soItemId: edit.line.soItemId,
      lineNo: edit.line.lineNo,
      partId: edit.line.partId,
      partNo: edit.line.partNo,
      partName: edit.line.partName,
      unitPrice: Number(edit.line.unitPrice),
      maxQty: max,
      qty: q,
      mode: edit.mode,
      returnReason: edit.reason,
      returnPolicy: edit.line.returnPolicy,
      concessionReason: edit.concession.trim(),
    });
    setEdit(null);
  };

  if (!customer) {
    return <div className="grid flex-1 place-items-center text-sm text-muted-foreground">先回步驟 1 選客戶（Alt+1）。</div>;
  }
  if (loading) {
    return <div className="grid flex-1 place-items-center text-sm text-muted-foreground">載入可退貨原單…</div>;
  }

  if (!selectedSo) {
    const withReturnable = sos.filter((s) => s.items.some((i) => Number(i.returnableQty) > 0));
    if (!withReturnable.length) {
      return (
        <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
          此客戶近 20 張已出貨/已開票銷貨單都沒有可退量。
        </div>
      );
    }
    return (
      <div ref={listRef} onKeyDown={moveRow} className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
        <div className="mb-1 text-[12px] text-muted-foreground">↑↓ 選原銷貨單、Enter 進入勾行（近 20 張、僅列有可退量的單）。</div>
        {withReturnable.map((s) => (
          <button
            key={s.soId}
            type="button"
            data-row
            onClick={() => onSelectSo(s.soId)}
            className="flex items-center gap-3 rounded-xl border border-border/50 px-3 py-2.5 text-left text-sm hover:border-primary/40 focus:border-primary/60 focus:bg-primary/8 focus:outline-none"
          >
            <span className="font-mono text-[13px]">{s.docNo}</span>
            <span className="text-[12px] text-muted-foreground">{String(s.soDate).slice(0, 10)}</span>
            <span className="rounded bg-muted/60 px-1.5 text-[10px] text-muted-foreground">{soStatusLabel(s.status)}</span>
            <span className="ml-auto text-[12px] text-muted-foreground">
              可退 {s.items.filter((i) => Number(i.returnableQty) > 0).length} 行
            </span>
            <span className="tabular-nums text-[13px]">{money(Number(s.totalAmount))}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2 text-[12px]">
        <span className="text-muted-foreground">原單</span>
        <span className="font-mono font-bold">{selectedSo.docNo}</span>
        <span className="text-muted-foreground">{String(selectedSo.soDate).slice(0, 10)}</span>
        <button
          type="button"
          onClick={() => onSelectSo('')}
          className="ml-auto rounded-lg border border-border/60 px-2 py-0.5 text-[12px] hover:bg-muted/40"
        >
          ← 換原單
        </button>
      </div>
      <div ref={listRef} onKeyDown={moveRow} className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/40">
        {selectedSo.items.map((i) => {
          const max = Number(i.returnableQty);
          const picked = retLines.find((l) => l.soItemId === i.soItemId);
          const disabled = max <= 0;
          return (
            <div key={i.soItemId} className="border-b border-border/30 last:border-b-0">
              <button
                type="button"
                data-row={disabled ? undefined : ''}
                disabled={disabled}
                onClick={() => openEditor(i)}
                onKeyDown={(e) => {
                  if ((e.key === 'Delete' || e.key === 'Backspace') && picked) {
                    e.preventDefault();
                    removeLine(i.soItemId);
                  }
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm focus:bg-primary/8 focus:outline-none ${disabled ? 'opacity-45' : 'hover:bg-muted/30'}`}
              >
                <span className="w-32 shrink-0 font-mono text-[13px]">{i.partNo}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{i.partName}</span>
                {i.returnPolicy !== 'F' && i.returnPolicy !== 'S' ? (
                  <span
                    className={`shrink-0 rounded px-1.5 text-[10px] ${i.returnPolicy === 'N' ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-600'}`}
                  >
                    {POLICY_LABEL[i.returnPolicy] ?? i.returnPolicy}
                  </span>
                ) : null}
                <span className="shrink-0 tabular-nums text-[12px] text-muted-foreground">
                  出{nf.format(Number(i.qty))}
                  {Number(i.returnedQty) > 0 ? `・已退${nf.format(Number(i.returnedQty))}` : ''}・可退{nf.format(max)}
                </span>
                <span className="w-20 shrink-0 text-right tabular-nums text-[13px]">{money(Number(i.unitPrice))}</span>
                {picked ? (
                  <span
                    className={`shrink-0 rounded px-1.5 text-[11px] font-bold ${picked.mode === 'WARRANTY' ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/15 text-primary'}`}
                  >
                    {picked.mode === 'WARRANTY' ? '保' : '退'}
                    {nf.format(picked.qty)}
                  </span>
                ) : null}
              </button>
              {edit?.line.soItemId === i.soItemId ? (
                <div data-sr-editor className="flex flex-wrap items-center gap-3 border-t border-dashed border-border/40 bg-muted/20 px-3 py-2">
                  <label className="flex items-center gap-1.5 text-[12px]">
                    數量
                    <input
                      ref={qtyRef}
                      value={edit.qty}
                      onChange={(e) => setEdit({ ...edit, qty: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          modeGroupRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setEdit(null);
                        }
                      }}
                      inputMode="numeric"
                      className="w-16 rounded border border-border/60 bg-background px-2 py-1 text-right text-sm"
                    />
                    <span className="text-muted-foreground">/ {nf.format(Number(edit.line.returnableQty))}</span>
                  </label>
                  <div
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        setEdit(null);
                      }
                    }}
                  >
                    <PillGroup
                      label=""
                      options={LINE_MODES.map((m) => ({ v: m.v, label: m.label }))}
                      value={edit.mode}
                      onChange={(v) => setEdit({ ...edit, mode: v })}
                      containerRef={modeGroupRef}
                      defaultValue={edit.line.returnPolicy === 'W' ? 'WARRANTY' : undefined}
                      onEnter={() => {
                        if (edit.mode === 'WARRANTY') commitEditor();
                        else reasonGroupRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
                      }}
                    />
                  </div>
                  {edit.mode === 'RETURN' ? (
                    <div
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setEdit(null);
                        }
                      }}
                    >
                      <PillGroup
                        label=""
                        options={RETURN_REASONS}
                        value={edit.reason}
                        onChange={(v) => setEdit({ ...edit, reason: v })}
                        containerRef={reasonGroupRef}
                        onEnter={() => {
                          if (edit.line.returnPolicy === 'N') concessionRef.current?.focus();
                          else commitEditor();
                        }}
                      />
                    </div>
                  ) : (
                    <span className="text-[11px] text-amber-600">保固：文件在步驟 3 填（車號/故障碼/描述/照片）</span>
                  )}
                  {edit.mode === 'RETURN' && edit.line.returnPolicy === 'N' ? (
                    <label className="flex min-w-[220px] flex-1 items-center gap-1.5 text-[12px]">
                      通融原因
                      <input
                        ref={concessionRef}
                        value={edit.concession}
                        onChange={(e) => setEdit({ ...edit, concession: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitEditor();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            setEdit(null);
                          }
                        }}
                        maxLength={200}
                        placeholder="不可退品項、寫清楚為何通融"
                        className="flex-1 rounded border border-border/60 bg-background px-2 py-1 text-sm"
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    onClick={commitEditor}
                    className="rounded-lg bg-primary px-3 py-1 text-[12px] font-bold text-primary-foreground"
                  >
                    確定
                  </button>
                  {retLines.some((l) => l.soItemId === i.soItemId) ? (
                    <button
                      type="button"
                      onClick={() => {
                        removeLine(i.soItemId);
                        setEdit(null);
                      }}
                      className="rounded-lg border border-destructive/50 px-2.5 py-1 text-[12px] text-destructive hover:bg-destructive/10"
                    >
                      移除
                    </button>
                  ) : null}
                  {editErr ? <span className="text-[11px] text-destructive">{editErr}</span> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-3">
        <span className="text-[11px] text-muted-foreground">
          Enter 勾行/改行・Delete 移除・已勾 {retLines.length} 行
        </span>
        <button
          type="button"
          disabled={retLines.length === 0}
          onClick={onNext}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          下一步 →
        </button>
      </div>
    </div>
  );
}

/** 步驟 3：保固文件（每個保固行一張卡：供應商/車號/故障碼/描述/附件） */
function WarrantyStep({
  warrantyLines,
  warranty,
  patchWarranty,
  issues,
  onNext,
}: {
  warrantyLines: RetLine[];
  warranty: Record<string, WarrantyDraft>;
  patchWarranty: (soItemId: string, patch: Partial<WarrantyDraft>) => void;
  issues: { line: RetLine; miss: string[] }[];
  onNext: () => void;
}) {
  const [pickingSupplierFor, setPickingSupplierFor] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  // 掛載聚焦：有保固卡 → 第一張卡的車號；無 → 下一步鈕（焦點不落 body）
  useEffect(() => {
    queueMicrotask(() => (warrantyLines.length ? firstInputRef.current : nextRef.current)?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (warrantyLines.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
          本次沒有保固件——直接下一步。
        </div>
        <div className="flex justify-end">
          <button
            ref={nextRef}
            type="button"
            onClick={onNext}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            下一步：退貨 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-auto pr-1">
        {warrantyLines.map((l, li) => {
          const d = warranty[l.soItemId];
          if (!d) return null;
          const miss = issues.find((x) => x.line.soItemId === l.soItemId)?.miss ?? [];
          return (
            <div key={l.soItemId} className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded bg-amber-500/15 px-1.5 text-[11px] font-bold text-amber-600">保固</span>
                <span className="font-mono font-bold">{l.partNo}</span>
                <span className="min-w-0 flex-1 truncate">{l.partName}</span>
                <span className="tabular-nums text-[12px] text-muted-foreground">×{nf.format(l.qty)}</span>
              </div>

              {/* 供應商（自動帶最近進貨、可換） */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="text-muted-foreground">申請對象</span>
                {d.supplierLoading ? (
                  <span className="text-muted-foreground">查最近進貨供應商…</span>
                ) : d.supplier ? (
                  <span className="rounded bg-muted/50 px-1.5 py-0.5">
                    <span className="font-mono">{d.supplier.code}</span>　{d.supplier.name}
                    {d.supplier.source ? (
                      <span className="ml-1 text-[10px] text-muted-foreground">（最近進貨 {d.supplier.source}）</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-destructive">查無進貨紀錄、請手選供應商</span>
                )}
                <button
                  type="button"
                  onClick={() => setPickingSupplierFor(pickingSupplierFor === l.soItemId ? null : l.soItemId)}
                  className="rounded border border-border/60 px-1.5 py-0.5 text-[11px] hover:bg-muted/40"
                >
                  {pickingSupplierFor === l.soItemId ? '收起' : d.supplier ? '換' : '選供應商'}
                </button>
              </div>
              {pickingSupplierFor === l.soItemId ? (
                <div className="mt-1.5">
                  <CustomerPicker
                    partnerType="S"
                    onPick={(s) => {
                      patchWarranty(l.soItemId, { supplier: { id: s.id, code: s.code, name: s.name, source: '' } });
                      setPickingSupplierFor(null);
                    }}
                    onCommit={() => setPickingSupplierFor(null)}
                  />
                </div>
              ) : null}

              {/* 車號/故障碼（執行長「先保留」＝選填、存問題描述模板）＋描述 */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1.5 text-[12px]">
                  車號
                  <input
                    ref={li === 0 ? firstInputRef : undefined}
                    value={d.plateNo}
                    onChange={(e) => patchWarranty(l.soItemId, { plateNo: e.target.value })}
                    maxLength={20}
                    placeholder="ABC-1234（選填）"
                    className="min-w-0 flex-1 rounded border border-border/60 bg-background px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[12px]">
                  故障碼
                  <input
                    value={d.faultCode}
                    onChange={(e) => patchWarranty(l.soItemId, { faultCode: e.target.value })}
                    maxLength={50}
                    placeholder="P0300（選填）"
                    className="min-w-0 flex-1 rounded border border-border/60 bg-background px-2 py-1 text-sm"
                  />
                </label>
              </div>
              <textarea
                value={d.description}
                onChange={(e) => patchWarranty(l.soItemId, { description: e.target.value })}
                maxLength={800}
                rows={2}
                placeholder="問題描述（必填、給供應商審核參考）：故障情形、發生時機…"
                className="mt-2 w-full resize-none rounded-lg border border-border/60 bg-background px-2 py-1.5 text-sm"
              />

              {/* 附件：照片/影片必附 ≥1、行照選填 */}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
                <label className="flex items-center gap-1.5">
                  <span className={d.media.length ? 'text-muted-foreground' : 'font-bold text-destructive'}>
                    照片/影片（必附）
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length) patchWarranty(l.soItemId, { media: [...d.media, ...files] });
                      e.target.value = '';
                    }}
                    className="text-[11px]"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">行照（選填）</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      patchWarranty(l.soItemId, { lic: f });
                      e.target.value = '';
                    }}
                    className="text-[11px]"
                  />
                </label>
              </div>
              {d.media.length || d.lic ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {d.media.map((f, fi) => (
                    <span key={fi} className="flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 text-[11px]">
                      {f.type.startsWith('video/') ? '🎬' : '📷'} {f.name}
                      <button
                        type="button"
                        aria-label={`移除 ${f.name}`}
                        onClick={() => patchWarranty(l.soItemId, { media: d.media.filter((_, x) => x !== fi) })}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {d.lic ? (
                    <span className="flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 text-[11px]">
                      🪪 {d.lic.name}
                      <button
                        type="button"
                        aria-label="移除行照"
                        onClick={() => patchWarranty(l.soItemId, { lic: null })}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ) : null}
                </div>
              ) : null}
              {miss.length ? (
                <div className="mt-1.5 text-[11px] text-destructive">缺：{miss.join('、')}</div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-3">
        {issues.length ? (
          <span className="text-[11px] text-destructive">還有 {issues.length} 個保固件資料不完整</span>
        ) : null}
        <button
          ref={nextRef}
          type="button"
          onClick={onNext}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          下一步：退貨 →
        </button>
      </div>
    </div>
  );
}

/** 步驟 4：退貨（取件方式＋備註＋覆核送出；主動作鈕焦點鏈） */
function ReturnStep({
  returnMethod,
  setReturnMethod,
  remark,
  setRemark,
  selectedSo,
  returnLines,
  warrantyLines,
  total,
  submitting,
  submitError,
  onSubmit,
}: {
  returnMethod: string;
  setReturnMethod: (v: string) => void;
  remark: string;
  setRemark: (v: string) => void;
  selectedSo: ReturnableSo | null;
  returnLines: RetLine[];
  warrantyLines: RetLine[];
  total: number;
  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
}) {
  const remarkRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PillGroup
        label="取件方式"
        options={RETURN_METHODS}
        value={returnMethod}
        onChange={setReturnMethod}
        autoFocusGroup
        onEnter={() => remarkRef.current?.focus()}
        hint="外務取回＝先開單再派取（驗不過會作廢）；自送回/寄回＝貨到倉確認後開單。←→ 選、Enter 到備註。"
      />
      <div>
        <div className="mb-1.5 text-[12px] font-bold text-muted-foreground">備註（選填）</div>
        <input
          ref={remarkRef}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitRef.current?.focus();
            }
          }}
          maxLength={200}
          placeholder="例：客戶說包裝未拆、下週三前取"
          className="w-full rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground"
        />
      </div>

      {/* 覆核摘要 */}
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-[12px]">
        <span className="font-bold text-foreground">將產生：</span>
        <span className="text-muted-foreground">
          {returnLines.length ? `銷退單 ×1（${returnLines.length} 行、退款合計 ${money(total)}、直轉待驗收）` : ''}
          {returnLines.length && warrantyLines.length ? '、' : ''}
          {warrantyLines.length ? `保固申請 ×${warrantyLines.length}（連原單＋附件、送供應商審核、不退款）` : ''}
          {selectedSo ? `——原單 ${selectedSo.docNo}` : ''}
        </span>
      </div>

      {submitError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {submitError}
        </div>
      ) : null}
      <div className="mt-auto flex items-center justify-end gap-3">
        <button
          ref={submitRef}
          type="button"
          disabled={submitting || (returnLines.length === 0 && warrantyLines.length === 0) || !selectedSo}
          onClick={onSubmit}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          {submitting ? '送出中…' : '送出 →'}
        </button>
      </div>
    </div>
  );
}

/** 步驟 5：訊息（本次結果＋近期退貨單追蹤——倉管驗收結果生成回覆訊息） */
function MessageStep({
  customer,
  retLines,
  result,
  returnMethod,
  onClose,
}: {
  customer: PickedCustomer | null;
  retLines: RetLine[];
  result: SrResult | null;
  returnMethod: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [tracked, setTracked] = useState<Sr[]>([]);
  const [trackLoading, setTrackLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const doneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    doneRef.current?.focus();
  }, []);
  // 初始訊息＝本次送出結果
  useEffect(() => {
    if (result && customer) setMsg(buildSubmitMessage(customer.name, result, retLines, returnMethod));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.srDocNo]);
  // 近期退貨單追蹤（倉管驗收結果 → 點列生成回覆）；list 無 customer 濾鏡、抓近 20 張前端過濾
  useEffect(() => {
    if (!customer) return;
    setTrackLoading(true);
    listSr({ page: 1, pageSize: 20 })
      .then((r) => setTracked((r.items ?? []).filter((s) => s.customerId === customer.id)))
      .catch(() => setTracked([]))
      .finally(() => setTrackLoading(false));
  }, [customer, result?.srDocNo]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 複製失敗忽略 */
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {result ? (
        <div className="rounded-xl border border-primary/40 bg-primary/8 p-3">
          <div className="text-sm font-bold text-primary">
            ✓ 已送出
            {result.srDocNo ? `　退貨單 ${result.srDocNo}` : ''}
            {result.claims.length ? `　保固申請 ×${result.claims.length}` : ''}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {result.srDocNo
              ? result.srInspectOk
                ? '退貨單已轉待驗收、倉庫收貨判定後過帳退款/折讓。'
                : '⚠️ 退貨單停在草稿（轉驗收失敗）——請到銷退單列表手動送驗收。'
              : ''}
            {result.claims.length ? `保固：${result.claims.map((c) => c.docNo).join('、')} 已送審。` : ''}
          </div>
          {result.errors.length ? (
            <div className="mt-1 text-[11px] text-destructive">{result.errors.join('；')}</div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 p-3 text-[12px] text-muted-foreground">
          本次還沒送出——下方可追蹤此客戶近期退貨單的倉管驗收結果、點一列生成回覆訊息。
        </div>
      )}

      {/* 近期退貨單追蹤（倉管確認 OK/NG 都在這生成回覆） */}
      {customer ? (
        <div className="rounded-xl border border-border/40 p-2">
          <div className="mb-1 px-1 text-[12px] font-bold text-muted-foreground">近期退貨單（點列生成回覆訊息）</div>
          {trackLoading ? (
            <div className="px-1 py-2 text-[12px] text-muted-foreground">載入中…</div>
          ) : tracked.length === 0 ? (
            <div className="px-1 py-2 text-[12px] text-muted-foreground">此客戶近期沒有退貨單。</div>
          ) : (
            <div className="max-h-36 overflow-auto">
              {tracked.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => customer && setMsg(buildTrackMessage(customer.name, s))}
                  className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-[12px] hover:bg-muted/40"
                >
                  <span className="font-mono">{s.docNo}</span>
                  <span className="text-muted-foreground">{String(s.srDate).slice(0, 10)}</span>
                  <span
                    className={`rounded px-1.5 text-[10px] ${
                      s.status === 'POSTED'
                        ? 'bg-primary/15 text-primary'
                        : s.status === 'CANCELLED' || s.status === 'REJECTED'
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    {SR_STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <span className="ml-auto tabular-nums">{money(Number(s.totalAmount))}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-muted-foreground">客戶訊息</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-lg border border-border/60 px-2.5 py-1 text-[12px] hover:bg-muted/40"
        >
          {copied ? '已複製 ✓' : '複製訊息'}
        </button>
      </div>
      <textarea
        readOnly
        value={msg}
        placeholder="（選上方追蹤列或送出後生成）"
        className="min-h-0 flex-1 resize-none rounded-xl border border-border/40 bg-background/40 p-3 font-mono text-[12px] text-foreground"
      />
      <div className="flex justify-end">
        <button
          ref={doneRef}
          type="button"
          onClick={onClose}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          完成・下一單
        </button>
      </div>
    </div>
  );
}
