// apps/nx-ui/src/app/preview/detail/page.tsx
//
// 檢視模板預覽（六支外殼的「檢視殼」）。
// ⛔ 不憑空想欄位——單號格式、料號、客戶名全部照本機資料庫的真實資料抄，
//    欄位照 data/types/nx04/quote.ts 的 Quote / QuoteItem。
// 資料全部是假的、不呼叫任何 API。
//
// 這一頁要證明四件事（外殼規格 §5）：
//   1. 先給結論——三個關鍵數字在最上面，⛔ 不必自己從明細加總
//   2. 細節收頁籤——要看才展開
//   3. ⭐ 動作列＝修改的唯一入口，畫面本身唯讀
//   4. 右側附屬並排⛔ 不分頁（Shopify 訂單詳情範式）
//
// ⭐ 順便驗證新的定價紀律（外殼規格 §2 / 已作廢決策清單 §2）：
//    業務看得到「公司定價」與自己的「讓價」，⛔ 全程看不到成本。

'use client';

import { useState } from 'react';

import { DetailTemplate, type DetailAction } from '@design/templates/DetailTemplate';

type Line = {
  no: number;
  partNo: string;
  partName: string;
  qty: number;
  /** 產品組依進價訂的價。⭐ 這是唯一的紀律基準 */
  listPrice: number;
  /** 業務實際報的價 */
  unitPrice: number;
  /** 低於底價的原因。null＝沒低於 */
  belowMinReason: string | null;
};

const LINES: Line[] = [
  { no: 1, partNo: '021 115 562 *', partName: '機油芯-P9103', qty: 4, listPrice: 380, unitPrice: 380, belowMinReason: null },
  { no: 2, partNo: '023 121 004', partName: '水泵', qty: 2, listPrice: 2850, unitPrice: 2700, belowMinReason: '客戶同時下單六項、比照上次成交價' },
  { no: 3, partNo: '020 941 521A', partName: '倒車燈開關', qty: 3, listPrice: 480, unitPrice: 480, belowMinReason: null },
  { no: 4, partNo: '06B 133 551L', partName: '噴油嘴', qty: 6, listPrice: 3200, unitPrice: 3200, belowMinReason: null },
  { no: 5, partNo: '020 498 085G', partName: '油封-差速器', qty: 8, listPrice: 260, unitPrice: 250, belowMinReason: '零星件湊整、對方要求' },
  { no: 6, partNo: '025 129 391A', partName: '化油器浮筒', qty: 4, listPrice: 1450, unitPrice: 1450, belowMinReason: null },
];

const money = (n: number) => n.toLocaleString('zh-TW');
const lineAmount = (l: Line) => l.qty * l.unitPrice;
const listAmount = (l: Line) => l.qty * l.listPrice;

const SUBTOTAL = LINES.reduce((a, l) => a + lineAmount(l), 0);
const LIST_TOTAL = LINES.reduce((a, l) => a + listAmount(l), 0);
const CONCESSION = SUBTOTAL - LIST_TOTAL; // 負數＝讓價
const TAX = Math.round(SUBTOTAL * 0.05);
const TOTAL = SUBTOTAL + TAX;

const HISTORY = [
  { at: '07/29 09:14', who: '王志明', what: '建立報價（來源：即時報價紀錄 3 筆）' },
  { at: '07/29 09:21', who: '王志明', what: '第 2 行低於底價，填寫原因後放行' },
  { at: '07/29 10:02', who: '王志明', what: '寄出給 永豐汽車修配廠（chen@example.com）' },
  { at: '07/31 16:40', who: '系統', what: '有效期剩 5 天，已提醒業務' },
];

