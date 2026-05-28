// apps/nx-ui/src/app/dashboard/tiered-form-demo/page.tsx
// LITE 階段 1 M5：三層欄位框架 demo 頁（給 Alex 看 framework 效果）

'use client';

import { useState } from 'react';
import {
  TieredField,
  TieredFormProvider,
  TieredFormToolbar,
} from '@/features/shared/tiered-form';

export default function TieredFormDemoPage() {
  return (
    <TieredFormProvider defaultMode="lite">
      <Inner />
    </TieredFormProvider>
  );
}

function Inner() {
  const [form, setForm] = useState({
    code: '',
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    remark: '',
    paymentTerm: 'NET30',
    creditLimit: '0',
    sortNo: '0',
  });

  return (
    <div className="mx-auto max-w-3xl p-6 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">三層欄位框架 demo</h1>
        <TieredFormToolbar />
      </div>

      <p className="mb-6 text-sm text-white/60">
        範例表單：示範 🟢 必要 / 🟡 建議 / ⚪ 進階 三層欄位顯示邏輯。
        LITE 模式只顯示必要欄位、建議欄位摺疊提示、進階欄位隱藏。
        按 <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-xs">Alt+L</kbd> 三段循環切換。
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 🟢 required：永遠顯示 */}
        <TieredField tier="required" label="對象代碼">
          <input
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="C0001"
          />
        </TieredField>

        <TieredField tier="required" label="對象名稱">
          <input
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="大台北汽車修護廠"
          />
        </TieredField>

        {/* 🟡 recommended：LITE 摺疊（顯示提示+點開）、expanded/all 展開 */}
        <TieredField tier="recommended" label="聯絡人" hint="客服回單方便">
          <input
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            placeholder="周師傅"
          />
        </TieredField>

        <TieredField tier="recommended" label="電話" hint="緊急聯繫用">
          <input
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="02-2222-3333"
          />
        </TieredField>

        <TieredField tier="recommended" label="Email" hint="寄詢價/發票用">
          <input
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="contact@example.com"
          />
        </TieredField>

        <TieredField tier="recommended" label="地址" hint="送貨地址" className="md:col-span-2">
          <input
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="台北市士林區中正路 150 號"
          />
        </TieredField>

        {/* ⚪ advanced：LITE/expanded 隱藏、all 才顯示 */}
        <TieredField tier="advanced" label="統一編號" hint="開發票才需要">
          <input
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.taxId}
            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            placeholder="12345678"
          />
        </TieredField>

        <TieredField tier="advanced" label="付款條件" hint="預設 NET30 月結 30 天">
          <select
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.paymentTerm}
            onChange={(e) => setForm({ ...form, paymentTerm: e.target.value })}
          >
            <option value="PREPAY">PREPAY 先付款</option>
            <option value="NET30">NET30 月結 30 天</option>
            <option value="NET60">NET60 月結 60 天</option>
            <option value="NET90">NET90 月結 90 天</option>
          </select>
        </TieredField>

        <TieredField tier="advanced" label="信用額度" hint="0 = 不限制">
          <input
            type="number"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.creditLimit}
            onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
          />
        </TieredField>

        <TieredField tier="advanced" label="排序順序" hint="清單顯示順序">
          <input
            type="number"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.sortNo}
            onChange={(e) => setForm({ ...form, sortNo: e.target.value })}
          />
        </TieredField>

        <TieredField tier="advanced" label="備註" className="md:col-span-2">
          <textarea
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
            placeholder="例：習慣月結、送貨時間中午前"
          />
        </TieredField>
      </div>

      <div className="mt-8 rounded-lg border border-white/10 bg-black/20 p-4 text-sm">
        <h2 className="mb-2 font-semibold">📋 框架說明</h2>
        <ul className="space-y-1 text-white/70">
          <li>🟢 <strong>必要欄位</strong>：永遠顯示、不填不能存（系統運作最低需求）</li>
          <li>🟡 <strong>建議欄位</strong>：LITE 模式摺疊提示「點開」、Expanded/All 模式直接展開</li>
          <li>⚪ <strong>進階欄位</strong>：LITE/Expanded 隱藏、All 模式才顯示（80% 客戶用不到）</li>
          <li>⌨️ <strong>Alt+L</strong>：三段循環切換 lite → expanded → all → lite</li>
          <li>📦 <strong>用法</strong>：表單外包 <code>{'<TieredFormProvider>'}</code>、欄位用 <code>{'<TieredField tier=...>'}</code>、頁面工具列放 <code>{'<TieredFormToolbar />'}</code></li>
        </ul>
      </div>
    </div>
  );
}
