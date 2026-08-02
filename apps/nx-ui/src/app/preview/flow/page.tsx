// apps/nx-ui/src/app/preview/flow/page.tsx
//
// 流程模板預覽：照真實的即時銷售流程（客戶 → 明細 → 交易 → 確認）。
// 一頁到底、按 Alt+數字捲到對應區、滾輪也可自由移動。
// 資料全部是假的、不呼叫任何 API。

'use client';

import { useState } from 'react';

import { FlowTemplate, type FlowSection } from '@design/templates/FlowTemplate';

const PARTS: Record<string, [string, number]> = {
  '03L131512DS': ['EGR 冷卻器', 3850],
  '06K115562': ['機油芯', 180],
  '5Q0615301F': ['煞車碟盤（前）', 1250],
};

type Line = { partNo: string; partName: string; qty: number; price: number };

const money = (n: number) => n.toLocaleString('zh-TW');

export default function FlowPreviewPage() {
  const [customer, setCustomer] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [partInput, setPartInput] = useState('');
  const [payment, setPayment] = useState('月結 30 天');
  const [delivery, setDelivery] = useState('配送');
  const [done, setDone] = useState(false);

  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);

  function addLine() {
    const key = partInput.replace(/\s/g, '');
    const hit = PARTS[key];
    if (!hit) return;
    setLines((prev) => [...prev, { partNo: key, partName: hit[0], qty: 1, price: hit[1] }]);
    setPartInput('');
  }

  const sections: FlowSection[] = [
    {
      key: 'customer',
      label: '客戶',
      blocked: customer.trim() ? undefined : '尚未選擇客戶',
      content: (
        <label className="block max-w-xl">
          <span className="text-[15px] text-muted-foreground">客戶</span>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="大同汽材行"
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>
      ),
    },
    {
      key: 'items',
      label: '明細',
      blocked: lines.length ? undefined : '尚未輸入明細',
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={partInput}
              onChange={(e) => setPartInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLine();
                }
              }}
              placeholder="03L131512DS"
              aria-label="料號"
              className="h-10 w-64 rounded-md border border-border bg-background px-3 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={addLine}
              className="h-10 rounded-md border border-border px-4 text-[15px] hover:bg-accent"
            >
              加入（Enter）
            </button>
            <span className="self-center text-[14px] text-muted-foreground">
              可打：03L131512DS · 06K115562 · 5Q0615301F
            </span>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['料號', '品名', '數量', '單價', '金額'].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`border-b border-border px-3 py-2 text-[14px] font-medium ${i >= 2 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="px-3 py-2 font-mono text-[15px]">{l.partNo}</td>
                  <td className="px-3 py-2 text-[15px]">{l.partName}</td>
                  <td className="px-3 py-2 text-right text-[15px] tabular-nums">{l.qty}</td>
                  <td className="px-3 py-2 text-right text-[15px] tabular-nums">{money(l.price)}</td>
                  <td className="px-3 py-2 text-right text-[15px] tabular-nums">
                    {money(l.qty * l.price)}
                  </td>
                </tr>
              ))}
              {!lines.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[15px] text-muted-foreground">
                    還沒有明細
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      key: 'transaction',
      label: '交易',
      content: (
        <div className="max-w-xl space-y-4">
          {[
            {
              label: '付款條件',
              value: payment,
              set: setPayment,
              opts: ['現金', '月結 30 天', '月結 60 天'],
            },
            { label: '交貨方式', value: delivery, set: setDelivery, opts: ['自取', '配送', '寄貨'] },
          ].map((f) => (
            <label key={f.label} className="block">
              <span className="text-[15px] text-muted-foreground">{f.label}</span>
              <select
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {f.opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ),
    },
    {
      key: 'confirm',
      label: '確認',
      content: (
        <div className="max-w-xl space-y-3">
          {[
            ['客戶', customer || '（未填）'],
            ['明細', `${lines.length} 筆`],
            ['付款條件', payment],
            ['交貨方式', delivery],
            ['總金額（含稅）', money(Math.round(total * 1.05))],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-border/60 py-2">
              <span className="text-[15px] text-muted-foreground">{k}</span>
              <span className="text-[16px]">{v}</span>
            </div>
          ))}
          {done ? <p className="pt-2 text-[16px]">已送出（示範用，沒有真的建單）。</p> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ⚠️ 2026-08-01：流程軌已從頂部移到左欄常駐（執行長拍板），說明跟著改 */}
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-[14px] text-muted-foreground">
        整個流程在同一頁：左欄是流程軌（點它或按 Alt+1~4 跳段），滾輪也可以自由移動。
        左欄那一格出現驚嘆號＝該區還沒完成，送出時會擋下來並帶你過去。
      </div>
      <FlowTemplate
        title="即時銷售"
        sections={sections}
        onSubmit={() => setDone(true)}
        onCancel={() => {
          setCustomer('');
          setLines([]);
          setDone(false);
        }}
        submitLabel="送出建單"
      />
    </div>
  );
}
