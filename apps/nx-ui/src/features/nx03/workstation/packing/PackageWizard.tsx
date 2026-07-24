// apps/nx-ui/src/features/nx03/workstation/packing/PackageWizard.tsx
/**
 * 建包裹 5 步精靈（WMS 2026-07-24、Phase A：步驟 1–2 功能、3–5 下階段）。
 *   1 選擇銷貨單：限同一取貨方式、可多選、關鍵字搜尋 → 依取貨方式帶包裹類型。
 *   2 確認項目：列選中單的品項、勾選進包裹。
 *   3 明細單據 / 4 包裹設定 / 5 列印單據：Phase B/C。
 * 建於 DocWorkbench 的 CreatePanel（onCreated(id) / onCancel）。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

import { createPackage, listPickableSos, type PackPoolSo } from '@data/endpoints/nx03/workstation/api';
import { cx } from '@design/utils/cx';

const STEPS = ['選擇銷貨單', '確認項目', '明細單據', '包裹設定', '列印單據'];
const TYPES: { v: 'P' | 'C' | 'D'; label: string }[] = [
  { v: 'P', label: '自取' },
  { v: 'C', label: '寄貨' },
  { v: 'D', label: '配送' },
];

export function PackageWizard({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<'P' | 'C' | 'D'>('P');
  const [sos, setSos] = useState<PackPoolSo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selSo, setSelSo] = useState<Set<string>>(new Set()); // 步驟1 選的單
  const [selItem, setSelItem] = useState<Set<string>>(new Set()); // 步驟2 選的品項(pkItemId)

  const loadSos = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await listPickableSos({ deliveryType: type, search: search.trim() || undefined });
      setSos(r.sos);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '載入銷貨單失敗');
    } finally {
      setLoading(false);
    }
  }, [type, search]);

  useEffect(() => { if (step === 1) void loadSos(); }, [step, loadSos]);

  // 切換取貨方式 → 清選取（不同方式不能混）
  const changeType = (t: 'P' | 'C' | 'D') => { setType(t); setSelSo(new Set()); setSelItem(new Set()); };

  const chosenSos = useMemo(() => sos.filter((s) => selSo.has(s.soId)), [sos, selSo]);
  const warehouseId = chosenSos[0]?.warehouseId ?? sos[0]?.warehouseId ?? '';
  const step2Items = useMemo(() => chosenSos.flatMap((s) => s.lines.map((l) => ({ ...l, soDocNo: s.soDocNo, customerName: s.customerName }))), [chosenSos]);

  const toggleSo = (id: string) => setSelSo((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleItem = (id: string) => setSelItem((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const goStep2 = () => {
    if (!selSo.size) { setErr('請至少選一張銷貨單'); return; }
    // 預設把選中單的所有品項都勾上（可再取消）
    setSelItem(new Set(chosenSos.flatMap((s) => s.lines.map((l) => l.pkItemId))));
    setErr(null); setStep(2);
  };

  const finish = async () => {
    if (!selItem.size) { setErr('請至少選一個品項'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await createPackage(type, warehouseId, [...selItem]);
      onCreated(r.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立包裹失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-xl">
        {/* 頭 + 步驟軸 */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">建立包裹</h2>
          <button type="button" onClick={onCancel} aria-label="關閉" className="ml-auto text-muted-foreground hover:text-foreground"><X className="h-5 w-5" aria-hidden /></button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-4 py-2">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const active = n === step; const done = n < step; const soon = n >= 3;
            return (
              <div key={s} className="flex shrink-0 items-center">
                <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                  active ? 'bg-primary text-white' : done ? 'bg-primary/10 text-primary' : soon ? 'bg-muted text-muted-foreground/60' : 'bg-muted text-muted-foreground')}>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">{done ? <Check className="h-3 w-3" aria-hidden /> : n}</span>
                  {s}{soon ? '（下階段）' : ''}
                </span>
                {n < STEPS.length ? <ChevronRight className="h-4 w-4 text-muted-foreground/40" aria-hidden /> : null}
              </div>
            );
          })}
        </div>

        {err ? <div className="mx-4 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{err}</div> : null}

        {/* 內容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">取貨方式：</span>
                {TYPES.map((t) => (
                  <button key={t.v} type="button" onClick={() => changeType(t.v)} className={cx('rounded-lg border px-3 py-1.5 text-sm', type === t.v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>{t.label}</button>
                ))}
                <div className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-background px-2">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋 客戶 / 單號 / 料號" className="h-8 w-56 bg-transparent text-sm focus:outline-none" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">列出「已撿完、待包」的{TYPES.find((t) => t.v === type)?.label}單，可多選（同一取貨方式）。</p>
              {loading ? <Empty text="載入中…" /> : sos.length === 0 ? <Empty text={`沒有已撿完待包的${TYPES.find((t) => t.v === type)?.label}單`} /> : (
                <div className="space-y-1.5">
                  {sos.map((s) => (
                    <button key={s.soId} type="button" onClick={() => toggleSo(s.soId)} className={cx('flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left', selSo.has(s.soId) ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/20')}>
                      <input type="checkbox" checked={selSo.has(s.soId)} readOnly className="h-4 w-4 accent-primary" />
                      <span className="truncate text-sm font-medium text-foreground">{s.customerName}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{s.soDocNo}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">{s.lines.length} 項</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : step === 2 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">選 {selSo.size} 張單、共 {step2Items.length} 個品項。勾選要放進這箱的貨（預設全選）。</p>
              <div className="overflow-hidden rounded-lg border border-border">
                {step2Items.map((it) => (
                  <button key={it.pkItemId} type="button" onClick={() => toggleItem(it.pkItemId)} className={cx('flex w-full items-center gap-2 border-t border-border/60 px-3 py-2 text-left first:border-t-0', selItem.has(it.pkItemId) ? 'bg-primary/5' : 'hover:bg-muted/20')}>
                    <input type="checkbox" checked={selItem.has(it.pkItemId)} readOnly className="h-4 w-4 accent-primary" />
                    <span className="truncate font-mono text-sm text-foreground">{it.partNo}</span>
                    <span className="shrink-0 text-sm text-primary tabular-nums">×{it.qty}</span>
                    <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">{it.customerName} · {it.soDocNo}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-sm text-muted-foreground">
                {step === 3 ? '「明細單據」——發票＋明細單放進包裹、拆多箱時控管發票放哪箱。此段待「財務模組」做出發票後再接（已留連接處）。' : `「${STEPS[step - 1]}」為下階段功能（包裹送貨地址、包裹貼紙列印）。`}
                <br />本階段建包裹後可直接到「詳細資料」封箱。
              </p>
            </div>
          )}
        </div>

        {/* 底：步驟導覽 */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <button type="button" onClick={step === 1 ? onCancel : () => setStep(step - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted/30">
            <ChevronLeft className="h-4 w-4" aria-hidden />{step === 1 ? '取消' : '上一步'}
          </button>
          {step === 1 ? (
            <button type="button" disabled={!selSo.size} onClick={goStep2} className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-40">下一步<ChevronRight className="h-4 w-4" aria-hidden /></button>
          ) : (
            <button type="button" disabled={busy || !selItem.size} onClick={finish} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-40"><Check className="h-4 w-4" aria-hidden />建立包裹（{selItem.size} 項）</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
