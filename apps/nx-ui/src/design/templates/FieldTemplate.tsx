// apps/nx-ui/src/design/templates/FieldTemplate.tsx
//
// 現場模板（v3.0.0 模板軌 第 6 支 ＝ 六支外殼的「現場殼」）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §7
//
// ⭐ 現場殼 vs 開單殼：兩者都在收集資訊產出單據，差別是
//    開單殼是「回答問題」，現場殼是「完成手上的事」。
//    倉管⛔ 不覺得自己在開單，他覺得自己在點貨——但系統產出的是一張進貨單。
//
// ⭐ 一支殼・一個路由・三套佈局（執行長 2026-08-02 拍板）：
//    走動（手機）＝一次一件　·　定點（固定螢幕）＝佇列＋當前件　·　看板（電腦）＝看全部進度
//    ⛔ 不另開手機路由——現在系統裡有 8 個手機專用元件、6 條路由，
//    造成「調貨手機版進不去九宮格」「進貨驗收在電腦上顯示手機畫面」這種病。
//
// ⭐ 規模⛔ 不是設定：沒註冊工作站→全走手機→單人作業；註冊了→定點→多工作線。
//    判斷邏輯在 design/hooks/useWorkstation.ts。
//
// ⚠️ 純呈現元件：不抓資料、不知道 API、不決定業務規則。
//    ⛔ 相機掃碼也不在這裡——那支元件在 features 層（design 區⛔ 不 import features）。
//    走動版用 scanSlot 插槽把掃碼鈕放進來；定點版的掃描槍是純鍵盤輸入、可以自己收。

'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useWorkstation, type FieldLayout } from '@design/hooks/useWorkstation';

export type FieldTask = {
  id: string;
  /** 主識別：料號／單號。⭐ 走動版整個畫面最大的字 */
  code: string;
  /** 品名／客戶名 */
  name?: string;
  /** 位置：庫位／出貨區／車趟 */
  place?: string;
  /** 要處理的量 */
  qty: string;
  unit?: string;
  /** 補充：備註、批號 */
  note?: string;
  done?: boolean;
};

export type FieldAction = {
  key: string;
  label: string;
  /** confirm＝完成這一件（主要動作）· problem＝出狀況 · neutral＝其他 */
  tone?: 'confirm' | 'problem' | 'neutral';
  disabled?: boolean;
  onClick: (task: FieldTask) => void;
};

export type FieldTemplateProps = {
  title: string;
  tasks: FieldTask[];
  /** 目前這一件；⛔ 不傳就取第一筆未完成的 */
  currentId?: string;
  onCurrentChange?: (id: string) => void;
  actions: FieldAction[];
  /**
   * 掃到條碼（定點版的掃描槍＝鍵盤輸入，本元件自己收；
   * 走動版的相機掃碼由 scanSlot 的元件呼叫）
   */
  onScan?: (code: string) => void;
  /** 走動版右下角的掃碼鈕插槽（相機元件在 features 層） */
  scanSlot?: React.ReactNode;
  /** ⚠️ 只給預覽頁覆蓋用；正式頁⛔ 不要傳——佈局該由裝置與工作站決定 */
  forceLayout?: FieldLayout;
  emptyText?: string;
};

/** 大按鈕：戴手套也按得到。⛔ 全程無 transition（介面架構 §6） */
const TONE: Record<'confirm' | 'problem' | 'neutral', string> = {
  confirm: 'border-emerald-600 bg-emerald-600/15 font-bold',
  problem: 'border-amber-500 bg-amber-500/10',
  neutral: 'border-border',
};

// ⚠️ 下面三個子元件放在模組層、⛔ 不寫在 FieldTemplate 裡面——
//    寫在裡面的話每次 render 都是新的元件型別，React 會整段重新掛載：
//    掃描槍打到一半的焦點會掉、動畫與捲動位置也會重來。

