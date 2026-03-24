/**
 * File: apps/nx-ui/src/app/v0-preview/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-V0PREVIEW-002：macOS 風格 v0 預覽版（測試資料）
 *
 * Notes:
 * - 左側為圖示 Dock（Home / 採購 / 庫存 / 銷售 / 財務 / 分析）
 * - 基本資料從左側功能表改為中間卡片呈現
 */
'use client';

import { useMemo, useState } from 'react';

type ModuleId = 'home' | 'procurement' | 'inventory' | 'sales' | 'finance' | 'analytics';

type BasicCard = {
  code: string;
  title: string;
  desc: string;
  count: string;
};

const basicCards: BasicCard[] = [
  { code: 'NX00-USER', title: '使用者', desc: '帳號、角色與權限設定', count: '128 筆' },
  { code: 'NX00-ROLE', title: '角色', desc: '角色層級與功能群組', count: '12 筆' },
  { code: 'NX00-PART', title: '零件主檔', desc: '零件編碼、規格、單位', count: '4,632 筆' },
  { code: 'NX00-BRAND', title: '品牌', desc: '品牌與產地資訊', count: '264 筆' },
  { code: 'NX00-PARTNER', title: '客戶/供應商', desc: '交易對象主檔', count: '1,142 筆' },
  { code: 'NX00-LOC', title: '倉庫/庫位', desc: '倉儲節點與庫位地圖', count: '386 筆' },
];

const procurementRows = [
  { id: 'PO-2026-001', vendor: '台北工業材料', amount: 'NT$ 182,000', status: '待審核' },
  { id: 'PO-2026-002', vendor: '中區物流供應', amount: 'NT$ 75,500', status: '已核准' },
  { id: 'PO-2026-003', vendor: '南科電子零件', amount: 'NT$ 226,400', status: '進行中' },
];

const inventoryRows = [
  { wh: '台北總倉', stock: '2,450', health: '正常' },
  { wh: '新竹倉儲', stock: '1,890', health: '高負載' },
  { wh: '高雄倉', stock: '980', health: '低庫存' },
];

const salesRows = [
  { id: 'SO-2026-091', customer: '北城科技', amount: 'NT$ 58,700', status: '待出貨' },
  { id: 'SO-2026-092', customer: '久鼎機械', amount: 'NT$ 138,000', status: '處理中' },
  { id: 'SO-2026-093', customer: '群策貿易', amount: 'NT$ 41,220', status: '已完成' },
];

const financeRows = [
  { id: 'INV-9301', target: '北城科技', amount: 'NT$ 58,700', status: '待付款' },
  { id: 'INV-9302', target: '久鼎機械', amount: 'NT$ 138,000', status: '已付款' },
  { id: 'INV-9303', target: '群策貿易', amount: 'NT$ 41,220', status: '逾期' },
];

const chartRows = [
  { label: '1 月', value: 42 },
  { label: '2 月', value: 56 },
  { label: '3 月', value: 49 },
  { label: '4 月', value: 64 },
  { label: '5 月', value: 71 },
  { label: '6 月', value: 78 },
];

const moduleMeta: { id: ModuleId; label: string; short: string; icon: React.FC }[] = [
  { id: 'home', label: 'Home', short: '首頁', icon: IconHome },
  { id: 'procurement', label: '採購', short: '採購', icon: IconBox },
  { id: 'inventory', label: '庫存', short: '庫存', icon: IconWarehouse },
  { id: 'sales', label: '銷售', short: '銷售', icon: IconCart },
  { id: 'finance', label: '財務', short: '財務', icon: IconReceipt },
  { id: 'analytics', label: '分析', short: '分析', icon: IconChart },
];

