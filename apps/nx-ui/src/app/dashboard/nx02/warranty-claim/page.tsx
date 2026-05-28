// apps/nx-ui/src/app/dashboard/nx02/warranty-claim/page.tsx
// LITE 階段 1 M3：保固申請單列表頁（minimal viewable + status 流轉）

'use client';

import { useEffect, useState } from 'react';
import {
  createWarrantyClaim,
  listWarrantyClaims,
  registerResult,
  startReviewWarrantyClaim,
  submitWarrantyClaim,
  voidWarrantyClaim,
} from '@/features/nx02/warranty-claim/api/warranty-claim';
import {
  CLAIM_RESULT_LABEL,
  CLAIM_STATUS_LABEL,
  CLAIM_TYPE_LABEL,
  type ClaimResult,
  type ClaimType,
  type WarrantyClaimDto,
} from '@/features/nx02/warranty-claim/types';

type CreateForm = {
  claimType: ClaimType;
  sourceSoId: string;
  sourceSoNo: string;
  supplierId: string;
  partId: string;
  qty: string;
  claimDate: string;
  issueDescription: string;
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
};

export default function WarrantyClaimListPage() {
  const [rows, setRows] = useState<WarrantyClaimDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);

  // result registration inline state
  const [resultDraft, setResultDraft] = useState<Record<string, { result: ClaimResult; remark: string }>>({});

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
    setBusyId(id);
    try {
      await registerResult(id, { result: draft.result, resultRemark: draft.remark.trim() });
      setResultDraft((s) => ({ ...s, [id]: { result: 'NEW', remark: '' } }));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
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
        <div className="mb-6 rounded-lg border border-white/10 bg-black/30 p-4">
          <h2 className="mb-3 text-base font-semibold">新建保固申請</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="申請類型 🟢">
              <select
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.claimType}
                onChange={(e) => setForm({ ...form, claimType: e.target.value as ClaimType })}
              >
                {(['SELF', 'CUST'] as ClaimType[]).map((t) => (
                  <option key={t} value={t}>{CLAIM_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="申請日期 🟢">
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.claimDate}
                onChange={(e) => setForm({ ...form, claimDate: e.target.value })}
              />
            </Field>
            {form.claimType === 'CUST' && (
              <>
                <Field label="來源銷貨單 ID 🟢⚠️SO 還沒做、暫填">
                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                    value={form.sourceSoId}
                    onChange={(e) => setForm({ ...form, sourceSoId: e.target.value })}
                    placeholder="NX04SO_XXXXXXX"
                  />
                </Field>
                <Field label="來源銷貨單號 🟡">
                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                    value={form.sourceSoNo}
                    onChange={(e) => setForm({ ...form, sourceSoNo: e.target.value })}
                    placeholder="SO-202606-Z01-00001"
                  />
                </Field>
              </>
            )}
            <Field label="供應商 ID 🟢">
              <input
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                placeholder="NX01PTNR0000XXX"
              />
            </Field>
            <Field label="零件 ID 🟢">
              <input
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.partId}
                onChange={(e) => setForm({ ...form, partId: e.target.value })}
                placeholder="NX01PART0000XXX"
              />
            </Field>
            <Field label="數量 🟢">
              <input
                type="number"
                min={0}
                step="0.0001"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
            </Field>
            <Field label="問題描述 🟢" className="md:col-span-2">
              <textarea
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                value={form.issueDescription}
                onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
                placeholder="例：第一次使用 3 個月後漏油、無撞擊痕跡"
              />
            </Field>
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
                            onChange={(e) => setResultDraft((s) => ({
                              ...s,
                              [r.id]: { result: e.target.value as ClaimResult, remark: s[r.id]?.remark ?? '' },
                            }))}
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
                              [r.id]: { result: s[r.id]?.result ?? 'NEW', remark: e.target.value },
                            }))}
                          />
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
