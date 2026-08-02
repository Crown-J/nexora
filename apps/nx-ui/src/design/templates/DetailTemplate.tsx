// apps/nx-ui/src/design/templates/DetailTemplate.tsx
//
// 檢視模板（v3.0.0 模板軌 第 5 支 ＝ 六支外殼的「檢視殼」）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §5
//
// ⭐ 六支殼裡唯一全新的一支，也是電商化收益最高的一支——
//    現在 28 個動態明細頁各做各的，沒有共用殼。
//
// 三條規格（外殼規格 §5）：
//   1. 先給結論：主體標題 ＋ 狀態 ＋ 三個關鍵數字放最上面（Stripe Invoicing 範式）
//   2. 細節收頁籤：明細／出貨／帳款／歷程，要看才展開，⛔ 不一次攤開
//   3. ⭐ 動作列＝修改的唯一入口
//
// ⭐ 為什麼是唯讀＋動作列（外殼規格 §2.4）：
//    已生效的單⛔ 不可直接改欄位——直接改完舊值就消失，帳不可稽核，
//    跟「命脈＝可信可稽核的帳、過得了 COSO」直接衝突。
//    做法同電商：你下單後不能編輯訂單，只能「申請改地址」「申請取消」，
//    **每個修改都是一筆有紀錄的動作**。
//
// 鍵盤（驗收條件＝整頁拔掉滑鼠做得完，介面架構 §7.2）：
//   · 1–9      直接切到第 N 個頁籤（⛔ 不必先 Tab 到頁籤列）
//   · ← →      上一個／下一個頁籤
//   · Tab      進出動作列
//   · Esc      回上一層清單
//   ⚠️ 焦點在輸入框內時全部讓開——⛔ 不搶使用者正在打的字
//
// ⚠️ 純呈現元件：不抓資料、不知道 API、不算金額。資料與事件由呼叫端給。
//    ⛔ 全程不加 transition／animation（介面架構 §6）。

'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

/** 頂部關鍵數字。⭐ 規格是「三個」——⛔ 放到第四個就沒有重點了 */
export type DetailStat = {
  label: string;
  value: string;
  /** 次要說明（例：「剩 5 天」「含稅」）。⚠️ 同色降階、⛔ 不是灰字 */
  hint?: string;
  /** 需要注意的數字（逾期、超標）加重顯示 */
  tone?: 'normal' | 'warn' | 'danger';
};

export type DetailTab = {
  key: string;
  label: string;
  /** 右上角的計數（例：明細 12）。⛔ 0 筆時傳 undefined、不要顯示 0 */
  count?: number;
  content: React.ReactNode;
};

export type DetailAction = {
  key: string;
  label: string;
  /** ⭐ 一個畫面只給一顆主要動作（v3.css .nx-btn-primary 同一條規則） */
  primary?: boolean;
  disabled?: boolean;
  /** 為什麼不能按——⛔ 不要只是變灰讓人猜（例：「已作廢的單不能轉銷貨」） */
  disabledReason?: string;
  onClick: () => void;
};

export type DetailTemplateProps = {
  /** 主體識別：單號／客戶代碼／料號 */
  title: string;
  /** 主體名稱：客戶名／零件品名 */
  subtitle?: string;
  status?: { label: string; tone: 'ok' | 'warn' | 'danger' };
  /** ⭐ 三個關鍵數字。多於三個仍會排出來，但那是規格違規 */
  stats?: DetailStat[];
  tabs: DetailTab[];
  /** ⭐ 修改的唯一入口。空陣列＝這張單現在什麼都不能做 */
  actions?: DetailAction[];
  /**
   * 右側附屬（Shopify 訂單詳情範式：左主體、右附屬並排⛔ 不分頁）。
   * 放「客戶 / 物流 / 付款」這種跟著主體走、但不是主體的資訊。
   */
  aside?: React.ReactNode;
  /** Esc 或返回鈕。沒給就不顯示返回鈕、Esc 也不作用 */
  onBack?: () => void;
  /** 預設打開第幾個頁籤（深連結用），⛔ 不傳就是第一個 */
  initialTabKey?: string;
};

const PILL: Record<'ok' | 'warn' | 'danger', string> = {
  ok: 'nx-pill-ok',
  warn: 'nx-pill-warn',
  danger: 'nx-pill-danger',
};