export default function V0MacStylePreviewPage() {
  const [activeModule, setActiveModule] = useState<ModuleId>('home');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [dockPointerSlot, setDockPointerSlot] = useState<number | null>(null);

  const pageTitle = useMemo(
    () => moduleMeta.find((x) => x.id === activeModule)?.label ?? 'Home',
    [activeModule]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0f17] text-white">
      <BackgroundGlow />

      <div className="relative min-h-screen w-full p-3 sm:p-5">
        <aside
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relativeY = e.clientY - rect.top - 16;
            setDockPointerSlot(relativeY / 58);
          }}
          onMouseLeave={() => setDockPointerSlot(null)}
          className={`fixed bottom-4 top-4 z-40 hidden rounded-r-[28px] border border-l-0 border-white/15 bg-white/[0.08] py-3 pr-3 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] md:flex md:flex-col md:justify-between ${
            dockCollapsed
              ? 'left-0 translate-x-[-70px] shadow-none'
              : 'left-0 translate-x-0 shadow-[0_25px_80px_rgba(0,0,0,0.45)]'
          } w-[clamp(82px,8vw,120px)]`}
        >
          <div className="space-y-2">
            {moduleMeta.map((m, idx) => (
              <DockButton
                key={m.id}
                label={m.short}
                active={activeModule === m.id}
                scale={getDockScaleFromIndex(dockPointerSlot, idx)}
                onClick={() => setActiveModule(m.id)}
              >
                <m.icon />
              </DockButton>
            ))}
          </div>

          <div className="pl-1">
            <button
              onClick={() => setDockCollapsed((prev) => !prev)}
              className="flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs text-white/70 transition hover:bg-white/[0.12]"
            >
              {dockCollapsed ? '>' : '<'}
            </button>
          </div>
        </aside>

        <section
          className={`mx-auto transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${
            dockCollapsed ? 'max-w-[1600px] pl-5 md:pl-10' : 'max-w-[1600px] pl-5 md:pl-[calc(clamp(82px,8vw,120px)+24px)]'
          }`}
        >
          <div className="rounded-[28px] border border-white/15 bg-white/[0.08] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-5">
            <header className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs tracking-[0.28em] text-emerald-200/90">NEXORA</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">macOS Style Dashboard</h1>
                <p className="mt-1 text-sm text-white/60">目前模組：{pageTitle}（測試資料）</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs text-white/80">
                  搜尋
                </button>
                <button className="rounded-xl border border-emerald-300/30 bg-emerald-300/15 px-3 py-2 text-xs text-emerald-100">
                  新增
                </button>
              </div>
            </header>

            <main className="pt-5">
              {activeModule === 'home' && <HomeCardsView />}
              {activeModule === 'procurement' && (
                <TableView title="採購與進貨作業" headers={['單號', '供應商', '金額', '狀態']} rows={procurementRows} />
              )}
              {activeModule === 'inventory' && (
                <TableView title="庫存與倉儲概況" headers={['倉別', '庫存量', '健康度']} rows={inventoryRows} />
              )}
              {activeModule === 'sales' && (
                <TableView title="銷售訂單" headers={['單號', '客戶', '金額', '狀態']} rows={salesRows} />
              )}
              {activeModule === 'finance' && (
                <TableView title="應收與發票" headers={['發票', '對象', '金額', '狀態']} rows={financeRows} />
              )}
              {activeModule === 'analytics' && <SimpleChartView />}
            </main>
          </div>
        </section>
      </div>

      <nav className="fixed bottom-3 left-1/2 z-40 flex w-[calc(100%-24px)] -translate-x-1/2 items-center justify-around rounded-2xl border border-white/15 bg-black/50 px-2 py-2 backdrop-blur-2xl md:hidden">
        {moduleMeta.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveModule(m.id)}
            className={`flex min-w-[50px] flex-col items-center rounded-xl px-2 py-2 text-[10px] transition ${
              activeModule === m.id ? 'bg-emerald-300/20 text-emerald-100' : 'text-white/70'
            }`}
          >
            <m.icon />
            <span className="mt-1">{m.short}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function HomeCardsView() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">基本資料</h2>
        <p className="text-sm text-white/60">原先左側功能表改為中間卡片入口，維持同一份測試資料。</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {basicCards.map((card) => (
          <article
            key={card.code}
            className="group rounded-2xl border border-white/15 bg-white/[0.07] p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.11]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-white/85">{card.title}</div>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/15 px-2 py-0.5 text-[10px] text-emerald-100">
                {card.code}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/60">{card.desc}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-white/45">資料量</span>
              <span className="text-sm font-semibold text-white/90">{card.count}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function TableView({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: Array<Record<string, string>>;
}) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06]">
        <div className="hidden grid-cols-4 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/65 sm:grid">
          {headers.map((h) => (
            <div key={h}>{h}</div>
          ))}
        </div>
        <div className="divide-y divide-white/10">
          {rows.map((row, idx) => (
            <div key={idx} className="grid gap-2 px-4 py-3 sm:grid-cols-4 sm:items-center">
              {Object.values(row).map((value, valueIdx) => (
                <div key={valueIdx} className="text-sm text-white/85">
                  <span className="mr-2 text-xs text-white/45 sm:hidden">{headers[valueIdx]}:</span>
                  {value}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimpleChartView() {
  const max = Math.max(...chartRows.map((x) => x.value));
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">分析報表（測試資料）</h2>
      <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5">
        <div className="flex h-56 items-end gap-3">
          {chartRows.map((row) => (
            <div key={row.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-emerald-500/70 to-cyan-400/70"
                style={{ height: `${(row.value / max) * 100}%` }}
              />
              <div className="text-xs text-white/65">{row.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DockButton({
  children,
  label,
  active,
  scale,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  scale: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{ transform: `scale(${scale})` }}
      className={`group flex w-full flex-col items-center gap-1 rounded-2xl border px-2 py-2 transition ${
        active
          ? 'border-emerald-300/40 bg-emerald-300/20 text-emerald-100'
          : 'border-transparent bg-white/[0.04] text-white/75 hover:border-white/15 hover:bg-white/[0.09]'
      } duration-300 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform`}
    >
      {children}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

function getDockScaleFromIndex(pointerSlot: number | null, index: number): number {
  if (pointerSlot === null) return 1;
  const distance = Math.abs(pointerSlot - index);
  const influence = 2.3;
  if (distance > influence) return 1;
  const ratio = 1 - distance / influence;
  return 1 + ratio * 0.42;
}

function BackgroundGlow() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -left-44 -top-36 h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[120px]" />
      <div className="absolute right-[-140px] top-[15%] h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[140px]" />
      <div className="absolute bottom-[-180px] left-[28%] h-[560px] w-[560px] rounded-full bg-lime-300/10 blur-[160px]" />
    </div>
  );
}

function IconHome() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m12 2 8 4.5v11L12 22 4 17.5v-11L12 2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 22V11.5M20 6.5l-8 5-8-5" />
    </svg>
  );
}

function IconWarehouse() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10 12 4l9 6v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 21v-7h8v7M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 .96-.72L21 7H7.1" />
      <circle cx="10" cy="19" r="1.7" />
      <circle cx="17" cy="19" r="1.7" />
    </svg>
  );
}

function IconReceipt() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 3h10a1 1 0 0 1 1 1v16l-2.5-1.5L13 20l-2.5-1.5L8 20 6 18.5V4a1 1 0 0 1 1-1Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 20V9m6 11V4m6 16v-7m6 7V6" />
    </svg>
  );
}
