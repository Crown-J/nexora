// apps/nx-ui/src/features/nx01/product/batch-price/BatchPriceTool.tsx
// 偉盟 P2 2.8 Step 3 2026-07-11：批次調價工具（選範圍 → 調幅 → 預覽 → 確認套用）
//   拍板：靜態四價不變、只補維運工具；留痕=稽核日誌+價格更新戳記（0 schema）
//   防呆：無任何篩選=全庫調價需二次勾選；套用前必先預覽；預覽只列前 200、總數另標

'use client';

import { useEffect, useMemo, useState } from 'react';

import { apiJson } from '@data/api/client';
import { listLookupBrand } from '@data/endpoints/shared/master/lookup/api/lookup';
import {
  applyBatchPrice,
  previewBatchPrice,
  type BatchPriceFilter,
  type BatchPricePayload,
  type BatchPricePreviewResult,
  type PriceTarget,
} from '@data/endpoints/nx01/part-batch-price/api/part-batch-price';

const PURCHASE_CATEGORY: Record<number, string> = { 1: '保養件', 2: '維修件', 3: '事故件', 4: '改裝件', 5: '油品耗材' };
const TECH_CATEGORY: Record<number, string> = {
  1: '引擎動力', 2: '傳動', 3: '制動', 4: '轉向', 5: '懸吊底盤', 6: '電氣電子', 7: '冷卻空調', 8: '車體內外裝', 9: '安全輔助',
};
const TARGETS: PriceTarget[] = ['A', 'B', 'C', 'D'];

type Opt = { id: string; name: string };

const inputCls = 'w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-1.5 text-xs text-[#E8E8EC]';
const btnPrimary =
  'rounded-md border border-[#22D88F]/40 bg-[#22D88F]/10 px-4 py-1.5 text-xs font-medium text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50';
const btnDanger =
  'rounded-md border border-[#E2A960]/50 bg-[#E2A960]/10 px-4 py-1.5 text-xs font-medium text-[#E2A960] hover:bg-[#E2A960]/20 disabled:opacity-50';

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4 });