export default function PreviewDetailPage() {
  const [log, setLog] = useState<string[]>([]);
  const fire = (label: string) => setLog((prev) => [`按了「${label}」`, ...prev].slice(0, 4));

  const actions: DetailAction[] = [
    { key: 'to-so', label: '轉銷貨', primary: true, onClick: () => fire('轉銷貨') },
    { key: 'resend', label: '重新寄送', onClick: () => fire('重新寄送') },
    { key: 'print', label: '列印／PDF', onClick: () => fire('列印／PDF') },
    { key: 'void', label: '作廢', onClick: () => fire('作廢') },
    {
      key: 'edit',
      label: '改價格',
      disabled: true,
      disabledReason: '已寄給客戶的報價不能直接改價——請作廢後重開，或等客戶回覆後在銷貨單調整',
      onClick: () => {},
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
    <DetailTemplate
      title="QT-202607-Z01-00009"
      subtitle="永豐汽車修配廠"
      status={{ label: '等客戶回 · 3 天', tone: 'warn' }}
      onBack={() => fire('返回')}
      stats={[
        { label: '報價金額', value: money(TOTAL), hint: `未稅 ${money(SUBTOTAL)} · 稅 ${money(TAX)}` },
        {
          label: '讓價',
          value: money(CONCESSION),
          hint: `相對公司定價 ${((CONCESSION / LIST_TOTAL) * 100).toFixed(1)}%`,
          tone: 'warn',
        },
        { label: '有效期', value: '剩 5 天', hint: '到 08/07 為止' },
      ]}
      actions={actions}
      aside={
        <>
          <div className="nx-card">
            <div className="nx-t-sub mb-3">客戶</div>
            <dl className="flex flex-col gap-2">
              <Row k="代碼" v="C0001" mono />
              <Row k="等級" v="B 級（可讓 3%）" />
              <Row k="聯絡人" v="陳老闆 · 0912-345-678" />
              <Row k="付款條件" v="月結 30 天" />
              <Row k="未收餘額" v="128,400" />
            </dl>
          </div>
          <div className="nx-card">
            <div className="nx-t-sub mb-3">報價資訊</div>
            <dl className="flex flex-col gap-2">
              <Row k="報價日" v="2026-07-29" />
              <Row k="有效至" v="2026-08-07" />
              <Row k="業務" v="王志明" />
              <Row k="出貨倉" v="Z01 台中倉" />
              <Row k="來源" v="即時報價轉正式" />
            </dl>
          </div>
        </>
      }
      tabs={[
        {
          key: 'items',
          label: '明細',
          count: LINES.length,
          content: (
            <div className="nx-card overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="nx-th w-10">#</th>
                    <th className="nx-th">料號</th>
                    <th className="nx-th">品名</th>
                    <th className="nx-th text-right">數量</th>
                    <th className="nx-th text-right">
                      公司定價
                      <div className="nx-th-note">產品組訂</div>
                    </th>
                    <th className="nx-th text-right">報價</th>
                    <th className="nx-th text-right">讓價</th>
                    <th className="nx-th text-right">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {LINES.map((l) => {
                    const diff = (l.unitPrice - l.listPrice) * l.qty;
                    return (
                      <tr key={l.no} className="border-b border-border/60 align-top">
                        <td className="nx-td text-foreground/75">{l.no}</td>
                        <td className="nx-td">
                          <span className="nx-mono">{l.partNo}</span>
                        </td>
                        <td className="nx-td">
                          {l.partName}
                          {l.belowMinReason && (
                            // ⭐ 低於底價的原因就長在那一行旁邊，⛔ 不藏進備註
                            <div className="nx-hint mt-0.5">低於底價：{l.belowMinReason}</div>
                          )}
                        </td>
                        <td className="nx-td nx-num text-right">{l.qty}</td>
                        <td className="nx-td nx-num text-right text-foreground/75">{money(l.listPrice)}</td>
                        <td className="nx-td nx-num text-right">{money(l.unitPrice)}</td>
                        <td className="nx-td nx-num text-right">
                          {diff === 0 ? (
                            <span className="text-foreground/50">—</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">{money(diff)}</span>
                          )}
                        </td>
                        <td className="nx-td nx-num text-right">{money(lineAmount(l))}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="nx-td" colSpan={6} />
                    <td className="nx-td nx-num text-right text-amber-600 dark:text-amber-400">{money(CONCESSION)}</td>
                    <td className="nx-td text-right">
                      <span className="nx-num-md">{money(SUBTOTAL)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ),
        },
        {
          key: 'history',
          label: '歷程',
          count: HISTORY.length,
          content: (
            <div className="nx-card">
              <ol className="flex flex-col gap-3">
                {HISTORY.map((h) => (
                  <li key={h.at} className="flex gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <span className="nx-hint w-24 shrink-0 tabular-nums">{h.at}</span>
                    <span className="nx-hint w-16 shrink-0">{h.who}</span>
                    <span className="nx-body">{h.what}</span>
                  </li>
                ))}
              </ol>
            </div>
          ),
        },
        {
          key: 'related',
          label: '相關單據',
          content: (
            <div className="nx-card">
              <div className="nx-alert-ok">
                還沒有轉出的銷貨單。按下面的「轉銷貨」會帶著這張報價的品項開一張新的銷貨單。
              </div>
            </div>
          ),
        },
      ]}
    />
      </div>
      {/* 預覽用：證明動作列真的按得到（正式頁不會有這一條） */}
      <div className="border-t border-border px-5 py-2">
        <span className="nx-hint">{log.length ? log[0] : '動作列還沒被按過'}</span>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="nx-hint shrink-0">{k}</dt>
      <dd className={mono ? 'nx-mono text-right' : 'nx-body text-right'}>{v}</dd>
    </div>
  );
}
