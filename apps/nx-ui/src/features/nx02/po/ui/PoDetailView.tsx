'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { listLookupWarehouse } from '@data/endpoints/shared/master/lookup/api/lookup';
import type { LookupRow } from '@data/types/shared/master/lookup';
import { fetchAllPages } from '@data/api/fetchAllPages';
import { listPartner } from '@data/endpoints/shared/master/partner/api/partner';
import type { PartnerDto } from '@data/types/shared/master/partner';
import { listPartnerAddresses, type PartnerAddressRow } from '@data/endpoints/shared/address/partner-address-api';

import { getPo, patchPo, patchPoItem, patchPoStatus, poToRr, rejectPo, voidPo } from '@data/endpoints/nx02/api/po';
import type { PoDetailDto } from '@data/types/nx02';
import { poStatusLabel } from '../../shared/nx01-labels';

// T6 進貨對齊批次 2026-06-08：付款里程碑顯示對照
const PAYMENT_MILESTONE_LABEL: Record<string, string> = {
  N: '廠商已通知付款',
  D: '已付款',
};

// T1 進貨對齊批次 2026-06-07：採購單狀態判斷（雙吃短碼 + 全名）
function statusIs(s: string, ...candidates: string[]): boolean {
  return candidates.includes(s);
}
const ST_DRAFT = ['DRAFT', 'D'];
// T1-fix 2026-06-07：加 PENDING_APPROVAL 待核准（草稿與已核准之間）
const ST_PENDING_APPROVAL = ['PENDING_APPROVAL'];
const ST_APPROVED = ['APPROVED', 'A'];
const ST_SUBMITTED = ['SUBMITTED', 'S'];
const ST_CONFIRMED = ['CONFIRMED', 'CF'];
const ST_PARTIAL_RECEIVED = ['PARTIAL_RECEIVED', 'PR'];
const ST_RECEIVED = ['RECEIVED', 'R'];
const ST_CLOSED = ['CLOSED', 'C'];
const ST_CANCELLED = ['CANCELLED', 'V'];

