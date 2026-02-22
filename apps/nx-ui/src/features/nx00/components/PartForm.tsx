'use client';

import { useEffect, useMemo, useState } from 'react';
import { listBrands, listFunctionGroups, listPartStatuses } from '@/features/nx00/api/lookups';
import type { LookupRow, PartRow, PartStatusRow } from '@/features/nx00/types';
import type { CreatePartBody } from '@/features/nx00/api/parts';

function cn(...s: (string | false | null | undefined)[]) {
  return s.filter(Boolean).join(' ');
}

type Props = {
  mode: 'create' | 'edit';
  initial?: PartRow | null;
  onCancel: () => void;
  onSubmit: (body: CreatePartBody) => Promise<void>;
  submitting?: boolean;
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
    isActive: typeof initial?.isActive === 'boolean' ? initial!.isActive : true,
    remark: initial?.remark ?? '',
  };
}

export default function PartForm({ mode, initial, onCancel, onSubmit, submitting }: Props) {
  const [form, setForm] = useState<FormState>(() => fromInitial(initial));
  const [err, setErr] = useState<string | null>(null);

  // lookups
  const [brands, setBrands] = useState<LookupRow[]>([]);
  const [functionGroups, setFunctionGroups] = useState<LookupRow[]>([]);
  const [partStatuses, setPartStatuses] = useState<PartStatusRow[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    setForm(fromInitial(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  useEffect(() => {
    let alive = true;
    async function boot() {
      setLookupLoading(true);
      try {
        const [b, fg, ps] = await Promise.all([
          listBrands({ isActive: true }),
          listFunctionGroups({ isActive: true }),
          listPartStatuses({ isActive: true }),
        ]);
        if (!alive) return;
        setBrands(b);
        setFunctionGroups(fg);
        setPartStatuses(ps);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setErr(e?.message || 'Load lookups failed');
      } finally {
        if (alive) setLookupLoading(false);
      }
    }
    boot();
    return () => {
      alive = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      form.partNo.trim() &&
      form.nameZh.trim() &&
      form.brandId.trim() &&
      form.statusId.trim()
    );
  }, [form]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function buildBody(): CreatePartBody {
    const n = (s: string) => {
      const t = s.trim();
      return t === '' ? null : t;
    };

    return {
      partNo: form.partNo.trim(),
      oldPartNo: n(form.oldPartNo),
      displayNo: n(form.displayNo),
      nameZh: form.nameZh.trim(),
      nameEn: n(form.nameEn),
      brandId: form.brandId,
      functionGroupId: form.functionGroupId ? form.functionGroupId : null,
      statusId: form.statusId,
      barcode: n(form.barcode),
      isActive: form.isActive,
      remark: n(form.remark),
    };
  }

  async function handleSubmit() {
    setErr(null);

    if (!canSubmit) {
      setErr('請先填寫必填欄位：Part No / Name(ZH) / Brand / Status');
      return;
    }

    try {
      await onSubmit(buildBody());
    } catch (e: any) {
      setErr(e?.message || 'Save failed');
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
      <div className="p-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm tracking-[0.35em] text-white/70">NX00</div>
          <h1 className="text-xl font-semibold">
            Parts · {mode === 'create' ? 'New' : 'Edit'}
          </h1>
          <div className="text-xs text-white/35">
            NX00-UI-004 · part_form（新增/修改）
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit || !!submitting}
            onClick={handleSubmit}
            className={cn(
              'rounded-xl border px-4 py-2 text-sm font-medium',
              !canSubmit || submitting
                ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
                : 'border-[#39ff14]/40 bg-[#39ff14] text-black hover:bg-[#39ff14]/90'
            )}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {err ? <div className="p-4 text-sm text-red-200">{err}</div> : null}
      {lookupLoading ? (
        <div className="p-4 text-sm text-white/45">Loading lookups…</div>
      ) : null}

      <div className="p-5 grid gap-4 lg:grid-cols-12">
        {/* left */}
        <div className="lg:col-span-7 grid gap-4">
          <Field label="Part No *">
            <input
              value={form.partNo}
              onChange={(e) => set('partNo', e.target.value)}
              placeholder="e.g. 06F115397J"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Old Part No">
              <input
                value={form.oldPartNo}
                onChange={(e) => set('oldPartNo', e.target.value)}
                placeholder="optional"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
              />
            </Field>
            <Field label="Display No">
              <input
                value={form.displayNo}
                onChange={(e) => set('displayNo', e.target.value)}
                placeholder="optional"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
              />
            </Field>
          </div>

          <Field label="Name (ZH) *">
            <input
              value={form.nameZh}
              onChange={(e) => set('nameZh', e.target.value)}
              placeholder="中文品名"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          <Field label="Name (EN)">
            <input
              value={form.nameEn}
              onChange={(e) => set('nameEn', e.target.value)}
              placeholder="optional"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          <Field label="Barcode">
            <input
              value={form.barcode}
              onChange={(e) => set('barcode', e.target.value)}
              placeholder="optional"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>
        </div>

        {/* right */}
        <div className="lg:col-span-5 grid gap-4">
          <Field label="Brand *">
            <select
              value={form.brandId}
              onChange={(e) => set('brandId', e.target.value)}
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
              onChange={(e) => set('functionGroupId', e.target.value)}
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
              onChange={(e) => set('statusId', e.target.value)}
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
                onClick={() => set('isActive', !form.isActive)}
                className={cn(
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
              onChange={(e) => set('remark', e.target.value)}
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

      <div className="p-5 text-xs text-white/30">
        * 必填欄位：Part No / Name(ZH) / Brand / Status
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-white/45">{label}</div>
      {children}
    </label>
  );
}
