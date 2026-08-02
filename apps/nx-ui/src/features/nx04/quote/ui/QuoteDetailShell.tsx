// apps/nx-ui/src/features/nx04/quote/ui/QuoteDetailShell.tsx
//
// 報價單檢視（v3.0.0 檢視殼的第一個真實頁面）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §5
//
// ⭐ 這一頁是唯讀的。修改一律走底下的動作列——⛔ 不給「編輯」按鈕。
//    理由（外殼規格 §2.4）：已寄給客戶的報價直接改欄位，舊值就消失了，
//    帳不可稽核，跟「命脈＝可信可稽核的帳」直接衝突。
//
// ⚠️ 這一頁全程⛔ 不顯示成本，也⛔ 不顯示 minPrice（成本式底價）——
//    minPrice = 平均成本 ×(1+客戶等級毛利率)，露出來業務就能反推進價。
//    只顯示「低於底價原因」的文字（不含數字），那是紀律紀錄、不是成本。
//    ⚠️ 「讓價」欄要等 Nx04QuoteItem 補上公司定價快照才做得出來（見已作廢決策清單 §2）。

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DetailTemplate, type DetailAction, type DetailStat } from '@design/templates/DetailTemplate';
import { DocPrintView } from '@/features/shared/doc-shell/DocPrintView';
import { ConfirmDialog, type ConfirmState } from '@/features/nx01/shell/ui/ConfirmDialog';
import { getQuote, voidQuote } from '@data/endpoints/nx04/quote/api/quote';
import type { Quote, QuoteItem, QuoteStatus } from '@data/types/nx04/quote';

/**
 * 狀態寫人話（外殼規格 §4）——⛔ 不給使用者看 DRAFT / SENT 這種內碼。
 * ⚠️ 過期與否用日期算，⛔ 不完全信 status：狀態要等有人動它才會變成 EXPIRED。
 */
function humanStatus(q: Quote, daysLeft: number | null): { label: string; tone: 'ok' | 'warn' | 'danger' } {
  if (q.voidedAt) return { label: '已作廢', tone: 'danger' };
  const map: Partial<Record<QuoteStatus, { label: string; tone: 'ok' | 'warn' | 'danger' }>> = {
    DRAFT: { label: '草稿 · 還沒寄出', tone: 'warn' },
    ACCEPTED: { label: '客戶已接受', tone: 'ok' },
    REJECTED: { label: '客戶拒絕', tone: 'danger' },
    EXPIRED: { label: '已過期', tone: 'danger' },
    CANCELLED: { label: '已作廢', tone: 'danger' },
  };
  if (q.status === 'SENT') {
    if (daysLeft !== null && daysLeft < 0) return { label: '已過期', tone: 'danger' };
    return { label: '已寄出 · 等客戶回', tone: 'warn' };
  }
  return map[q.status] ?? { label: q.status, tone: 'warn' };
}

const num = (v: string | null | undefined) => Number(v ?? 0);
const money = (v: string | number | null | undefined) =>
  Number(v ?? 0).toLocaleString('zh-TW', { maximumFractionDigits: 2 });
/** 數量去掉無意義的小數尾巴（後端是 Decimal(14,4)） */
const qtyText = (v: string | null | undefined) => String(Number(v ?? 0));
const dateText = (v: string | null | undefined) => (v ? v.slice(0, 10) : '—');

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const end = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

