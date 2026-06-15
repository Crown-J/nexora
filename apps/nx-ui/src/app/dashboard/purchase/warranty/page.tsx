// apps/nx-ui/src/app/dashboard/purchase/warranty/page.tsx
// LITE 階段 1 M3：保固申請單列表頁（minimal viewable + status 流轉）

'use client';

import { useEffect, useState } from 'react';
import {
  createAttachment,
  createWarrantyClaim,
  listWarrantyClaims,
  registerResult,
  startReviewWarrantyClaim,
  submitWarrantyClaim,
  voidWarrantyClaim,
} from '@/features/nx03/warranty-claim/api/warranty-claim';
import {
  CLAIM_RESULT_LABEL,
  CLAIM_STATUS_LABEL,
  CLAIM_TYPE_LABEL,
  type ClaimResult,
  type ClaimType,
  type WarrantyClaimDto,
} from '@data/types/nx03/warranty-claim';
import {
  TieredField,
  TieredFormProvider,
  TieredFormToolbar,
} from '@/features/shared/tiered-form';

type CreateForm = {
  claimType: ClaimType;
  sourceSoId: string;
  sourceSoNo: string;
  supplierId: string;
  partId: string;
  qty: string;
  claimDate: string;
  issueDescription: string;
  remark: string;
};

const EMPTY_FORM: CreateForm = {
  claimType: 'SELF',
  sourceSoId: '',
  sourceSoNo: '',
  supplierId: '',
  partId: '',
  qty: '1',
  claimDate: new Date().toISOString().slice(0, 10),
  issueDescription: '',
  remark: '',
};

