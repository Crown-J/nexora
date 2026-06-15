'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { fetchAllPages } from '@data/api/fetchAllPages';
import { listPartner } from '@/features/shared/master/partner/api/partner';
import type { PartnerDto } from '@data/types/shared/master/partner';
import { listLookupPart } from '@/features/shared/master/lookup/api/lookup';
import type { LookupRow } from '@data/types/shared/master/lookup';

import {
  getRfq,
  patchRfq,
  patchRfqReply,
  patchRfqStatus,
  voidRfq,
} from '../../api/rfq';
import { generateRfqInquiryText } from '@/features/nx03/rfq-greeting-template/api/rfq-greeting-template';
import {
  adoptQt,
  createQt,
  listQuotesByRfq,
  type QtRow,
} from '@/features/nx03/qt/api/qt';
import type { RfqDetailDto } from '@data/types/nx02';
import { rfqStatusLabel } from '../../shared/nx01-labels';

function isSupplier(p: PartnerDto): boolean {
  return p.partnerType === 'S';
}

type DraftLine = {
  key: string;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;
  remark: string;
};

type ReplyRow = {
  unit_price: string;
  lead_time_days: string;
  status: 'R' | 'C';
};

export function RfqDetailView({ id }: { id: string }) {
  const [doc, setDoc] = useState<RfqDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [suppliers, setSuppliers] = useState<PartnerDto[]>([]);
  const [headerDraft, setHeaderDraft] = useState({
    rfqDate: '',
    supplierId: '',
    contactName: '',
    contactPhone: '',
    remark: '',
  });
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [partQ, setPartQ] = useState('');
  const [partHits, setPartHits] = useState<LookupRow[]>([]);
  const [replyState, setReplyState] = useState<Record<string, ReplyRow>>({});

  // M3-redo-1：產生詢價文字（呼叫 M2-e 端點、業務 copy 到 LINE/電話）
  const [inquiryText, setInquiryText] = useState<string | null>(null);
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  // M3-redo-3b：並排比價 state
  const [quotes, setQuotes] = useState<QtRow[]>([]);
  const [quotesLoaded, setQuotesLoaded] = useState(false);
  const [quotesBusy, setQuotesBusy] = useState(false);
  const [newQt, setNewQt] = useState({ inquiryPartnerId: '', quotedPrice: '', quotedQuantity: '', leadDays: '', notes: '' });

  async function loadQuotes() {
    setQuotesBusy(true);
    try {
      const res = await listQuotesByRfq(id);
      setQuotes(res.quotes);
      setQuotesLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setQuotesBusy(false);
    }
  }

  async function onAddQt() {
    if (!newQt.inquiryPartnerId.trim() || !newQt.quotedPrice || !newQt.quotedQuantity) {
      setError('請填供應商 ID + 報價 + 數量');
      return;
    }
    setQuotesBusy(true);
    setError(null);
    try {
      await createQt({
        rfqId: id,
        inquiryPartnerId: newQt.inquiryPartnerId.trim(),
        quotedPrice: Number(newQt.quotedPrice),
        quotedQuantity: Number(newQt.quotedQuantity),
        leadDays: newQt.leadDays ? Number(newQt.leadDays) : null,
        notes: newQt.notes.trim() || undefined,
      });
      setNewQt({ inquiryPartnerId: '', quotedPrice: '', quotedQuantity: '', leadDays: '', notes: '' });
      await loadQuotes();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setQuotesBusy(false);
    }
  }

  async function onAdoptQt(qtId: string) {
    if (!confirm('採用此報價、將自動建立採購單／調貨單。確定嗎？')) return;
    setQuotesBusy(true);
    setError(null);
    try {
      const result = await adoptQt(qtId);
      const created = result.createdDocKind === 'PO'
        ? `已建立採購單 PO-${result.poDocNo}`
        : `已建立調貨單 TI-${result.tiDocNo}`;
      alert(`✅ ${created}\n（連帶拒絕 ${result.rejectedSiblingCount} 筆兄弟報價、RFQ 已 CLOSED）`);
      await loadQuotes();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setQuotesBusy(false);
    }
  }

  async function onGenerateInquiryText() {
    setInquiryBusy(true);
    setError(null);
    setCopyHint(null);
    try {
      const res = await generateRfqInquiryText(id);
      setInquiryText(res.text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInquiryBusy(false);
    }
  }

  async function onCopyInquiryText() {
    if (!inquiryText) return;
    try {
      await navigator.clipboard.writeText(inquiryText);
      setCopyHint('已複製到剪貼簿、可貼到 LINE/Email');
      setTimeout(() => setCopyHint(null), 3000);
    } catch (e) {
      setCopyHint('複製失敗、請手動全選複製');
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getRfq(id);
      setDoc(d);
      if (d.status === 'D' || d.status === 'DRAFT') {
        setHeaderDraft({
          rfqDate: d.rfqDate,
          supplierId: d.supplierId ?? '',
          contactName: d.contactName ?? '',
          contactPhone: d.contactPhone ?? '',
          remark: d.remark ?? '',
        });
        setDraftLines(
          d.items.map((it) => ({
            key: it.id,
            partId: it.partId,
            partNo: it.partNo,
            partName: it.partName,
            qty: String(it.qty),
            remark: it.remark ?? '',
          })),
        );
      }
      if (d.status === 'S' || d.status === 'SENT') {
        const rs: Record<string, ReplyRow> = {};
        for (const it of d.items) {
          rs[it.id] = {
            unit_price: it.unitPrice != null ? String(it.unitPrice) : '',
            lead_time_days: it.leadTimeDays != null ? String(it.leadTimeDays) : '',
            status: it.status === 'C' ? 'C' : 'R',
          };
        }
        setReplyState(rs);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetchAllPages((page, pageSize) => listPartner({ page, pageSize }), { pageSize: 100, maxPages: 50 })
      .then((items) => setSuppliers(items.filter(isSupplier)))
      .catch(() => setSuppliers([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!partQ.trim()) {
        setPartHits([]);
        return;
      }
      void listLookupPart({ q: partQ, pageSize: 15 }).then(setPartHits).catch(() => setPartHits([]));
    }, 280);
    return () => clearTimeout(t);
  }, [partQ]);

  const addDraftPart = (p: LookupRow) => {
    setDraftLines((prev) => [
      ...prev,
      {
        key: `new-${p.id}-${Date.now()}`,
        partId: p.id,
        partNo: p.code,
        partName: p.name ?? '',
        qty: '1',
        remark: '',
      },
    ]);
    setPartQ('');
    setPartHits([]);
  };

  const saveDraft = async (): Promise<boolean> => {
    if (!doc) return false;
    setError(null);
    try {
      const items = [];
      for (const ln of draftLines) {
        const qty = Number(ln.qty);
        if (!Number.isFinite(qty) || qty <= 0) {
          setError(`料號 ${ln.partNo} 數量須大於 0`);
          return false;
        }
        items.push({
          partId: ln.partId,
          qty,
          remark: ln.remark.trim() || null,
        });
      }
      if (!items.length) {
        setError('至少一筆明細');
        return false;
      }
      const updated = await patchRfq(doc.id, {
        rfqDate: headerDraft.rfqDate,
        supplierId: headerDraft.supplierId.trim() || null,
        contactName: headerDraft.contactName.trim() || null,
        contactPhone: headerDraft.contactPhone.trim() || null,
        remark: headerDraft.remark.trim() || null,
        items,
      });
      setDoc(updated);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
      return false;
    }
  };

  const issueRfq = async () => {
    if (!doc) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await saveDraft();
      if (!ok) return;
      await patchRfqStatus(doc.id, 'SENT');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '發出失敗');
    } finally {
      setBusy(false);
    }
  };

  const saveReply = async () => {
    if (!doc) return;
    setBusy(true);
    setError(null);
    try {
      const items = doc.items.map((it) => {
        const row = replyState[it.id];
        if (!row) throw new Error('明細狀態遺失');
        const up =
          row.status === 'R'
            ? (() => {
                const n = Number(row.unit_price);
                if (!Number.isFinite(n) || n < 0) throw new Error(`請填有效單價：${it.partNo}`);
                return n;
              })()
            : null;
        const lt = row.lead_time_days.trim() === '' ? null : Number(row.lead_time_days);
        return {
          id: it.id,
          unit_price: up,
          lead_time_days: lt != null && Number.isFinite(lt) ? lt : null,
          status: row.status,
        };
      });
      const updated = await patchRfqReply(doc.id, { items });
      setDoc(updated);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存回覆失敗');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (error && !doc) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</div>
    );
  }
  if (!doc) return null;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX01</p>
          <h1 className="text-xl font-semibold">詢價 {doc.docNo}</h1>
          <p className="text-sm text-muted-foreground">
            狀態：{rfqStatusLabel(doc.status)} · {doc.rfqDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={inquiryBusy}
            onClick={onGenerateInquiryText}
            className="rounded-lg bg-blue-500/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            title="產生詢價文字（業務 copy 到 LINE/電話問供應商）"
          >
            {inquiryBusy ? '產生中…' : '📋 產生詢價文字'}
          </button>
          <Link href="/dashboard/purchase/rfq" className="text-sm text-muted-foreground underline">
            返回列表
          </Link>
        </div>
      </header>

      {/* M3-redo-3b：並排比價 section（任何狀態都可顯示、需手動點開 load） */}
      <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-emerald-300">📊 並排比價（多家供應商報價）</h2>
          <button
            type="button"
            disabled={quotesBusy}
            onClick={loadQuotes}
            className="rounded bg-emerald-500/30 px-3 py-1 text-xs hover:bg-emerald-500/50"
          >
            {quotesBusy ? '載入中…' : quotesLoaded ? '🔄 重新整理' : '📥 載入報價'}
          </button>
        </div>
        {!quotesLoaded ? (
          <p className="text-xs text-muted-foreground">點「載入報價」查看已收到的供應商回報。</p>
        ) : quotes.length === 0 ? (
          <p className="text-xs text-muted-foreground">尚未收到任何報價、可在下方表單填一筆。</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left">排名</th>
                  <th className="px-2 py-1 text-left">供應商</th>
                  <th className="px-2 py-1 text-right">單價</th>
                  <th className="px-2 py-1 text-right">數量</th>
                  <th className="px-2 py-1 text-right">交期(天)</th>
                  <th className="px-2 py-1 text-left">備註</th>
                  <th className="px-2 py-1 text-left">狀態</th>
                  <th className="px-2 py-1 text-left">動作</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q, idx) => (
                  <tr key={q.id} className={`border-t border-border/30 ${idx === 0 ? 'bg-emerald-500/10' : ''}`}>
                    <td className="px-2 py-1">
                      {idx === 0 && q.status === 'P' ? <span className="rounded bg-emerald-500/40 px-1.5 py-0.5 text-emerald-100">🏆 最低</span> : `#${idx + 1}`}
                    </td>
                    <td className="px-2 py-1 font-mono">{q.inquiryPartner?.code} {q.inquiryPartner?.name ?? q.inquiryPartnerId}</td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums">{String(q.quotedPrice)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{String(q.quotedQuantity)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{q.leadDays ?? '-'}</td>
                    <td className="px-2 py-1 text-muted-foreground">{q.notes ?? '-'}</td>
                    <td className="px-2 py-1">
                      {q.status === 'P' ? <span className="text-amber-300">待採購決定</span>
                        : q.status === 'A' ? <span className="text-emerald-300">已採用</span>
                        : <span className="text-red-300">已拒絕</span>}
                    </td>
                    <td className="px-2 py-1">
                      {q.status === 'P' && (
                        <button
                          type="button"
                          disabled={quotesBusy}
                          onClick={() => onAdoptQt(q.id)}
                          className="rounded bg-emerald-500/40 px-2 py-0.5 hover:bg-emerald-500/60"
                        >採用</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* 新增 Qt 表單 */}
        {quotesLoaded && (
          <details className="rounded border border-border/40 bg-background/50 p-2 text-xs">
            <summary className="cursor-pointer text-emerald-300">＋ 新增一筆報價（業務外部問完填入）</summary>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
              <input
                className="rounded border border-border bg-background px-2 py-1"
                placeholder="供應商 ID"
                value={newQt.inquiryPartnerId}
                onChange={(e) => setNewQt({ ...newQt, inquiryPartnerId: e.target.value })}
              />
              <input
                type="number"
                step="0.0001"
                className="rounded border border-border bg-background px-2 py-1"
                placeholder="單價"
                value={newQt.quotedPrice}
                onChange={(e) => setNewQt({ ...newQt, quotedPrice: e.target.value })}
              />
              <input
                type="number"
                step="0.0001"
                className="rounded border border-border bg-background px-2 py-1"
                placeholder="可供數量"
                value={newQt.quotedQuantity}
                onChange={(e) => setNewQt({ ...newQt, quotedQuantity: e.target.value })}
              />
              <input
                type="number"
                className="rounded border border-border bg-background px-2 py-1"
                placeholder="交期天數"
                value={newQt.leadDays}
                onChange={(e) => setNewQt({ ...newQt, leadDays: e.target.value })}
              />
              <input
                className="rounded border border-border bg-background px-2 py-1"
                placeholder="備註"
                value={newQt.notes}
                onChange={(e) => setNewQt({ ...newQt, notes: e.target.value })}
              />
            </div>
            <button
              type="button"
              disabled={quotesBusy}
              onClick={onAddQt}
              className="mt-2 rounded bg-emerald-500/70 px-3 py-1 text-xs hover:bg-emerald-500"
            >新增報價</button>
          </details>
        )}
      </div>

      {inquiryText !== null && (
        <div className="space-y-2 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-300">詢價文字（複製到 LINE/Email 用）</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCopyInquiryText}
                className="rounded bg-blue-500/30 px-3 py-1 text-xs hover:bg-blue-500/50"
              >複製</button>
              <button
                type="button"
                onClick={() => { setInquiryText(null); setCopyHint(null); }}
                className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
              >關閉</button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-sm">{inquiryText}</pre>
          {copyHint && <p className="text-xs text-emerald-300">{copyHint}</p>}
          <p className="text-xs text-muted-foreground">
            想改開頭/結尾客套話？到{' '}
            <Link href="/dashboard/purchase/rfq-greeting-template" className="underline">
              客套話設定頁
            </Link>{' '}
            調整。
          </p>
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div>
      ) : null}

      {(doc.status === 'D' || doc.status === 'DRAFT') ? (
        <div className="space-y-4 rounded-xl border border-border/70 p-4">
          <h2 className="text-sm font-semibold">草稿編輯</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              詢價日期
              <input
                type="date"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={headerDraft.rfqDate}
                onChange={(e) => setHeaderDraft((h) => ({ ...h, rfqDate: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              供應商
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={headerDraft.supplierId}
                onChange={(e) => setHeaderDraft((h) => ({ ...h, supplierId: e.target.value }))}
              >
                <option value="">未指定</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              聯絡人
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={headerDraft.contactName}
                onChange={(e) => setHeaderDraft((h) => ({ ...h, contactName: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              電話
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={headerDraft.contactPhone}
                onChange={(e) => setHeaderDraft((h) => ({ ...h, contactPhone: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
              備註
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={headerDraft.remark}
                onChange={(e) => setHeaderDraft((h) => ({ ...h, remark: e.target.value }))}
              />
            </label>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">新增明細（搜尋零件）</p>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={partQ}
              onChange={(e) => setPartQ(e.target.value)}
              placeholder="料號／品名…"
            />
            {partHits.length > 0 ? (
              <ul className="mt-1 max-h-36 overflow-auto rounded-lg border text-sm">
                {partHits.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="w-full px-3 py-2 text-left hover:bg-muted" onClick={() => addDraftPart(p)}>
                      {p.code} {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">料號</th>
                  <th className="py-2">品名</th>
                  <th className="py-2">數量</th>
                  <th className="py-2">備註</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {draftLines.map((ln) => (
                  <tr key={ln.key} className="border-t border-border/60">
                    <td className="py-2 font-mono text-xs">{ln.partNo}</td>
                    <td className="py-2">{ln.partName}</td>
                    <td className="py-2">
                      <input
                        className="w-20 rounded border px-2 py-1"
                        value={ln.qty}
                        onChange={(e) =>
                          setDraftLines((p) => p.map((x) => (x.key === ln.key ? { ...x, qty: e.target.value } : x)))
                        }
                      />
                    </td>
                    <td className="py-2">
                      <input
                        className="w-full min-w-[100px] rounded border px-2 py-1"
                        value={ln.remark}
                        onChange={(e) =>
                          setDraftLines((p) => p.map((x) => (x.key === ln.key ? { ...x, remark: e.target.value } : x)))
                        }
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="text-xs text-destructive underline"
                        onClick={() => setDraftLines((p) => p.filter((x) => x.key !== ln.key))}
                      >
                        移除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium disabled:opacity-50"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await saveDraft();
                } finally {
                  setBusy(false);
                }
              }}
            >
              儲存
            </button>
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={busy}
              onClick={() => void issueRfq()}
            >
              發出
            </button>
            <button
              type="button"
              className="rounded-lg border border-destructive/50 px-4 py-2 text-sm text-destructive disabled:opacity-50"
              disabled={busy}
              onClick={async () => {
                if (!confirm('作廢此草稿？')) return;
                setBusy(true);
                try {
                  await voidRfq(doc.id);
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : '作廢失敗');
                } finally {
                  setBusy(false);
                }
              }}
            >
              作廢
            </button>
          </div>
        </div>
      ) : null}

      {(doc.status === 'S' || doc.status === 'SENT') ? (
        <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h2 className="text-sm font-semibold">供應商回覆（已發出）</h2>
          <p className="text-xs text-muted-foreground">料號與數量唯讀；填寫單價、交期，並標示每列已回覆或不採用。</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">料號</th>
                  <th className="px-2 py-2">數量</th>
                  <th className="px-2 py-2">單價</th>
                  <th className="px-2 py-2">交期(天)</th>
                  <th className="px-2 py-2">明細狀態</th>
                </tr>
              </thead>
              <tbody>
                {doc.items.map((it) => {
                  const row = replyState[it.id] ?? { unit_price: '', lead_time_days: '', status: 'R' as const };
                  return (
                    <tr key={it.id} className="border-t border-border/60 align-top">
                      {/* T8 進貨對齊批次 2026-06-08：樣式 A — 我方料號主行 + 廠牌料號小字下行 */}
                      <td className="px-2 py-2 font-mono text-xs">
                        <div>{it.partNo}</div>
                        {it.secCode ? (
                          <div className="mt-0.5 text-[10px] text-muted-foreground" title="廠牌料號">
                            {it.secCode}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 tabular-nums text-muted-foreground">{it.qty}</td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          className="w-28 rounded border px-2 py-1 tabular-nums"
                          disabled={row.status === 'C'}
                          value={row.unit_price}
                          onChange={(e) =>
                            setReplyState((p) => ({
                              ...p,
                              [it.id]: { ...row, unit_price: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          className="w-20 rounded border px-2 py-1 tabular-nums"
                          disabled={row.status === 'C'}
                          value={row.lead_time_days}
                          onChange={(e) =>
                            setReplyState((p) => ({
                              ...p,
                              [it.id]: { ...row, lead_time_days: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          className="rounded border bg-background px-2 py-1 text-sm"
                          value={row.status}
                          onChange={(e) => {
                            const st = e.target.value as 'R' | 'C';
                            setReplyState((p) => ({
                              ...p,
                              [it.id]: {
                                ...row,
                                status: st,
                                ...(st === 'C' ? { unit_price: '', lead_time_days: '' } : {}),
                              },
                            }));
                          }}
                        >
                          <option value="R">已回覆</option>
                          <option value="C">不採用</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={busy}
            onClick={() => void saveReply()}
          >
            儲存回覆
          </button>
        </div>
      ) : null}

      {(doc.status === 'R' || doc.status === 'REPLIED') ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/purchase/rr/new?rfq=${encodeURIComponent(doc.id)}`}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium"
          >
            轉為進貨單（RR）
          </Link>
          <Link
            href={`/dashboard/purchase/po/new?rfq=${encodeURIComponent(doc.id)}`}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium"
          >
            轉為採購單（PO）
          </Link>
        </div>
      ) : null}

      {doc.status !== 'D' && doc.status !== 'S' ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">料號</th>
                  <th className="px-3 py-2">品名</th>
                  <th className="px-3 py-2 text-right">數量</th>
                  <th className="px-3 py-2 text-right">單價</th>
                  <th className="px-3 py-2">交期</th>
                  <th className="px-3 py-2">明細</th>
                </tr>
              </thead>
              <tbody>
                {doc.items.map((it) => (
                  <tr key={it.id} className="border-b border-border/50 align-top">
                    <td className="px-3 py-2">{it.lineNo}</td>
                    {/* T8 進貨對齊批次 2026-06-08：樣式 A — 我方料號主行 + 廠牌料號小字下行 */}
                    <td className="px-3 py-2 font-mono text-xs">
                      <div>{it.partNo}</div>
                      {it.secCode ? (
                        <div className="mt-0.5 text-[10px] text-muted-foreground" title="廠牌料號">
                          {it.secCode}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{it.partName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.unitPrice ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{it.leadTimeDays ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {it.status === 'P'
                        ? '待回覆'
                        : it.status === 'R'
                          ? '已回覆'
                          : it.status === 'C'
                            ? '不採用'
                            : it.status === 'S'
                              ? '已選用'
                              : it.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground">供應商：</span>
              {doc.supplierName ?? '—'}
            </p>
            <p className="mt-1">
              <span className="text-foreground">備註：</span>
              {doc.remark ?? '—'}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