/** 數字的語氣。⚠️ 只有 warn/danger 上色——⭐ 一張卡片只強調一件事 */
const STAT_TONE: Record<'normal' | 'warn' | 'danger', string> = {
  normal: 'text-foreground',
  warn: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

/** 焦點在可輸入的地方時，數字鍵／方向鍵一律讓開 */
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function DetailTemplate({
  title,
  subtitle,
  status,
  stats,
  tabs,
  actions,
  aside,
  onBack,
  initialTabKey,
}: DetailTemplateProps) {
  const uid = useId();
  const [activeKey, setActiveKey] = useState(
    () => tabs.find((t) => t.key === initialTabKey)?.key ?? tabs[0]?.key ?? '',
  );
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // ⚠️ 呼叫端換了一組頁籤（例如換一張單）時，activeKey 會指到不存在的 key。
  //    這裡用「算出來」處理、⛔ 不用 useEffect 同步 state——那會多一次串聯渲染。
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  const moveTab = useCallback(
    (delta: number) => {
      const i = tabs.findIndex((t) => t.key === active?.key);
      if (i < 0) return;
      const next = tabs[(i + delta + tabs.length) % tabs.length];
      if (!next) return;
      setActiveKey(next.key);
      tabRefs.current[next.key]?.focus();
    },
    [tabs, active],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape' && onBack) {
        e.preventDefault();
        onBack();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveTab(1);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveTab(-1);
        return;
      }
      // 1–9 直接跳頁籤
      if (e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        const t = tabs[idx];
        if (t) {
          e.preventDefault();
          setActiveKey(t.key);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabs, moveTab, onBack]);

  return (
    <div className="flex h-full flex-col">
      {/*
        ⚠️ 附屬欄只渲染一次、靠 flex 方向換位置——
        ⛔ 不用「寬螢幕一份 + 窄螢幕一份」那種寫法：那會讓裡面的可聚焦元素
        在 Tab 順序出現兩次，直接違反 §7.2「整頁拔掉滑鼠做得完」的驗收條件。
      */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-5 xl:flex-row">
        {/* ── 主欄 ─────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* 標題列：主體 + 狀態 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {onBack && (
              <button type="button" className="nx-btn-cell" onClick={onBack}>
                ← 返回
              </button>
            )}
            <span className="nx-t-page">{title}</span>
            {subtitle && <span className="nx-t-sec text-foreground/75">{subtitle}</span>}
            {status && <span className={PILL[status.tone]}>{status.label}</span>}
          </div>

          {/* ⭐ 先給結論：三個關鍵數字 */}
          {stats && stats.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="nx-card-inner">
                  <div className="nx-hint">{s.label}</div>
                  <div className={`nx-num-lg ${STAT_TONE[s.tone ?? 'normal']}`}>{s.value}</div>
                  {s.hint && <div className="nx-hint">{s.hint}</div>}
                </div>
              ))}
            </div>
          )}

          {/* 頁籤列。⛔ 不用 transition */}
          <div role="tablist" aria-label="細節" className="flex flex-wrap items-end gap-1 border-b border-border">
            {tabs.map((t, i) => {
              const on = t.key === active?.key;
              return (
                <button
                  key={t.key}
                  ref={(el) => {
                    tabRefs.current[t.key] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${t.key}`}
                  aria-selected={on}
                  aria-controls={`${uid}-panel-${t.key}`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActiveKey(t.key)}
                  className={
                    on
                      ? 'border-b-2 border-primary px-4 py-2 text-[15px] font-bold text-foreground'
                      : 'border-b-2 border-transparent px-4 py-2 text-[15px] text-foreground/75 hover:text-foreground'
                  }
                >
                  {/* 數字提示：熟手記鍵位、⛔ 不看選單 */}
                  {i < 9 && <span className="nx-hint mr-1.5">{i + 1}</span>}
                  {t.label}
                  {t.count !== undefined && <span className="nx-hint ml-1.5">{t.count}</span>}
                </button>
              );
            })}
          </div>

          {active && (
            <div
              role="tabpanel"
              id={`${uid}-panel-${active.key}`}
              aria-labelledby={`${uid}-tab-${active.key}`}
              className="min-w-0"
            >
              {active.content}
            </div>
          )}
        </div>

        {/* ── 附屬欄（Shopify 範式：寬螢幕右側並排⛔ 不分頁；窄螢幕接在主體下面⛔ 不消失） ── */}
        {aside && (
          <aside className="flex w-full shrink-0 flex-col gap-3 xl:w-80">{aside}</aside>
        )}
      </div>

      {/* ── ⭐ 動作列＝修改的唯一入口 ───────────── */}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card px-5 py-3">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              className={a.primary ? 'nx-btn-primary' : 'nx-btn'}
              disabled={a.disabled}
              // ⛔ 不要只是變灰讓人猜為什麼不能按
              title={a.disabled ? a.disabledReason : undefined}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
          <span className="nx-hint ml-auto">1–9 切頁籤 · ← → 前後 · Esc 返回</span>
        </div>
      )}
    </div>
  );
}
