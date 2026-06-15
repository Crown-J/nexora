// apps/nx-ui/src/features/purchase/foreign/ForeignPurchaseView.tsx
// v1.2 階段 I P4：國外進貨 UI
//
// 業務語意：blueprint §3.7 國外採購 6 階段
//   1=備貨中 / 2=要求付款 / 3=待出貨 / 4=出貨上船 / 5=已到港 / 6=驗收完成
//
// 範式：
//   - 左：國外 PO 列表（purchaseType='I' 過濾、後端 filter）
//   - 右：選定 PO 的 6 階段 timeline + 推進按鈕（PATCH /:id/stage）
//   - 不含 IntlShipping / Parcel CRUD（後續軌另接）

'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Plane, RefreshCw, Ship } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  getForeignPo,
  listForeignPos,
  transitStage,
  type ForeignPo,
  type ForeignPoDetail,
  type PurchaseStage,
} from '@data/endpoints/purchase/foreign/api';

const STAGES: ReadonlyArray<{
  no: PurchaseStage;
  label: string;
  desc: string;
  icon: typeof Ship;
}> = [
  { no: 1, label: '備貨中', desc: '廠商正在備貨', icon: CheckCircle2 },
  { no: 2, label: '要求付款', desc: '廠商通知付款', icon: ArrowRight },
  { no: 3, label: '待出貨', desc: '已付款、等廠商出貨', icon: ArrowRight },
  { no: 4, label: '出貨上船', desc: '貨櫃已上船、船期確認', icon: Ship },
  { no: 5, label: '已到港', desc: '報關行通知到港', icon: Plane },
  { no: 6, label: '驗收完成', desc: '入庫驗收完成', icon: CheckCircle2 },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  APPROVED: '已核可',
  SUBMITTED: '已送供應商',
  CONFIRMED: '廠商已確認',
  PARTIAL_RECEIVED: '部分已收',
  RECEIVED: '全部已收',
  CLOSED: '已結案',
  CANCELLED: '已取消',
  D: '草稿',
  P: '已過帳',
};

function StageBadge({ stage }: { stage: number | null | undefined }) {
  if (!stage) return <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">未啟用</span>;
  const cfg = STAGES.find((s) => s.no === stage);
  return (
    <span className="rounded bg-[#4D8FE8]/15 px-2 py-0.5 text-[10px] text-[#4D8FE8]">
      階段 {stage}：{cfg?.label ?? '—'}
    </span>
  );
}

