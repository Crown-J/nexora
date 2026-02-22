/**
 * File: apps/nx-ui/src/features/nx00/parts/ui/PartForm.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-004：Parts Form（新增/修改）
 *
 * Notes:
 * - UI only：負責表單呈現與收集輸入，不直接呼叫 parts API（由上層注入 onSubmit）
 * - Lookups 由 usePartLookups 載入（brands/function-groups/statuses）
 */

'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { cx } from '@/shared/lib/cx';
import { usePartLookups } from '@/features/nx00/parts/hooks/usePartLookups';

import type { PartRow } from '@/features/nx00/parts/types';
import type { CreatePartBody } from '@/features/nx00/parts/api/parts';

type PartFormMode = 'create' | 'edit';

type PartFormProps = {
  mode: PartFormMode;
  initial?: PartRow | null;
  submitting?: boolean;

  onCancel: () => void;
  onSubmit: (body: CreatePartBody) => Promise<void>;
};

type FormState = {
  partNo: string;
  oldPartNo: string;
  displayNo: string;
  nameZh: string;
  nameEn: string;

  brandId: string;
  functionGroupId: string;
  statusId: string;

  barcode: string;
  isActive: boolean;
  remark: string;
};

/**
 * @CODE nxui_nx00_parts_form_state_from_initial_002
 */
function fromInitial(initial?: PartRow | null): FormState {
  return {
    partNo: initial?.partNo ?? '',
    oldPartNo: initial?.oldPartNo ?? '',
    displayNo: initial?.displayNo ?? '',
    nameZh: initial?.nameZh ?? '',
    nameEn: initial?.nameEn ?? '',

    brandId: initial?.brandId ?? '',
    functionGroupId: initial?.functionGroupId ?? '',
    statusId: initial?.statusId ?? '',

    barcode: initial?.barcode ?? '',
    isActive: typeof initial?.isActive === 'boolean' ? initial.isActive : true,
    remark: initial?.remark ?? '',
  };
}

/**
 * @CODE nxui_nx00_parts_form_error_message_002
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * @FUNCTION_CODE NX00-UI-004-F01
 * 說明：
 * - Parts Form：新增/修改零件
 * - 必填：Part No / Name(ZH) / Brand / Status
 */