export function QuoteDetailShell({ id }: { id: string }) {
  const router = useRouter();
  const [q, setQ] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setQ(await getQuote(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '讀取失敗');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // 只有「已選取」的行才算進金額（後端小計也是這樣算的）
  const items = useMemo<QuoteItem[]>(() => (q?.items ?? []).filter((i) => i.isSelected !== false), [q]);
  const daysLeft = daysUntil(q?.validUntil);

  const transfer = useMemo(() => {
    const done = items.filter((i) => num(i.transferredQty) >= num(i.qty)).length;
    return { done, total: items.length };
  }, [items]);

  if (error) {
    return (
      <div className="p-5">
        <div className="nx-alert-danger">讀不到這張報價：{error}</div>
      </div>
    );
  }
  if (!q) return <div className="p-5 nx-hint">載入中⋯</div>;

  const st = humanStatus(q, daysLeft);
  const voided = Boolean(q.voidedAt) || q.status === 'CANCELLED';

  const stats: DetailStat[] = [
    {
      label: '報價金額',
      value: money(q.totalAmount),
      hint: `未稅 ${money(q.subtotal)} · 稅 ${money(q.taxAmount)}`,
    },
    {
      label: '有效期',
      value: daysLeft === null ? '未設定' : daysLeft < 0 ? `過期 ${-daysLeft} 天` : `剩 ${daysLeft} 天`,
      hint: q.validUntil ? `到 ${dateText(q.validUntil)} 為止` : '這張報價沒有設有效期',
      tone: daysLeft === null ? 'warn' : daysLeft < 0 ? 'danger' : daysLeft <= 3 ? 'warn' : 'normal',
    },
    {
      label: '已轉銷貨',
      value: `${transfer.done} / ${transfer.total} 項`,
      hint: transfer.done === 0 ? '還沒有品項轉成銷貨單' : transfer.done === transfer.total ? '全部成交' : '部分成交',
      tone: transfer.done > 0 && transfer.done < transfer.total ? 'warn' : 'normal',
    },
  ];

  const actions: DetailAction[] = [
    {
      key: 'to-so',
      label: '轉銷貨',
      primary: true,
      // 作廢的單、或每一項都已經轉完的單，就沒有東西好轉了
      disabled: voided || (transfer.total > 0 && transfer.done === transfer.total),
      disabledReason: voided ? '這張報價已經作廢了' : '這張報價的品項都已經轉成銷貨單了',
      // ⭐ 帶著客戶過去，建單頁會自動選好客戶、跳到明細段、把報價挑選器打開。
      //    ⛔ 不直接把品項塞進去——客戶可能只買其中幾項，勾選要留給業務。
      onClick: () =>
        router.push(
          `/dashboard/sale/order?customerId=${encodeURIComponent(q.customerId)}&fromQuote=${encodeURIComponent(q.id)}`,
        ),
    },
    {
      key: 'print',
      label: '列印／PDF',
      onClick: () => setPrintOpen(true),
    },
    {
      key: 'void',
      label: '作廢',
      disabled: voided,
      disabledReason: '這張報價已經作廢了',
      onClick: () =>
        setConfirm({
          title: '確認作廢這張報價？',
          // ⚠️ 使用者看得到的文字⛔ 不用 ⛔／⚠️ 這種內部標記——那是規格書的慣例、不是產品用語
          message: `${q.docNo}　${q.customerName ?? ''}\n作廢後不能復原。客戶已經收到的報價需要另外通知。`,
          variant: 'danger',
          confirmLabel: '作廢',
          onConfirm: async () => {
            setBusy(true);
            try {
              await voidQuote(q.id);
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : '作廢失敗');
            } finally {
              setBusy(false);
              setConfirm(null);
            }
          },
        }),
    },
  ];

  return (
    <>
      <DetailTemplate
        title={q.docNo}
        subtitle={q.customerName ?? q.customerCode ?? undefined}
        status={st}
        stats={stats}
        actions={actions}
        onBack={() => router.push('/dashboard/sale/qt')}
        aside={
          <>
            <div className="nx-card">
              <div className="nx-t-sub mb-3">客戶</div>
              <dl className="flex flex-col gap-2">
                <Row k="代碼" v={q.customerCode ?? '—'} mono />
                <Row k="等級" v={q.customerGradeName ?? '未分級'} />
                <Row k="客戶單號" v={q.customerRefNo ?? '—'} />
              </dl>
            </div>
            <div className="nx-card">
              <div className="nx-t-sub mb-3">報價資訊</div>
              <dl className="flex flex-col gap-2">
                <Row k="報價日" v={dateText(q.quoteDate)} />
                <Row k="有效至" v={dateText(q.validUntil)} />
                <Row k="業務" v={q.salesPersonName ?? '—'} />
                <Row k="出貨倉" v={[q.warehouseCode, q.warehouseName].filter(Boolean).join(' ') || '—'} />
                <Row k="來源" v={q.source === 'INSTANT' ? '即時報價' : '正式報價單'} />
                <Row k="幣別" v={q.currencyCode ?? '—'} />
              </dl>
            </div>
            {q.remark && (
              <div className="nx-card">
                <div className="nx-t-sub mb-2">備註</div>
                <p className="nx-body whitespace-pre-wrap">{q.remark}</p>
              </div>
            )}
          </>
        }
        tabs={[
          {
            key: 'items',
            label: '明細',
            count: items.length,
            content: (
              <div className="nx-card overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="nx-th w-10">#</th>
                      <th className="nx-th">料號</th>
                      <th className="nx-th">品名</th>
                      <th className="nx-th text-right">數量</th>
                      <th className="nx-th text-right">單價</th>
                      <th className="nx-th text-right">金額</th>
                      <th className="nx-th text-right">
                        已轉
                        <div className="nx-th-note">轉成銷貨的量</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="border-b border-border/60 align-top">
                        <td className="nx-td text-foreground/75">{it.lineNo}</td>
                        <td className="nx-td">
                          <span className="nx-mono">{it.partNo}</span>
                          {it.brandName && <div className="nx-hint">{it.brandName}</div>}
                        </td>
                        <td className="nx-td">
                          {it.partName}
                          {/* ⭐ 低於底價的原因就長在那一行旁邊，⛔ 不藏進備註 */}
                          {it.belowMinReason && <div className="nx-hint mt-0.5">低於底價：{it.belowMinReason}</div>}
                          {it.remark && <div className="nx-hint mt-0.5">{it.remark}</div>}
                        </td>
                        <td className="nx-td nx-num text-right">{qtyText(it.qty)}</td>
                        <td className="nx-td nx-num text-right">{money(it.unitPrice)}</td>
                        <td className="nx-td nx-num text-right">{money(it.lineAmount)}</td>
                        <td className="nx-td nx-num text-right">
                          {num(it.transferredQty) === 0 ? (
                            <span className="text-foreground/50">—</span>
                          ) : (
                            qtyText(it.transferredQty)
                          )}
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td className="nx-td nx-hint" colSpan={7}>
                          這張報價沒有選取任何品項。
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="nx-td" colSpan={5} />
                      <td className="nx-td text-right">
                        <span className="nx-num-md">{money(q.subtotal)}</span>
                      </td>
                      <td className="nx-td" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ),
          },
          {
            key: 'history',
            label: '歷程',
            content: (
              <div className="nx-card">
                {/*
                  ⚠️ 系統目前沒有「單據異動歷程」的查詢 API（後端有寫稽核，但沒有讀的端點）。
                     這裡先用單據本身的時間戳組出最小歷程，⛔ 不假裝有完整軌跡。
                */}
                <ol className="flex flex-col gap-3">
                  <HistoryRow at={q.createdAt} who={q.createdByName} what="建立報價" />
                  {q.updatedAt !== q.createdAt && <HistoryRow at={q.updatedAt} who={null} what="最後一次修改" />}
                  {q.voidedAt && (
                    <HistoryRow at={q.voidedAt} who={null} what={`作廢${q.voidReason ? `：${q.voidReason}` : ''}`} />
                  )}
                </ol>
                <div className="nx-hint mt-4">
                  完整的異動軌跡（誰在什麼時候改了哪一行）目前還查不到——系統有寫稽核紀錄，但還沒有讀取的介面。
                </div>
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog state={busy ? null : confirm} onClose={() => setConfirm(null)} />

      {printOpen && (
        // ⭐ 列印走獨立的單據版面——畫面上的內部資訊（低於底價原因等）⛔ 不會跟著印出去
        <DocPrintView
          title="報 價 單"
          docNo={q.docNo}
          fields={[
            { label: '客戶', value: `${q.customerCode ?? ''} ${q.customerName ?? ''}`.trim() },
            { label: '報價日期', value: dateText(q.quoteDate) },
            { label: '有效期限', value: dateText(q.validUntil) },
            { label: '業務員', value: q.salesPersonName ?? '' },
            { label: '客戶單號', value: q.customerRefNo ?? '' },
            { label: '幣別', value: q.currencyCode ?? '' },
          ]}
          columns={[
            { label: '料號', render: (it: QuoteItem) => it.partNo },
            { label: '品名', render: (it: QuoteItem) => it.partName },
            { label: '數量', align: 'right', render: (it: QuoteItem) => qtyText(it.qty) },
            { label: '單價', align: 'right', render: (it: QuoteItem) => money(it.unitPrice) },
            { label: '金額', align: 'right', render: (it: QuoteItem) => money(it.lineAmount) },
          ]}
          items={items}
          getRowKey={(it: QuoteItem) => it.id}
          totals={[
            { label: '未稅小計', value: money(q.subtotal) },
            { label: '稅額', value: money(q.taxAmount) },
            { label: '合計', value: money(q.totalAmount), strong: true },
          ]}
          note={q.remark}
          signatures={['製單', '主管', '客戶簽收']}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="nx-hint shrink-0">{k}</dt>
      <dd className={mono ? 'nx-mono text-right' : 'nx-body text-right'}>{v}</dd>
    </div>
  );
}

function HistoryRow({ at, who, what }: { at: string | null; who?: string | null; what: string }) {
  if (!at) return null;
  return (
    <li className="flex gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <span className="nx-hint w-32 shrink-0 tabular-nums">{at.slice(0, 16).replace('T', ' ')}</span>
      <span className="nx-hint w-16 shrink-0">{who ?? '—'}</span>
      <span className="nx-body">{what}</span>
    </li>
  );
}