export function ForeignPurchaseView() {
  const [rows, setRows] = useState<ForeignPo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ForeignPoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [transitBusy, setTransitBusy] = useState<number | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listForeignPos({ pageSize: 50 });
      setRows(res.rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const res = await getForeignPo(id);
      setDetail(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handleTransit = async (targetStage: PurchaseStage) => {
    if (!detail) return;
    setTransitBusy(targetStage);
    setError(null);
    try {
      await transitStage(detail.id, targetStage);
      await loadDetail(detail.id);
      await loadList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTransitBusy(null);
    }
  };

  const currentStage = detail?.purchaseStage ?? 1;
  const items = detail?.items ?? detail?.rev_Nx02PoItem_poId ?? [];

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">PURCHASE · FOREIGN</p>
          <h1 className="text-xl font-semibold">國外進貨</h1>
          <p className="text-sm text-muted-foreground">
            6 階段追蹤：備貨中 → 要求付款 → 待出貨 → 出貨上船 → 已到港 → 驗收完成
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadList()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:border-primary/50 disabled:opacity-50"
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          重新整理
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* 左：國外 PO 列表 */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            國外採購單（{rows.length}）
          </h2>
          {rows.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
              尚無國外採購單
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((po) => (
                <li key={po.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(po.id)}
                    className={cn(
                      'w-full space-y-2 rounded-lg border p-3 text-left transition-colors',
                      selectedId === po.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/70 hover:border-primary/40 hover:bg-muted/20',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm">{po.docNo}</span>
                      <StageBadge stage={po.purchaseStage} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{po.poDate?.slice(0, 10)}</span>
                      <span>·</span>
                      <span>{STATUS_LABEL[po.status] ?? po.status}</span>
                      <span>·</span>
                      <span className="tabular-nums">{Number(po.totalAmount).toLocaleString('zh-TW')}</span>
                    </div>
                    {po.vesselNo || po.containerNo ? (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {po.vesselNo ? <span>船號 {po.vesselNo}</span> : null}
                        {po.containerNo ? <span>櫃 {po.containerNo}</span> : null}
                        {po.eta ? <span>ETA {po.eta?.slice(0, 10)}</span> : null}
                      </div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 右：詳情 + 6 階段 timeline */}
        <section className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-4">
          {!selectedId ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              請從左側選擇一張國外採購單以追蹤階段
            </div>
          ) : detailLoading || !detail ? (
            <div className="py-12 text-center text-sm text-muted-foreground">載入中…</div>
          ) : (
            <>
              <header className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-mono text-lg">{detail.docNo}</h2>
                  <StageBadge stage={detail.purchaseStage} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{STATUS_LABEL[detail.status] ?? detail.status}</span>
                  <span>·</span>
                  <span>{detail.poDate?.slice(0, 10)}</span>
                  {detail.incoterm ? (
                    <>
                      <span>·</span>
                      <span>貿易條件 {detail.incoterm}</span>
                    </>
                  ) : null}
                  {detail.paymentTermImport ? (
                    <>
                      <span>·</span>
                      <span>付款 {detail.paymentTermImport}</span>
                    </>
                  ) : null}
                </div>
              </header>

              {/* 6 階段 timeline */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  階段追蹤
                </h3>
                <ol className="space-y-2">
                  {STAGES.map((s) => {
                    const Icon = s.icon;
                    const isDone = currentStage > s.no;
                    const isCurrent = currentStage === s.no;
                    const ts =
                      s.no === 2 ? detail.requestedPaymentAt
                      : s.no === 3 ? detail.paidAt
                      : s.no === 4 ? detail.shippedAt
                      : s.no === 5 ? detail.arrivedAt
                      : null;
                    return (
                      <li
                        key={s.no}
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-3 transition-colors',
                          isDone
                            ? 'border-[#1D9E75]/40 bg-[#1D9E75]/5'
                            : isCurrent
                              ? 'border-[#E8A020]/40 bg-[#E8A020]/5'
                              : 'border-border/50 bg-background',
                        )}
                      >
                        <div
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-full',
                            isDone
                              ? 'bg-[#1D9E75] text-white'
                              : isCurrent
                                ? 'bg-[#E8A020] text-black'
                                : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {s.no}. {s.label}
                            </span>
                            {ts ? (
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(ts).toLocaleString('zh-TW')}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">{s.desc}</div>
                        </div>
                        {isCurrent && s.no < 6 ? (
                          <button
                            type="button"
                            onClick={() => void handleTransit((s.no + 1) as PurchaseStage)}
                            disabled={transitBusy !== null}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {transitBusy === s.no + 1 ? '推進中…' : `推進至 ${s.no + 1}`}
                            <ArrowRight className="size-3" />
                          </button>
                        ) : null}
                        {isCurrent && s.no > 1 ? (
                          <button
                            type="button"
                            onClick={() => void handleTransit((s.no - 1) as PurchaseStage)}
                            disabled={transitBusy !== null}
                            className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/30 disabled:opacity-50"
                          >
                            回退
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
                <p className="text-[10px] text-muted-foreground">
                  ⓘ 推進採線性流轉、回退任意階段（Crown Q-C3-detail=b 拍板）
                </p>
              </div>

              {/* 提貨 / 物流資訊（stage ≥ 4 顯示） */}
              {currentStage >= 4 ? (
                <div className="rounded-md border border-border/50 bg-background p-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    提貨資訊
                  </h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">船號</dt>
                      <dd className="font-mono">{detail.vesselNo ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">貨櫃號</dt>
                      <dd className="font-mono">{detail.containerNo ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">預計到港 ETA</dt>
                      <dd className="font-mono">{detail.eta?.slice(0, 10) ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">實際到港</dt>
                      <dd className="font-mono">
                        {detail.arrivedAt ? new Date(detail.arrivedAt).toLocaleString('zh-TW') : '—'}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    ⓘ 船號 / 貨櫃號 / ETA 編輯入口在既有 PO 編輯頁、本頁僅顯示。實體提貨單與包裹拆分另接 NX03 Parcel（後續軌）。
                  </p>
                </div>
              ) : null}

              {/* 明細 */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  明細（{items.length}）
                </h3>
                <div className="overflow-x-auto rounded-md border border-border/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/30 text-[10px] text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5">料號</th>
                        <th className="px-2 py-1.5">品名</th>
                        <th className="px-2 py-1.5 text-right">採購量</th>
                        <th className="px-2 py-1.5 text-right">已收</th>
                        <th className="px-2 py-1.5 text-right">小計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id} className="border-t border-border/30">
                          <td className="px-2 py-1.5 font-mono">{it.partNo}</td>
                          <td className="px-2 py-1.5">{it.partName}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{it.qty}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{it.receivedQty}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{it.lineAmount}</td>
                        </tr>
                      ))}
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                            無明細
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