export function BatchPriceTool() {
  // 範圍
  const [brands, setBrands] = useState<Opt[]>([]);
  const [groups, setGroups] = useState<Opt[]>([]);
  const [brandId, setBrandId] = useState('');
  const [partGroupId, setPartGroupId] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState('');
  const [techCategory, setTechCategory] = useState('');
  const [isOem, setIsOem] = useState('');
  const [search, setSearch] = useState('');
  // 調幅
  const [targets, setTargets] = useState<Set<PriceTarget>>(new Set(TARGETS));
  const [mode, setMode] = useState<'PCT' | 'AMT'>('PCT');
  const [value, setValue] = useState('5');
  const [rounding, setRounding] = useState<'INT' | 'NONE'>('INT');
  // 全庫確認
  const [confirmAll, setConfirmAll] = useState(false);
  // 預覽 / 套用
  const [preview, setPreview] = useState<BatchPricePreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const bs = await listLookupBrand({ isActive: true });
        setBrands(bs.map((b) => ({ id: b.id, name: b.name })));
      } catch { /* 撈不到不擋 */ }
      try {
        const raw = await apiJson<{ items?: Opt[]; rows?: Opt[] }>(`/nx01/part-groups?pageSize=200&isActive=true`);
        setGroups((raw.items ?? raw.rows ?? []).map((g) => ({ id: g.id, name: g.name })));
      } catch { /* 撈不到不擋 */ }
    })();
  }, []);

  const filter: BatchPriceFilter = useMemo(
    () => ({
      brandId: brandId || undefined,
      partGroupId: partGroupId || undefined,
      purchaseCategory: purchaseCategory ? Number(purchaseCategory) : undefined,
      techCategory: techCategory ? Number(techCategory) : undefined,
      isOem: isOem === '' ? undefined : isOem === '1',
      search: search.trim() || undefined,
    }),
    [brandId, partGroupId, purchaseCategory, techCategory, isOem, search],
  );
  const noFilter = !filter.brandId && !filter.partGroupId && filter.purchaseCategory == null && filter.techCategory == null && filter.isOem == null && !filter.search;

  const payload = (): BatchPricePayload | null => {
    const v = Number(value);
    if (!Number.isFinite(v) || v === 0) {
      setErr('調幅必填、不可為 0');
      return null;
    }
    if (!targets.size) {
      setErr('至少勾一個價格欄位');
      return null;
    }
    return {
      filter,
      adjust: { mode, value: v, targets: [...targets], rounding },
      ...(noFilter ? { confirmAll } : {}),
    };
  };

  async function doPreview() {
    const p = payload();
    if (!p) return;
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      setPreview(await previewBatchPrice(p));
    } catch (e) {
      setErr(e instanceof Error ? e.message : '預覽失敗');
    } finally {
      setBusy(false);
    }
  }

  async function doApply() {
    const p = payload();
    if (!p || !preview) return;
    if (noFilter && !confirmAll) {
      setErr('未設任何篩選＝全庫調價、請先勾選下方確認');
      return;
    }
    const desc = `${[...targets].join('/')} 價 ${mode === 'PCT' ? `${Number(value) > 0 ? '+' : ''}${value}%` : `${Number(value) > 0 ? '+' : ''}${value} 元`}`;
    if (!window.confirm(`確認套用批次調價？\n\n範圍內共 ${preview.total} 顆料、調整 ${desc}。\n只調「原價 > 0」的欄位、套用後寫入稽核日誌。`)) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await applyBatchPrice(p);
      setDone(`已套用：${r.affected} 顆料的 ${desc} 完成調整（稽核日誌已留痕）`);
      setPreview(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '套用失敗');
    } finally {
      setBusy(false);
    }
  }

  const toggleTarget = (t: PriceTarget) =>
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <div className="space-y-4">
      {/* 範圍 */}
      <section className="space-y-2 rounded border border-[#2A2A30] bg-[#0A0A0C] p-3">
        <div className="text-xs font-medium text-[#888892]">1️⃣ 調價範圍（可複合；全不選＝全庫）</div>
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
          <label className="text-xs text-[#888892]">
            <span className="mb-1 block">廠牌</span>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={inputCls}>
              <option value="">全部</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#888892]">
            <span className="mb-1 block">自訂群組</span>
            <select value={partGroupId} onChange={(e) => setPartGroupId(e.target.value)} className={inputCls}>
              <option value="">全部</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#888892]">
            <span className="mb-1 block">採購分類</span>
            <select value={purchaseCategory} onChange={(e) => setPurchaseCategory(e.target.value)} className={inputCls}>
              <option value="">全部</option>
              {Object.entries(PURCHASE_CATEGORY).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#888892]">
            <span className="mb-1 block">技術分類</span>
            <select value={techCategory} onChange={(e) => setTechCategory(e.target.value)} className={inputCls}>
              <option value="">全部</option>
              {Object.entries(TECH_CATEGORY).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#888892]">
            <span className="mb-1 block">正/副廠</span>
            <select value={isOem} onChange={(e) => setIsOem(e.target.value)} className={inputCls}>
              <option value="">全部</option>
              <option value="1">正廠</option>
              <option value="0">副廠</option>
            </select>
          </label>
          <label className="text-xs text-[#888892]">
            <span className="mb-1 block">關鍵字</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="料號 / 品名 / 廠牌料號" className={inputCls} />
          </label>
        </div>
      </section>

      {/* 調幅 */}
      <section className="space-y-2 rounded border border-[#2A2A30] bg-[#0A0A0C] p-3">
        <div className="text-xs font-medium text-[#888892]">2️⃣ 調幅（只調「原價 &gt; 0」的欄位、0 = 未定價不動）</div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="text-xs text-[#888892]">
            <span className="mb-1 block">價格欄位</span>
            <div className="flex gap-2">
              {TARGETS.map((t) => (
                <label key={t} className="flex items-center gap-1 rounded border border-[#2A2A30] px-2 py-1.5">
                  <input type="checkbox" checked={targets.has(t)} onChange={() => toggleTarget(t)} />
                  <span className="text-[#E8E8EC]">{t} 價</span>
                </label>
              ))}
            </div>
          </div>
          <label className="text-xs text-[#888892]">
            <span className="mb-1 block">方式</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'PCT' | 'AMT')} className={inputCls}>
              <option value="PCT">百分比 %</option>
              <option value="AMT">固定額 元</option>
            </select>
          </label>
          <label className="text-xs text-[#888892]">
            <span className="mb-1 block">調幅（負值＝降價）</span>
            <input type="number" step="0.5" value={value} onChange={(e) => setValue(e.target.value)} className={`${inputCls} w-28 tabular-nums`} />
          </label>
          <label className="text-xs text-[#888892]">
            <span className="mb-1 block">進位</span>
            <select value={rounding} onChange={(e) => setRounding(e.target.value as 'INT' | 'NONE')} className={inputCls}>
              <option value="INT">四捨五入到整數</option>
              <option value="NONE">保留 4 位小數</option>
            </select>
          </label>
          <button type="button" disabled={busy} onClick={() => void doPreview()} className={btnPrimary}>
            {busy ? '處理中…' : '預覽'}
          </button>
        </div>
        {noFilter ? (
          <label className="flex items-center gap-2 rounded border border-[#E2A960]/40 bg-[#E2A960]/5 px-3 py-2 text-xs text-[#E2A960]">
            <input type="checkbox" checked={confirmAll} onChange={(e) => setConfirmAll(e.target.checked)} />
            我知道目前未設任何篩選、套用將調整「全庫」所有啟用中零件
          </label>
        ) : null}
      </section>

      {err ? <div className="rounded border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">{err}</div> : null}
      {done ? <div className="rounded border border-[#22D88F]/40 bg-[#22D88F]/10 px-3 py-2 text-xs text-[#22D88F]">✅ {done}</div> : null}

      {/* 預覽 */}
      {preview ? (
        <section className="space-y-2 rounded border border-[#2A2A30] bg-[#0A0A0C] p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-medium text-[#888892]">
              3️⃣ 預覽：範圍內共 <span className="text-[#E8E8EC]">{preview.total}</span> 顆料
              {preview.total > preview.rows.length ? `（僅顯示前 ${preview.rows.length} 顆、套用作用於全部）` : ''}
            </div>
            <button type="button" disabled={busy || preview.total === 0} onClick={() => void doApply()} className={btnDanger}>
              確認套用（{preview.total} 顆）
            </button>
          </div>
          <div className="max-h-[50vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#141418]">
                <tr className="text-left text-[#888892]">
                  <th className="px-2 py-1.5">料號</th>
                  <th className="px-2 py-1.5">品名</th>
                  {[...targets].map((t) => (
                    <th key={t} className="px-2 py-1.5 text-right">{t} 價（現 → 新）</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.partId} className="border-t border-[#1A1A1E]">
                    <td className="px-2 py-1 font-mono text-[#E8E8EC]">{r.code}</td>
                    <td className="max-w-[16rem] truncate px-2 py-1 text-[#888892]">{r.name}</td>
                    {[...targets].map((t) => (
                      <td key={t} className="px-2 py-1 text-right tabular-nums">
                        {r.old[t] > 0 ? (
                          <>
                            <span className="text-[#5A5A60]">{fmt(r.old[t])}</span>
                            <span className="px-1 text-[#5A5A60]">→</span>
                            <span className="text-[#E8E8EC]">{fmt(r.new[t] ?? r.old[t])}</span>
                          </>
                        ) : (
                          <span className="text-[#5A5A60]">未定價</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