/** 當前這一件（走動與定點共用；走動版字更大） */
function CurrentCard({ task, big }: { task: FieldTask | null; big: boolean }) {
  if (!task) return null;
  return (
    <div className="nx-card">
      <div className={big ? 'nx-num-xl leading-8' : 'nx-t-sec'}>{task.code}</div>
      {task.name && <div className="nx-body mt-1">{task.name}</div>}
      {task.place && (
        <div className={big ? 'nx-t-sec mt-2 text-foreground/75' : 'nx-hint mt-1'}>{task.place}</div>
      )}
      <div className="mt-3 flex items-baseline gap-2">
        {/* ⭐ 數量是現場最重要的一個數字——走動版刻意超出常規級距，戴手套隔一公尺也看得到 */}
        <span className={big ? 'text-[40px] font-bold leading-none tabular-nums' : 'nx-num-xl'}>
          {task.qty}
        </span>
        {task.unit && <span className="nx-body">{task.unit}</span>}
      </div>
      {task.note && <div className="nx-hint mt-2">{task.note}</div>}
    </div>
  );
}

/** 動作列：⭐ 完成鍵最寬——⛔ 不要讓「出狀況」跟「完成」一樣大 */
function ActionBar({
  actions,
  task,
  tall,
}: {
  actions: FieldAction[];
  task: FieldTask | null;
  tall: boolean;
}) {
  return (
    <div className="flex gap-2">
      {actions.map((a) => (
        <button
          key={a.key}
          type="button"
          disabled={a.disabled || !task}
          onClick={() => task && a.onClick(task)}
          className={[
            'flex items-center justify-center rounded-lg border-2 px-4 text-[17px] text-foreground disabled:opacity-50',
            tall ? 'h-16' : 'h-12',
            a.tone === 'confirm' ? 'flex-[2]' : 'flex-1',
            TONE[a.tone ?? 'neutral'],
          ].join(' ')}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

function Progress({ idx, total, done }: { idx: number; total: number; done: number }) {
  return (
    <span className="nx-hint">
      第 {idx + 1} / {total} 件　·　已完成 {done}
    </span>
  );
}

export function FieldTemplate({
  title,
  tasks,
  currentId,
  onCurrentChange,
  actions,
  onScan,
  scanSlot,
  forceLayout,
  emptyText = '目前沒有要處理的。',
}: FieldTemplateProps) {
  const ws = useWorkstation();
  const layout: FieldLayout = forceLayout ?? ws.layout;

  const pending = tasks.filter((t) => !t.done);
  const current =
    tasks.find((t) => t.id === currentId) ?? pending[0] ?? tasks[0] ?? null;
  const doneCount = tasks.length - pending.length;
  const idx = current ? tasks.findIndex((t) => t.id === current.id) : -1;

  /**
   * 定點版的掃描槍＝「打很快的鍵盤 ＋ 最後一個 Enter」。
   * ⚠️ 不做隱藏 input 搶焦點——那會跟畫面上其他輸入框打架。
   *    改成收整個視窗的按鍵，焦點在真正的輸入框裡時讓開。
   */
  const buf = useRef('');
  const lastAt = useRef(0);
  useEffect(() => {
    if (layout === 'roam' || !onScan) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      const now = e.timeStamp;
      // 打字間隔超過 300ms＝人在按，⛔ 不是掃描槍 → 重來
      if (now - lastAt.current > 300) buf.current = '';
      lastAt.current = now;
      if (e.key === 'Enter') {
        const code = buf.current.trim();
        buf.current = '';
        if (code.length >= 3) {
          e.preventDefault();
          onScan(code);
        }
        return;
      }
      if (e.key.length === 1) buf.current += e.key;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layout, onScan]);

  const pick = useCallback((id: string) => onCurrentChange?.(id), [onCurrentChange]);

  // ⚠️ 還不知道裝置與工作站時⛔ 不要先閃一個錯的佈局
  if (!ws.ready && !forceLayout) {
    return <div className="nx-hint p-5">載入中⋯</div>;
  }

  if (!tasks.length) {
    return (
      <div className="flex h-full flex-col p-5">
        <h1 className="nx-t-page">{title}</h1>
        <div className="nx-alert-ok mt-4">{emptyText}</div>
      </div>
    );
  }

  // ── 走動（手機）：一次一件 ──────────────────────
  if (layout === 'roam') {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <h1 className="nx-t-sec">{title}</h1>
          <Progress idx={idx} total={tasks.length} done={doneCount} />
        </div>
        <CurrentCard task={current} big />
        <div className="mt-auto flex flex-col gap-2">
          {scanSlot}
          <ActionBar actions={actions} task={current} tall />
        </div>
      </div>
    );
  }

  // ── 定點（固定螢幕）：左佇列 ＋ 右當前件 ─────────
  if (layout === 'station') {
    return (
      <div className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-baseline gap-3">
          <h1 className="nx-t-page">{title}</h1>
          {ws.station && <span className="nx-tag">{ws.station.label}</span>}
          <span className="ml-auto">
            <Progress idx={idx} total={tasks.length} done={doneCount} />
          </span>
        </div>
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="min-h-0 w-72 shrink-0 overflow-auto rounded-xl border border-border">
            {tasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t.id)}
                className={[
                  'flex w-full flex-col items-start border-b border-border/60 px-3 py-2 text-left',
                  t.id === current?.id ? 'bg-primary/10' : '',
                  t.done ? 'opacity-50' : '',
                ].join(' ')}
              >
                <span className="nx-mono">{t.code}</span>
                <span className="nx-hint">
                  {t.place ? `${t.place}　` : ''}
                  {t.qty}
                  {t.unit ?? ''}
                  {t.done ? '　已完成' : ''}
                </span>
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <CurrentCard task={current} big={false} />
            <div className="mt-auto">
              <ActionBar actions={actions} task={current} tall={false} />
              {/* ⚠️ 使用者看得到的文字不用 ⛔／⚠️ 這種內部標記——那是規格書的慣例、不是產品用語 */}
              {onScan && <p className="nx-hint mt-2">掃描槍直接掃，不必先點畫面。</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 看板（電腦・主管視角）：看全部進度 ───────────
  return (
    <div className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-baseline gap-3">
        <h1 className="nx-t-page">{title}</h1>
        <span className="ml-auto">
          <Progress idx={idx} total={tasks.length} done={doneCount} />
        </span>
      </div>
      {/*
        ⚠️ 看板是「看」不是「做」——⛔ 不放完成鍵。
           要動手請到手機或該站的螢幕上做，這樣才知道是誰做的。
      */}
      <div className="nx-card min-h-0 flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="nx-th w-12">#</th>
              <th className="nx-th">料號／單號</th>
              <th className="nx-th">品名</th>
              <th className="nx-th">位置</th>
              <th className="nx-th text-right">數量</th>
              <th className="nx-th">狀態</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <tr key={t.id} className="border-b border-border/60">
                <td className="nx-td text-foreground/75">{i + 1}</td>
                <td className="nx-td">
                  <span className="nx-mono">{t.code}</span>
                </td>
                <td className="nx-td">{t.name ?? '—'}</td>
                <td className="nx-td">{t.place ?? '—'}</td>
                <td className="nx-td nx-num text-right">
                  {t.qty}
                  {t.unit ?? ''}
                </td>
                <td className="nx-td">
                  {t.done ? <span className="nx-pill-ok">已完成</span> : <span className="nx-tag">待處理</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ⚠️ 只有「真的沒註冊」才講這句——已註冊卻在看板（例如預覽頁強制切）時說這句是錯的 */}
      {!ws.station && (
        <p className="nx-hint">
          這台螢幕沒有註冊成工作站，所以顯示的是看板。要在這台做事的話，把它註冊成收貨區／包貨台／出貨台。
        </p>
      )}
    </div>
  );
}