export default function PartForm({
  mode,
  initial,
  submitting,
  onCancel,
  onSubmit,
}: PartFormProps) {
  const [form, setForm] = useState<FormState>(() => fromInitial(initial));
  const [err, setErr] = useState<string | null>(null);

  const {
    brands,
    functionGroups,
    partStatuses,
    loading: lookupLoading,
    error: lookupError,
  } = usePartLookups(true);

  /**
   * @CODE nxui_nx00_parts_form_sync_initial_002
   * 說明：切換 initial（例如 edit 切不同零件）時重置表單
   */
  useEffect(() => {
    setForm(fromInitial(initial));
  }, [initial?.id]);

  /**
   * @CODE nxui_nx00_parts_form_can_submit_002
   */
  const canSubmit = useMemo(() => {
    return (
      form.partNo.trim().length > 0 &&
      form.nameZh.trim().length > 0 &&
      form.brandId.trim().length > 0 &&
      form.statusId.trim().length > 0
    );
  }, [form.partNo, form.nameZh, form.brandId, form.statusId]);

  /**
   * @CODE nxui_nx00_parts_form_set_field_002
   */
  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  /**
   * @CODE nxui_nx00_parts_form_build_body_002
   */
  function buildBody(): CreatePartBody {
    const normalizeNullable = (s: string) => {
      const t = s.trim();
      return t === '' ? null : t;
    };

    return {
      partNo: form.partNo.trim(),
      oldPartNo: normalizeNullable(form.oldPartNo),
      displayNo: normalizeNullable(form.displayNo),
      nameZh: form.nameZh.trim(),
      nameEn: normalizeNullable(form.nameEn),

      brandId: form.brandId,
      functionGroupId: form.functionGroupId ? form.functionGroupId : null,
      statusId: form.statusId,

      barcode: normalizeNullable(form.barcode),
      isActive: form.isActive,
      remark: normalizeNullable(form.remark),
    };
  }

  /**
   * @CODE nxui_nx00_parts_form_submit_002
   */
  async function handleSubmit() {
    setErr(null);

    if (!canSubmit) {
      setErr('請先填寫必填欄位：Part No / Name(ZH) / Brand / Status');
      return;
    }

    try {
      await onSubmit(buildBody());
    } catch (e: unknown) {
      setErr(getErrorMessage(e) || 'Save failed');
    }
  }

  const mergedError = err ?? lookupError;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <div className="text-sm tracking-[0.35em] text-white/70">NX00</div>
          <h1 className="text-xl font-semibold">
            Parts · {mode === 'create' ? 'New' : 'Edit'}
          </h1>
          <div className="text-xs text-white/35">NX00-UI-004 · part_form（新增/修改）</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!canSubmit || !!submitting}
            onClick={handleSubmit}
            className={cx(
              'rounded-xl border px-4 py-2 text-sm font-medium',
              !canSubmit || submitting
                ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
                : 'border-[#39ff14]/40 bg-[#39ff14] text-black hover:bg-[#39ff14]/90'
            )}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {mergedError ? <div className="p-4 text-sm text-red-200">{mergedError}</div> : null}
      {lookupLoading ? <div className="p-4 text-sm text-white/45">Loading lookups…</div> : null}

      <div className="grid gap-4 p-5 lg:grid-cols-12">
        {/* left */}
        <div className="grid gap-4 lg:col-span-7">
          <Field label="Part No *">
            <input
              value={form.partNo}
              onChange={(e) => setField('partNo', e.target.value)}
              placeholder="e.g. 06F115397J"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Old Part No">
              <input
                value={form.oldPartNo}
                onChange={(e) => setField('oldPartNo', e.target.value)}
                placeholder="optional"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
              />
            </Field>

            <Field label="Display No">
              <input
                value={form.displayNo}
                onChange={(e) => setField('displayNo', e.target.value)}
                placeholder="optional"
                className="w-full rounded-xl border border-white/10 bgblack/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
              />
            </Field>
          </div>

          <Field label="Name (ZH) *">
            <input
              value={form.nameZh}
              onChange={(e) => setField('nameZh', e.target.value)}
              placeholder="中文品名"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          <Field label="Name (EN)">
            <input
              value={form.nameEn}
              onChange={(e) => setField('nameEn', e.target.value)}
              placeholder="optional"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          <Field label="Barcode">
            <input
              value={form.barcode}
              onChange={(e) => setField('barcode', e.target.value)}
              placeholder="optional"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>
        </div>

        {/* right */}
        <div className="grid gap-4 lg:col-span-5">
          <Field label="Brand *">
            <select
              value={form.brandId}
              onChange={(e) => setField('brandId', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            >
              <option value="">Please select…</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} · {b.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Function Group">
            <select
              value={form.functionGroupId}
              onChange={(e) => setField('functionGroupId', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            >
              <option value="">(None)</option>
              {functionGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} · {g.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status *">
            <select
              value={form.statusId}
              onChange={(e) => setField('statusId', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            >
              <option value="">Please select…</option>
              {partStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Active">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="text-sm text-white/70">{form.isActive ? 'ON' : 'OFF'}</span>
              <button
                type="button"
                onClick={() => setField('isActive', !form.isActive)}
                className={cx(
                  'rounded-lg border px-3 py-1.5 text-xs',
                  form.isActive
                    ? 'border-[#39ff14]/30 bg-[#39ff14]/10 text-[#39ff14]'
                    : 'border-white/10 bg-white/5 text-white/60'
                )}
              >
                Toggle
              </button>
            </div>
          </Field>

          <Field label="Remark">
            <textarea
              value={form.remark}
              onChange={(e) => setField('remark', e.target.value)}
              placeholder="optional"
              rows={5}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          {mode === 'edit' && initial?.id ? (
            <div className="text-xs text-white/30">
              ID: <span className="text-white/60">{initial.id}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="p-5 text-xs text-white/30">* 必填欄位：Part No / Name(ZH) / Brand / Status</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-white/45">{label}</div>
      {children}
    </label>
  );
}