'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';

import { getRr, patchRr, postRr, voidRr } from '../../api/rr';
import type { RrDetailDto } from '@data/types/nx02';
import { rrStatusLabel } from '../../shared/nx01-labels';

// T2-c 進貨對齊批次 2026-06-07：瑕疵類型代碼對應顯示文字
const DEFECT_TYPE_LABEL: Record<string, string> = {
  D: '外觀損壞',
  F: '功能異常',
  W: '規格不符',
  O: '其他',
};

export function RrDetailView({ id }: { id: string }) {
  const [doc, setDoc] = useState<RrDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDoc(await getRr(id));
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

  if (loading) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (error || !doc) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">{error ?? '找不到'}</div>;
  }

  const draft = doc.status === 'D';

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX01</p>
          <h1 className="text-xl font-semibold">進貨 {doc.docNo}</h1>
          <p className="text-sm text-muted-foreground">
            {rrStatusLabel(doc.status)} · {doc.rrDate} · {doc.warehouseName} · {doc.supplierName}
          </p>
        </div>
        <Link href="/dashboard/purchase/rr" className="text-sm text-muted-foreground underline">
          返回
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        {draft ? (
          <>
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await postRr(doc.id);
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : '過帳失敗');
                } finally {
                  setBusy(false);
                }
              }}
            >
              過帳
            </button>
            <button
              type="button"
              className="rounded-lg border border-destructive/50 px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
              disabled={busy}
              onClick={async () => {
                if (!confirm('作廢草稿？')) return;
                setBusy(true);
                try {
                  await voidRr(doc.id);
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
          </>
        ) : null}
        {doc.status === 'P' ? (
          <Link
            href={`/dashboard/purchase/pr/new?rr=${encodeURIComponent(doc.id)}`}
            className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium"
          >
            由此進貨單建立退貨 →
          </Link>
        ) : null}
      </div>

      {/* M3-redo-3a：國外進貨提貨單（含匯率 + 費用攤分總計）— 國內 RR 不顯示 */}
      {doc.rrImport && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <h2 className="mb-2 text-sm font-semibold text-blue-300">🛳️ 國外進貨資訊（提貨單）</h2>
          {/* T6 進貨對齊批次 2026-06-08：提貨單號（報關行核發、報關行 email 通知後填入）
              限 DRAFT/INSPECTING 階段可編輯（POSTED 後依範式鎖定、避免改稽核點） */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-blue-300/80">提貨單號（D/O No）：</span>
            {draft || doc.status === 'INSPECTING' ? (
              <input
                className="rounded border border-blue-500/30 bg-background/40 px-2 py-1 font-mono text-foreground"
                defaultValue={doc.deliveryOrderNo ?? ''}
                placeholder="例：DO-2026-06-001"
                maxLength={50}
                disabled={busy}
                onBlur={async (e) => {
                  const v = e.target.value.trim();
                  if (v === (doc.deliveryOrderNo ?? '')) return;
                  setBusy(true);
                  try {
                    await patchRr(doc.id, { deliveryOrderNo: v || null });
                    await load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '存檔失敗');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : (
              <span className="font-mono text-foreground">{doc.deliveryOrderNo ?? '—'}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
            <div>
              <div className="text-muted-foreground">買入匯率（鎖定）</div>
              <div className="font-mono">{String(doc.rrImport.exchangeRate)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">海運費</div>
              <div className="font-mono">{String(doc.rrImport.freightCost)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">關稅</div>
              <div className="font-mono">{String(doc.rrImport.customsDuty)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">報關費</div>
              <div className="font-mono">{String(doc.rrImport.customsFee)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">倉儲費</div>
              <div className="font-mono">{String(doc.rrImport.storageFee)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">其他雜費</div>
              <div className="font-mono">{String(doc.rrImport.otherFee)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">進口費用合計</div>
              <div className="font-mono font-semibold text-blue-200">{String(doc.rrImport.totalImportCost)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">貿易條件</div>
              <div className="font-mono">{doc.rrImport.incoterm}</div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            進口費用「按金額比例」攤分到每料件（貴的料分多）。下表 actualUnitCost 為實際入庫成本（含換匯 + 攤分）。
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">料號</th>
              <th className="px-3 py-2">庫位</th>
              <th className="px-3 py-2 text-right">數量</th>
              <th className="px-3 py-2 text-right" title="原始單價（國內=TWD / 國外=外幣未換匯）">單價</th>
              {doc.rrImport && (
                <>
                  <th className="px-3 py-2 text-right text-blue-300" title="攤分到此料的進口費用（按金額比例）">攤分費用</th>
                  <th className="px-3 py-2 text-right text-emerald-300" title="實際入庫成本（含換匯+攤分、過帳移動平均用）">入庫成本</th>
                </>
              )}
              <th className="px-3 py-2 text-right">小計</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it) => {
              const defectN = it.defectQty != null ? Number(it.defectQty) : 0;
              const hasDefect = defectN > 0;
              const showVerifyRow =
                it.expectedQty != null ||
                it.actualQty != null ||
                hasDefect ||
                !!it.batchNo ||
                !!it.warrantyExpiredAt;
              return (
                <Fragment key={it.id}>
                  <tr className="border-b border-border/50 align-top">
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
                    <td className="px-3 py-2">{it.locationCode ?? it.locationId}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.unitCost}</td>
                    {doc.rrImport && (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-300">
                          {it.allocatedImportFee != null ? String(it.allocatedImportFee) : '0'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-300">
                          {it.actualUnitCost != null ? String(it.actualUnitCost) : String(it.unitCost)}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2 text-right tabular-nums">{it.lineAmount}</td>
                  </tr>
                  {/* T2-c 進貨對齊批次 2026-06-07：驗收欄位（預期/實際/瑕疵/批號/保固到期）唯讀顯示 */}
                  {showVerifyRow ? (
                    <tr className="border-b border-border/30 bg-muted/5">
                      <td colSpan={doc.rrImport ? 8 : 6} className="px-3 py-1.5">
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-5">
                          <div>
                            預期量 <span className="ml-1 tabular-nums text-foreground">{it.expectedQty != null ? String(it.expectedQty) : '—'}</span>
                          </div>
                          <div>
                            實際量 <span className="ml-1 tabular-nums text-foreground">{it.actualQty != null ? String(it.actualQty) : '—'}</span>
                          </div>
                          <div>
                            瑕疵量{' '}
                            <span className={`ml-1 tabular-nums ${hasDefect ? 'font-semibold text-amber-400' : 'text-foreground'}`}>
                              {it.defectQty != null ? String(it.defectQty) : '0'}
                            </span>
                          </div>
                          <div>
                            批號 <span className="ml-1 font-mono text-foreground">{it.batchNo ?? '—'}</span>
                          </div>
                          <div>
                            保固到期 <span className="ml-1 tabular-nums text-foreground">{it.warrantyExpiredAt ? it.warrantyExpiredAt.slice(0, 10) : '—'}</span>
                          </div>
                          {hasDefect ? (
                            <div className="sm:col-span-5 text-amber-300">
                              瑕疵類型：{it.defectType ? `${it.defectType} ${DEFECT_TYPE_LABEL[it.defectType] ?? ''}` : '—'} ／ 描述：
                              <span className="text-foreground">{it.defectDesc ?? '—'}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}
    </div>
  );
}