export function PoDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<PoDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showRr, setShowRr] = useState(false);
  const [rrWh, setRrWh] = useState('');
  const [rrPick, setRrPick] = useState<Record<string, { on: boolean; qty: string }>>({});
  const [whOpts, setWhOpts] = useState<LookupRow[]>([]);

  // T1 進貨對齊批次 2026-06-07：退件 modal 狀態
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // T6 進貨對齊批次 2026-06-08：報關行廠商下拉（partnerType='T' 外包物流）
  const [customsAgents, setCustomsAgents] = useState<PartnerDto[]>([]);
  // T7 進貨對齊批次 2026-06-08：對象分開用、全廠商下拉 + ship-to partner 的地址下拉
  const [allPartners, setAllPartners] = useState<PartnerDto[]>([]);
  const [shipToAddresses, setShipToAddresses] = useState<PartnerAddressRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getPo(id);
      setDoc(r);
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
    listLookupWarehouse({ isActive: true })
      .then(setWhOpts)
      .catch(() => setWhOpts([]));
    // T6/T7：載入所有 active 廠商一次、衍生報關行（T）與全廠商兩份
    fetchAllPages((page, pageSize) => listPartner({ page, pageSize }), { pageSize: 100, maxPages: 50 })
      .then((items) => {
        const active = items.filter((p) => p.isActive);
        setAllPartners(active);
        setCustomsAgents(active.filter((p) => p.partnerType === 'T'));
      })
      .catch(() => {
        setAllPartners([]);
        setCustomsAgents([]);
      });
  }, []);

  // T7：載入「指送對象」（shipToPartnerId ?? supplierId）的 SHIPPING 地址供下拉
  useEffect(() => {
    if (!doc) return;
    const ownerId = doc.shipToPartnerId || doc.supplierId;
    if (!ownerId) {
      setShipToAddresses([]);
      return;
    }
    listPartnerAddresses(ownerId)
      .then((rows) => setShipToAddresses(rows.filter((r) => r.addressType === 'SHIPPING' && r.isActive)))
      .catch(() => setShipToAddresses([]));
  }, [doc]);

  // T6：B 級小欄位 patch helper（DRAFT/PENDING_APPROVAL/APPROVED 階段允許）
  // 業務語意：採購員建單後、廠商出貨前、可隨時補追蹤編號 / 付款里程碑 / 帳款年月 / 報關行
  const patchMilestone = useCallback(
    async (patch: Parameters<typeof patchPo>[1]) => {
      if (!doc) return;
      setBusy(true);
      setError(null);
      try {
        await patchPo(doc.id, patch);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : '存檔失敗');
      } finally {
        setBusy(false);
      }
    },
    [doc, load],
  );

  const openToRr = () => {
    if (!doc) return;
    const next: Record<string, { on: boolean; qty: string }> = {};
    for (const it of doc.items) {
      const remain = it.qty - it.receivedQty - (it.cancelledQty ?? 0);
      next[it.id] = { on: remain > 0, qty: remain > 0 ? String(remain) : '0' };
    }
    setRrPick(next);
    setRrWh('');
    setShowRr(true);
  };

  if (loading) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (error || !doc) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">{error ?? '找不到'}</div>;
  }

  // T1-fix 2026-06-07：依 9 階狀態決定按鈕（三版本一致、不簡化）
  // 流程：DRAFT →〔送審〕→ PENDING_APPROVAL →〔核准/退件〕→ APPROVED →〔寄出〕→ SUBMITTED →〔廠商確認〕→ CONFIRMED → 轉進貨 → PARTIAL_RECEIVED / RECEIVED → CLOSED
  const isDraft = statusIs(doc.status, ...ST_DRAFT);
  const isPendingApproval = statusIs(doc.status, ...ST_PENDING_APPROVAL);
  const isApproved = statusIs(doc.status, ...ST_APPROVED);
  const isSubmitted = statusIs(doc.status, ...ST_SUBMITTED);
  const isConfirmed = statusIs(doc.status, ...ST_CONFIRMED);
  const isPartialReceived = statusIs(doc.status, ...ST_PARTIAL_RECEIVED);
  const isReceived = statusIs(doc.status, ...ST_RECEIVED);
  const canVoid = isDraft;
  const canSubmitForReview = isDraft;             // DRAFT → PENDING_APPROVAL
  const canApprove = isPendingApproval;           // PENDING_APPROVAL → APPROVED（T1-fix-b 加 canApprove 權限 gate）
  const canReject = isPendingApproval;            // PENDING_APPROVAL → DRAFT（同上 gate）
  const canSendToSupplier = isApproved;           // APPROVED → SUBMITTED
  const canSupplierConfirm = isSubmitted;         // SUBMITTED → CONFIRMED（觸發應付）
  const canToRr = (isConfirmed || isPartialReceived) && doc.items.some((it) => it.qty - it.receivedQty - (it.cancelledQty ?? 0) > 0);
  const canClose = isReceived;

  const runStatus = async (next: string, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    try {
      await patchPoStatus(doc.id, next);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">採購單</p>
          <h1 className="text-xl font-semibold">採購 {doc.docNo}</h1>
          <p className="text-sm text-muted-foreground">
            {poStatusLabel(doc.status)} · {doc.poDate} · {doc.supplierName}
          </p>
          {/* T2-a 進貨對齊批次 2026-06-07：預計到貨日 UI 暴露
              · DRAFT 階段可編輯（onBlur 直接 patch、不另開 modal）
              · 其他階段唯讀顯示 */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>預計到貨：</span>
            {isDraft ? (
              <input
                type="date"
                className="rounded border border-border bg-background px-2 py-0.5 text-xs"
                value={doc.expectedDate ?? ''}
                min={doc.poDate}
                disabled={busy}
                onChange={(e) => {
                  const v = e.target.value;
                  setDoc((d) => (d ? { ...d, expectedDate: v || null } : d));
                }}
                onBlur={async (e) => {
                  const v = e.target.value.trim() || null;
                  setBusy(true);
                  try {
                    await patchPo(doc.id, { expectedDate: v });
                    await load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '預計到貨日存檔失敗');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : (
              <span className="text-foreground">{doc.expectedDate ?? '—'}</span>
            )}
          </div>
          {/* T1：審計時間印（核准 / 寄出 / 廠商確認） */}
          {(doc.submittedForReviewAt || doc.approvedAt || doc.sentAt || doc.supplierConfirmedAt) ? (
            <p className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              {doc.submittedForReviewAt ? <span>送審 {doc.submittedForReviewAt.slice(0, 10)}</span> : null}
              {doc.approvedAt ? <span>核准 {doc.approvedAt.slice(0, 10)}</span> : null}
              {doc.sentAt ? <span>寄出廠商 {doc.sentAt.slice(0, 10)}</span> : null}
              {doc.supplierConfirmedAt ? <span>廠商確認 {doc.supplierConfirmedAt.slice(0, 10)}</span> : null}
            </p>
          ) : null}
        </div>
        <Link href="/dashboard/purchase/po" className="text-sm text-muted-foreground underline">
          返回
        </Link>
      </header>

      {/* T1：退件原因 banner（status=DRAFT 且歷史曾被退件、提醒業務員修改後重送） */}
      {isDraft && doc.rejectReason ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
          <span className="font-semibold text-amber-300">退件原因：</span>
          <span className="text-amber-100">{doc.rejectReason}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canSubmitForReview ? (
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={busy}
            onClick={() => runStatus('PENDING_APPROVAL', '送審給主管核准？')}
          >
            送審
          </button>
        ) : null}
        {canApprove ? (
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => runStatus('APPROVED', '核准此採購單？（會寫 approvedBy=您）')}
          >
            核准
          </button>
        ) : null}
        {canReject ? (
          <button
            type="button"
            className="rounded-lg border border-amber-500/50 px-3 py-1.5 text-sm text-amber-300 disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              setRejectReason('');
              setShowReject(true);
            }}
          >
            退件
          </button>
        ) : null}
        {canSendToSupplier ? (
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={busy}
            onClick={() => runStatus('SUBMITTED', '寄出給廠商？')}
          >
            寄出廠商
          </button>
        ) : null}
        {canSupplierConfirm ? (
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => runStatus('CONFIRMED', '廠商確認接單？（會自動產生應付帳款、業務語意「先款後貨」）')}
          >
            廠商確認接單
          </button>
        ) : null}
        {canToRr ? (
          <button type="button" className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium disabled:opacity-50" disabled={busy} onClick={openToRr}>
            轉進貨
          </button>
        ) : null}
        {canClose ? (
          <button
            type="button"
            className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            disabled={busy}
            onClick={() => runStatus('CLOSED', '結案此採購單？')}
          >
            結案
          </button>
        ) : null}
        {canVoid ? (
          <button
            type="button"
            className="rounded-lg border border-destructive/50 px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              if (!confirm('作廢採購單？')) return;
              setBusy(true);
              try {
                await voidPo(doc.id);
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : '失敗');
              } finally {
                setBusy(false);
              }
            }}
          >
            作廢
          </button>
        ) : null}
        {/* 終態提示 */}
        {statusIs(doc.status, ...ST_CLOSED, ...ST_CANCELLED) ? (
          <p className="self-center text-xs text-muted-foreground">{poStatusLabel(doc.status)}（終態、無可執行動作）</p>
        ) : null}
      </div>

      {/* T6 進貨對齊批次 2026-06-08：B 級小欄位（採購里程碑 / 物流 / 帳款 / 報關行）
          終態（CLOSED / CANCELLED）唯讀；其他階段允許 inline 編輯（onBlur 直接 patch、不另開 modal）。
          - 國內物流追蹤編號 / 國內付款里程碑：purchase_type=D/B 顯示（國外見既有 paidAt / arrivedAt 等 6 階段）
          - 報關行：purchase_type=I 顯示
          - 帳款年月：所有採購類型通用 */}
      {!statusIs(doc.status, ...ST_CLOSED, ...ST_CANCELLED) ? (
        <fieldset className="grid gap-3 rounded-xl border border-border/60 bg-card/40 p-4 text-sm md:grid-cols-2 lg:grid-cols-4">
          <legend className="px-1 text-xs font-medium tracking-wider text-muted-foreground">採購里程碑 / 物流</legend>
          {doc.purchaseType !== 'I' ? (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              國內物流追蹤編號
              <input
                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                placeholder="例：黑貓 1234567890"
                defaultValue={doc.domesticTrackingNo ?? ''}
                maxLength={50}
                disabled={busy}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (doc.domesticTrackingNo ?? '')) void patchMilestone({ domesticTrackingNo: v || null });
                }}
              />
            </label>
          ) : null}
          {doc.purchaseType !== 'I' ? (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              國內付款里程碑
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                value={doc.paymentMilestone ?? ''}
                disabled={busy}
                onChange={(e) => {
                  const v = e.target.value;
                  void patchMilestone({ paymentMilestone: (v || null) as 'N' | 'D' | null });
                }}
              >
                <option value="">未啟動</option>
                <option value="N">廠商已通知付款</option>
                <option value="D">已付款</option>
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            帳款年月（月結）
            <input
              type="month"
              className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              defaultValue={doc.apMonth ?? ''}
              disabled={busy}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (doc.apMonth ?? '')) void patchMilestone({ apMonth: v || null });
              }}
            />
          </label>
          {doc.purchaseType === 'I' ? (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              報關行廠商
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                value={doc.customsAgentPartnerId ?? ''}
                disabled={busy}
                onChange={(e) => {
                  const v = e.target.value;
                  void patchMilestone({ customsAgentPartnerId: v || null });
                }}
              >
                <option value="">未指派</option>
                {customsAgents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{p.code}）
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </fieldset>
      ) : (
        // 終態唯讀顯示
        (doc.domesticTrackingNo || doc.paymentMilestone || doc.apMonth || doc.customsAgentPartnerId) ? (
          <div className="grid gap-2 rounded-xl border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-4">
            {doc.domesticTrackingNo ? <div>物流：<span className="text-foreground">{doc.domesticTrackingNo}</span></div> : null}
            {doc.paymentMilestone ? <div>付款：<span className="text-foreground">{PAYMENT_MILESTONE_LABEL[doc.paymentMilestone] ?? doc.paymentMilestone}</span></div> : null}
            {doc.apMonth ? <div>帳款年月：<span className="text-foreground">{doc.apMonth}</span></div> : null}
            {doc.customsAgentPartnerId ? <div>報關行：<span className="text-foreground font-mono">{customsAgents.find((p) => p.id === doc.customsAgentPartnerId)?.name ?? doc.customsAgentPartnerId}</span></div> : null}
          </div>
        ) : null
      )}

      {/* T7 進貨對齊批次 2026-06-08：對象分開（付款 / 指送 / 收貨地址 / 直送現場）
          業務語意：母公司付款、分店收貨、或直送客戶現場不進倉。
          4 欄全 nullable、null = 跟 supplier 同（UI 顯示「跟供應商同」hint）。
          終態（CLOSED/CANCELLED）唯讀條列；其他階段 inline 編輯。 */}
      {!statusIs(doc.status, ...ST_CLOSED, ...ST_CANCELLED) ? (
        <fieldset className="grid gap-3 rounded-xl border border-border/60 bg-card/40 p-4 text-sm md:grid-cols-2 lg:grid-cols-4">
          <legend className="px-1 text-xs font-medium tracking-wider text-muted-foreground">對象與地址</legend>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            付款對象（發票收件）
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              value={doc.invoiceToPartnerId ?? ''}
              disabled={busy}
              onChange={(e) => {
                const v = e.target.value;
                void patchMilestone({ invoiceToPartnerId: v || null });
              }}
            >
              <option value="">跟供應商同（{doc.supplierName}）</option>
              {allPartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}（{p.code}）
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            指送對象（收貨方）
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              value={doc.shipToPartnerId ?? ''}
              disabled={busy}
              onChange={(e) => {
                const v = e.target.value;
                // 改指送對象 → 清地址（地址必屬該 partner、不可跨）
                void patchMilestone({ shipToPartnerId: v || null, shipToAddressId: null });
              }}
            >
              <option value="">跟供應商同（{doc.supplierName}）</option>
              {allPartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}（{p.code}）
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            收貨地址（主檔）
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              value={doc.shipToAddressId ?? ''}
              disabled={busy || shipToAddresses.length === 0}
              onChange={(e) => {
                const v = e.target.value;
                void patchMilestone({ shipToAddressId: v || null });
              }}
            >
              <option value="">使用預設地址</option>
              {shipToAddresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label ?? '(無標籤)'}
                  {a.isDefault ? ' ⭐' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            交貨地點（直送現場）
            <input
              className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              placeholder="例：台北市信義區工地 A 棟"
              defaultValue={doc.deliveryAddress ?? ''}
              maxLength={200}
              disabled={busy}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (doc.deliveryAddress ?? '')) void patchMilestone({ deliveryAddress: v || null });
              }}
            />
          </label>
        </fieldset>
      ) : (
        // 終態唯讀條列
        (doc.invoiceToPartnerId || doc.shipToPartnerId || doc.shipToAddressId || doc.deliveryAddress) ? (
          <div className="grid gap-2 rounded-xl border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-4">
            {doc.invoiceToPartnerId ? <div>付款對象：<span className="text-foreground">{allPartners.find((p) => p.id === doc.invoiceToPartnerId)?.name ?? doc.invoiceToPartnerId}</span></div> : null}
            {doc.shipToPartnerId ? <div>指送對象：<span className="text-foreground">{allPartners.find((p) => p.id === doc.shipToPartnerId)?.name ?? doc.shipToPartnerId}</span></div> : null}
            {doc.shipToAddressId ? <div>收貨地址：<span className="text-foreground font-mono">{shipToAddresses.find((a) => a.id === doc.shipToAddressId)?.label ?? doc.shipToAddressId}</span></div> : null}
            {doc.deliveryAddress ? <div className="md:col-span-2 lg:col-span-1">直送現場：<span className="text-foreground">{doc.deliveryAddress}</span></div> : null}
          </div>
        ) : null
      )}

      {/* T1：退件 modal（要填原因） */}
      {showReject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-4 shadow-lg">
            <h2 className="text-lg font-semibold">退件採購單</h2>
            <p className="mt-1 text-sm text-muted-foreground">填寫退件原因、業務員會看到此訊息修改後重送。</p>
            <textarea
              className="mt-3 w-full rounded-md border bg-background p-2 text-sm"
              rows={4}
              placeholder="例：單價超出本月預算上限、請改為 NET60 付款後再送"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setShowReject(false)}>
                取消
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                disabled={busy || !rejectReason.trim()}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await rejectPo(doc.id, rejectReason.trim());
                    setShowReject(false);
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '退件失敗');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                確定退件
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">料號</th>
              <th className="px-3 py-2 text-right">採購量</th>
              <th className="px-3 py-2 text-right">已收</th>
              <th className="px-3 py-2 text-right">單價</th>
              <th className="px-3 py-2 text-right">小計</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it) => {
              // 03 收尾 A 2026-06-08：剩餘可收 = qty - receivedQty - cancelledQty
              const cancelled = it.cancelledQty ?? 0;
              const remain = it.qty - it.receivedQty - cancelled;
              // 可取消條件：CONFIRMED 或 PARTIAL_RECEIVED 階段（已下單給廠商、廠商出不出貨才需取消剩餘）
              const canCancelRemain = remain > 0 && (isConfirmed || isPartialReceived);
              return (
                <tr key={it.id} className="border-b border-border/50 align-top">
                  <td className="px-3 py-2">{it.lineNo}</td>
                  {/* T8 進貨對齊批次 2026-06-08：樣式 A — 我方料號主行 + 廠牌料號小字下行（空白隱藏） */}
                  <td className="px-3 py-2 font-mono text-xs">
                    <div>{it.partNo}</div>
                    {it.secCode ? (
                      <div className="mt-0.5 text-[10px] text-muted-foreground" title="廠牌料號">
                        {it.secCode}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <div>{it.receivedQty}</div>
                    {/* 03 收尾 A：取消量小字 + 取消剩餘按鈕（CONFIRMED/PARTIAL_RECEIVED 顯示） */}
                    {cancelled > 0 ? (
                      <div className="mt-0.5 text-[10px] text-amber-400" title="已取消量">取消 {cancelled}</div>
                    ) : null}
                    {canCancelRemain ? (
                      <button
                        type="button"
                        className="mt-1 text-[10px] text-amber-400 underline decoration-dotted hover:text-amber-300 disabled:opacity-40"
                        disabled={busy}
                        title="把這 line 剩餘可收量設為已取消、不再期待廠商出貨（用於缺貨／部分到貨後收尾）"
                        onClick={async () => {
                          if (!confirm(`取消 ${it.partNo} 的剩餘 ${remain} 個？\n（設定後本筆不能再轉進貨、PO 可走結案）`)) return;
                          setBusy(true);
                          try {
                            await patchPoItem(doc.id, it.id, { cancelledQty: cancelled + remain });
                            await load();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : '取消剩餘失敗');
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        取消剩餘 ({remain})
                      </button>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.unitCost}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.lineAmount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showRr ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-4 shadow-lg">
            <h2 className="text-lg font-semibold">轉進貨</h2>
            <p className="mt-1 text-sm text-muted-foreground">選擇收貨倉庫與本次進貨數量（不可超過未收量）。</p>
            <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
              倉庫
              <select className="rounded-md border bg-background px-2 py-2 text-sm" value={rrWh} onChange={(e) => setRrWh(e.target.value)}>
                <option value="">請選擇</option>
                {whOpts.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <ul className="mt-4 space-y-2 text-sm">
              {doc.items.map((it) => {
                const remain = it.qty - it.receivedQty - (it.cancelledQty ?? 0);
                const row = rrPick[it.id] ?? { on: false, qty: '0' };
                return (
                  <li key={it.id} className="flex flex-wrap items-center gap-2 border-b py-2">
                    <input
                      type="checkbox"
                      disabled={remain <= 0}
                      checked={row.on}
                      onChange={(e) => setRrPick((p) => ({ ...p, [it.id]: { ...row, on: e.target.checked } }))}
                    />
                    <span className="font-mono text-xs">{it.partNo}</span>
                    <span className="text-xs text-muted-foreground">可收 {remain}</span>
                    <input
                      className="ml-auto w-20 rounded border px-1 tabular-nums"
                      disabled={!row.on}
                      value={row.qty}
                      onChange={(e) => setRrPick((p) => ({ ...p, [it.id]: { ...row, qty: e.target.value } }))}
                    />
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setShowRr(false)}>
                取消
              </button>
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                disabled={busy}
                onClick={async () => {
                  if (!rrWh.trim()) {
                    setError('請選倉庫');
                    return;
                  }
                  const items = [];
                  for (const it of doc.items) {
                    const row = rrPick[it.id];
                    if (!row?.on) continue;
                    const q = Number(row.qty);
                    if (!Number.isFinite(q) || q <= 0) continue;
                    items.push({ poItemId: it.id, qty: q });
                  }
                  if (!items.length) {
                    setError('請勾選明細');
                    return;
                  }
                  setBusy(true);
                  setError(null);
                  try {
                    const r = await poToRr(doc.id, { warehouseId: rrWh.trim(), items });
                    setShowRr(false);
                    router.push(`/dashboard/purchase/rr/${encodeURIComponent(r.id)}`);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '失敗');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                建立進貨
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}
    </div>
  );
}