export default function WarrantyClaimListPage() {
  const [rows, setRows] = useState<WarrantyClaimDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);

  // result registration inline state
  const [resultDraft, setResultDraft] = useState<
    Record<
      string,
      {
        result: ClaimResult;
        remark: string;
        // v1.2 階段 F P5-B (3)：REF 退款相關
        refundAmount?: string;
        refundMethod?: 'O' | 'A' | 'R';
      }
    >
  >({});
  // v1.2 階段 F P5-B (3)：cost 快取（每筆 partId 對應建議退款單價）
  const [partCostCache, setPartCostCache] = useState<Record<string, number>>({});

  // M3-redo-3b：附件 upload inline state
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadHint, setUploadHint] = useState<Record<string, string>>({});

  async function onUploadFile(claimId: string, file: File, fileType: 'LIC' | 'PHO' | 'VID') {
    setUploadingId(claimId);
    setUploadHint((s) => ({ ...s, [claimId]: '讀檔中…' }));
    try {
      const base64 = await fileToBase64(file);
      setUploadHint((s) => ({ ...s, [claimId]: '上傳中…' }));
      const att = await createAttachment(claimId, {
        fileType,
        base64Content: base64,
        origFilename: file.name,
        mimeType: file.type || 'application/octet-stream',
      });
      setUploadHint((s) => ({ ...s, [claimId]: `✅ 已上傳 ${att.origFilename}（${(att.fileSize / 1024).toFixed(0)} KB）` }));
      setTimeout(() => setUploadHint((s) => ({ ...s, [claimId]: '' })), 4000);
    } catch (e) {
      setUploadHint((s) => ({ ...s, [claimId]: `❌ ${(e as Error).message}` }));
    } finally {
      setUploadingId(null);
    }
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listWarrantyClaims({ pageSize: 50 });
      setRows(res.rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onCreate() {
    if (!form.supplierId.trim() || !form.partId.trim() || !form.issueDescription.trim()) {
      setError('請填必要欄位：supplierId / partId / issueDescription');
      return;
    }
    if (form.claimType === 'CUST' && !form.sourceSoId.trim()) {
      setError('客訴型必須填 sourceSoId（SO 還沒做、暫填佔位 ID）');
      return;
    }
    try {
      await createWarrantyClaim({
        claimType: form.claimType,
        sourceSoId: form.sourceSoId.trim() || undefined,
        sourceSoNo: form.sourceSoNo.trim() || undefined,
        supplierId: form.supplierId.trim(),
        partId: form.partId.trim(),
        qty: Number(form.qty),
        claimDate: form.claimDate,
        issueDescription: form.issueDescription.trim(),
        remark: form.remark.trim() || undefined,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doTransition(id: string, action: 'submit' | 'startReview' | 'void') {
    setBusyId(id);
    try {
      if (action === 'submit') await submitWarrantyClaim(id);
      else if (action === 'startReview') await startReviewWarrantyClaim(id);
      else await voidWarrantyClaim(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function doRegisterResult(id: string) {
    const draft = resultDraft[id];
    if (!draft || !draft.remark.trim()) {
      setError('請填審核回覆說明');
      return;
    }
    // v1.2 階段 F P5-B (3)：REF 退錢必填金額+方式（後端也會檢、前端提前 fail-fast）
    if (draft.result === 'REF') {
      const amt = Number(draft.refundAmount ?? '');
      if (!Number.isFinite(amt) || amt <= 0) {
        setError('退錢必填「退款金額」> 0');
        return;
      }
      if (!draft.refundMethod) {
        setError('退錢必選「退款方式」（O 下次扣抵 / A 折讓單 / R 直接退現）');
        return;
      }
    }
    setBusyId(id);
    try {
      await registerResult(id, {
        result: draft.result,
        resultRemark: draft.remark.trim(),
        ...(draft.result === 'REF'
          ? {
              refundAmount: Number(draft.refundAmount),
              refundMethod: draft.refundMethod,
            }
          : {}),
      });
      setResultDraft((s) => ({ ...s, [id]: { result: 'NEW', remark: '' } }));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  // v1.2 階段 F P5-B (3)：拿 part.cost 算建議退款金額（進貨成本 × 理賠數量）
  async function loadSuggestedRefund(partId: string, qty: string): Promise<number | null> {
    try {
      let cost = partCostCache[partId];
      if (cost == null) {
        const { getPart } = await import('@/features/shared/master/part/api/part');
        const part = await getPart(partId);
        cost = Number(part.cost ?? 0);
        setPartCostCache((s) => ({ ...s, [partId]: cost }));
      }
      const q = Number(qty);
      if (!Number.isFinite(cost) || !Number.isFinite(q)) return null;
      return Number((cost * q).toFixed(2));
    } catch {
      return null;
    }
  }

  // result 切到 REF 時自動帶建議值
  async function handleResultChange(rowId: string, partId: string, qty: string, newResult: ClaimResult) {
    setResultDraft((s) => ({
      ...s,
      [rowId]: {
        result: newResult,
        remark: s[rowId]?.remark ?? '',
        refundAmount: s[rowId]?.refundAmount,
        refundMethod: s[rowId]?.refundMethod,
      },
    }));
    if (newResult === 'REF' && !resultDraft[rowId]?.refundAmount) {
      const suggested = await loadSuggestedRefund(partId, qty);
      if (suggested != null) {
        setResultDraft((s) => ({
          ...s,
          [rowId]: {
            ...(s[rowId] ?? { result: newResult, remark: '' }),
            refundAmount: suggested.toFixed(2),
          },
        }));
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">保固申請單</h1>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-emerald-500/80 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          {showForm ? '取消' : '+ 新建保固申請'}
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">{error}</div>}

      {showForm && (
        <TieredFormProvider defaultMode="lite">
        <div className="mb-6 rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">新建保固申請</h2>
            <TieredFormToolbar />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TieredField tier="required" label="申請類型">
              <select
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.claimType}
                onChange={(e) => setForm({ ...form, claimType: e.target.value as ClaimType })}
              >
                {(['SELF', 'CUST'] as ClaimType[]).map((t) => (
                  <option key={t} value={t}>{CLAIM_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </TieredField>
            <TieredField tier="required" label="申請日期">
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.claimDate}
                onChange={(e) => setForm({ ...form, claimDate: e.target.value })}
              />
            </TieredField>
            {form.claimType === 'CUST' && (
              <>
                <TieredField tier="required" label="來源銷貨單 ID" hint="⚠️ SO 還沒做、暫填佔位">
                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                    value={form.sourceSoId}
                    onChange={(e) => setForm({ ...form, sourceSoId: e.target.value })}
                    placeholder="NX04SO_XXXXXXX"
                  />
                </TieredField>
                <TieredField tier="recommended" label="來源銷貨單號" hint="snapshot 顯示用">
                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                    value={form.sourceSoNo}
                    onChange={(e) => setForm({ ...form, sourceSoNo: e.target.value })}
                    placeholder="SO-202606-Z01-00001"
                  />
                </TieredField>
              </>
            )}
            <TieredField tier="required" label="供應商 ID">
              <input
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                placeholder="NX01PTNR0000XXX"
              />
            </TieredField>
            <TieredField tier="required" label="零件 ID">
              <input
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.partId}
                onChange={(e) => setForm({ ...form, partId: e.target.value })}
                placeholder="NX01PART0000XXX"
              />
            </TieredField>
            <TieredField tier="required" label="數量">
              <input
                type="number"
                min={0}
                step="0.0001"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
            </TieredField>
            <TieredField tier="required" label="問題描述" className="md:col-span-2">
              <textarea
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.issueDescription}
                onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
                placeholder="例：第一次使用 3 個月後漏油、無撞擊痕跡"
              />
            </TieredField>
            <TieredField tier="advanced" label="備註" hint="內部紀錄、給供應商看的內容寫在問題描述" className="md:col-span-2">
              <textarea
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                placeholder="例：本批已通報業務 G、由 A 後續追蹤"
              />
            </TieredField>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-lg bg-emerald-500/80 px-4 py-2 text-sm hover:bg-emerald-500"
            >
              建立（草稿）
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              取消
            </button>
          </div>
        </div>
        </TieredFormProvider>
      )}

      {loading ? (
        <div className="text-white/60">載入中…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-12 text-center text-white/50">
          目前沒有保固申請單。點上方「+ 新建保固申請」建立第一筆。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/80">
              <tr>
                <th className="px-3 py-2 text-left">單號</th>
                <th className="px-3 py-2 text-left">類型</th>
                <th className="px-3 py-2 text-left">供應商</th>
                <th className="px-3 py-2 text-left">零件</th>
                <th className="px-3 py-2 text-right">數量</th>
                <th className="px-3 py-2 text-left">申請日</th>
                <th className="px-3 py-2 text-left">狀態</th>
                <th className="px-3 py-2 text-left">結果</th>
                <th className="px-3 py-2 text-left">動作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono text-xs">{r.docNo}</td>
                  <td className="px-3 py-2">{CLAIM_TYPE_LABEL[r.claimType]}</td>
                  <td className="px-3 py-2">{r.supplier?.code} {r.supplier?.name}</td>
                  <td className="px-3 py-2">{r.partNo} {r.partName}</td>
                  <td className="px-3 py-2 text-right">{r.qty}</td>
                  <td className="px-3 py-2">{r.claimDate?.slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    <span className={statusBadgeClass(r.status)}>{CLAIM_STATUS_LABEL[r.status]}</span>
                  </td>
                  <td className="px-3 py-2">{r.result ? CLAIM_RESULT_LABEL[r.result] : '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {r.status === 'D' && (
                        <button
                          disabled={busyId === r.id}
                          onClick={() => doTransition(r.id, 'submit')}
                          className="rounded bg-blue-500/70 px-2 py-1 text-xs hover:bg-blue-500"
                        >送出</button>
                      )}
                      {r.status === 'S' && (
                        <button
                          disabled={busyId === r.id}
                          onClick={() => doTransition(r.id, 'startReview')}
                          className="rounded bg-amber-500/70 px-2 py-1 text-xs hover:bg-amber-500"
                        >進入審核</button>
                      )}
                      {r.status === 'R' && (
                        <div className="flex flex-col gap-1">
                          <select
                            className="rounded bg-black/50 px-1 py-0.5 text-xs"
                            value={resultDraft[r.id]?.result ?? 'NEW'}
                            onChange={(e) => void handleResultChange(r.id, r.partId, r.qty, e.target.value as ClaimResult)}
                          >
                            {(['NEW', 'REF', 'RPR', 'REJ'] as ClaimResult[]).map((rv) => (
                              <option key={rv} value={rv}>{CLAIM_RESULT_LABEL[rv]}</option>
                            ))}
                          </select>
                          <input
                            className="rounded bg-black/50 px-1 py-0.5 text-xs"
                            placeholder="審核回覆"
                            value={resultDraft[r.id]?.remark ?? ''}
                            onChange={(e) => setResultDraft((s) => ({
                              ...s,
                              [r.id]: {
                                result: s[r.id]?.result ?? 'NEW',
                                remark: e.target.value,
                                refundAmount: s[r.id]?.refundAmount,
                                refundMethod: s[r.id]?.refundMethod,
                              },
                            }))}
                          />
                          {/* v1.2 階段 F P5-B (3)：REF 退錢時顯示金額 + 方式 */}
                          {resultDraft[r.id]?.result === 'REF' && (
                            <>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="rounded border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 font-mono text-xs text-amber-300"
                                placeholder="退款金額（建議=成本×數量）"
                                value={resultDraft[r.id]?.refundAmount ?? ''}
                                onChange={(e) => setResultDraft((s) => ({
                                  ...s,
                                  [r.id]: {
                                    result: s[r.id]?.result ?? 'REF',
                                    remark: s[r.id]?.remark ?? '',
                                    refundAmount: e.target.value,
                                    refundMethod: s[r.id]?.refundMethod,
                                  },
                                }))}
                                title="系統建議 = 進貨成本 × 理賠數量、業務可手動改"
                              />
                              <select
                                className="rounded border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-xs text-amber-300"
                                value={resultDraft[r.id]?.refundMethod ?? ''}
                                onChange={(e) => setResultDraft((s) => ({
                                  ...s,
                                  [r.id]: {
                                    result: s[r.id]?.result ?? 'REF',
                                    remark: s[r.id]?.remark ?? '',
                                    refundAmount: s[r.id]?.refundAmount,
                                    refundMethod: e.target.value as 'O' | 'A' | 'R',
                                  },
                                }))}
                              >
                                <option value="">— 退款方式 —</option>
                                <option value="O">O 下次扣抵（手動）</option>
                                <option value="A">A 折讓單（待核可）</option>
                                <option value="R">R 直接退現（手動）</option>
                              </select>
                              <div className="text-[10px] text-amber-300/70">
                                {resultDraft[r.id]?.refundMethod === 'A'
                                  ? '⚡ 登記後自動建 DRAFT 折讓單、財務核可後沖應付'
                                  : resultDraft[r.id]?.refundMethod === 'O'
                                    ? '純記錄、業務下次採購時手動扣'
                                    : resultDraft[r.id]?.refundMethod === 'R'
                                      ? '純記錄、用收付款開付款選沖應付'
                                      : ''}
                              </div>
                            </>
                          )}
                          <button
                            disabled={busyId === r.id}
                            onClick={() => doRegisterResult(r.id)}
                            className="rounded bg-emerald-500/70 px-2 py-1 text-xs hover:bg-emerald-500"
                          >登記結果</button>
                        </div>
                      )}
                      {(r.status === 'D' || r.status === 'S' || r.status === 'R') && (
                        <button
                          disabled={busyId === r.id}
                          onClick={() => doTransition(r.id, 'void')}
                          className="rounded bg-red-500/40 px-2 py-1 text-xs hover:bg-red-500/70"
                        >作廢</button>
                      )}

                      {/* M3-redo-3b：附件上傳 inline（行照/照片/影片 3 種、選檔後自動 upload）*/}
                      {r.status !== 'V' && (
                        <div className="mt-1 border-t border-white/10 pt-1">
                          <div className="text-[10px] text-white/40">📎 附件</div>
                          {(['LIC', 'PHO', 'VID'] as const).map((ft) => (
                            <label key={ft} className="block cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                accept={ft === 'LIC' ? 'image/*,application/pdf' : ft === 'PHO' ? 'image/*' : 'video/*'}
                                disabled={uploadingId === r.id}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    void onUploadFile(r.id, f, ft);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <span className="block rounded bg-white/5 px-2 py-0.5 text-xs hover:bg-white/15">
                                {ft === 'LIC' ? '行照' : ft === 'PHO' ? '照片' : '影片'} +
                              </span>
                            </label>
                          ))}
                          {uploadHint[r.id] && (
                            <div className="mt-1 text-[10px] text-white/60">{uploadHint[r.id]}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** M3-redo-3b：File → base64（不含 data URL prefix） */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader.result is not a string'));
        return;
      }
      // 移除 data URL prefix "data:<mime>;base64,"
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <div className="mb-1 text-sm text-white/80">{label}</div>
      {children}
    </label>
  );
}

function statusBadgeClass(s: string): string {
  const base = 'rounded px-2 py-0.5 text-xs';
  switch (s) {
    case 'D': return `${base} bg-white/10 text-white/80`;
    case 'S': return `${base} bg-blue-500/30 text-blue-200`;
    case 'R': return `${base} bg-amber-500/30 text-amber-200`;
    case 'C': return `${base} bg-emerald-500/30 text-emerald-200`;
    case 'V': return `${base} bg-red-500/30 text-red-200`;
    default: return base;
  }
}
