// apps/nx-ui/src/app/preview/field/page.tsx
//
// 現場模板預覽（六支外殼的「現場殼」）。
// ⛔ 不憑空想欄位——料號照本機資料庫的真實零件抄；資料是假的、⛔ 不呼叫任何 API。
//
// 這一頁要證明三件事（外殼規格 §7）：
//   1. 同一份資料、三套佈局：走動（手機）／定點（固定螢幕）／看板（電腦）
//   2. 佈局由「裝置 ＋ 有沒有註冊工作站」自然決定，⛔ 不是設定出來的
//   3. 工作站綁在螢幕上（記瀏覽器本機），⛔ 不綁在人身上
//
// ⚠️ 正式頁⛔ 不會有下面那排「強制切佈局」的按鈕——那是給執行長在一台電腦上
//    同時看三套長相用的。正式頁一律讓 useWorkstation 自己判斷。

'use client';

import { useState } from 'react';

import { FieldTemplate, type FieldTask } from '@design/templates/FieldTemplate';
import { STATION_KINDS, STATION_LABEL, useWorkstation, type FieldLayout } from '@design/hooks/useWorkstation';

const INIT: FieldTask[] = [
  { id: '1', code: '021 115 562 *', name: '機油芯-P9103', place: 'A 區 3 排 2 層', qty: '4', unit: '個', done: true },
  { id: '2', code: '023 121 004', name: '水泵', place: 'A 區 5 排 1 層', qty: '2', unit: '個' },
  { id: '3', code: '06B 133 551L', name: '噴油嘴', place: 'B 區 1 排 4 層', qty: '6', unit: '個', note: '易碎、單顆包' },
  { id: '4', code: '020 941 521A', name: '倒車燈開關', place: 'B 區 2 排 1 層', qty: '3', unit: '個' },
  { id: '5', code: '020 498 085G', name: '油封-差速器', place: 'C 區 1 排 3 層', qty: '8', unit: '個' },
];

const LAYOUTS: { key: FieldLayout; label: string; who: string }[] = [
  { key: 'roam', label: '走動', who: '手機・撿貨上架的人・一次一件' },
  { key: 'station', label: '定點', who: '固定螢幕・包貨台出貨台・一箱一單' },
  { key: 'board', label: '看板', who: '電腦・倉管主管・看全部進度' },
];

export default function PreviewFieldPage() {
  const [tasks, setTasks] = useState<FieldTask[]>(INIT);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [forced, setForced] = useState<FieldLayout>('roam');
  const [log, setLog] = useState('還沒動作');
  const ws = useWorkstation();

  const complete = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: true } : t)));
    setCurrentId(undefined);
  };

  return (
    <div className="flex h-full flex-col">
      {/* ⚠️ 預覽專用控制列，正式頁⛔ 不會有 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <span className="nx-hint">看哪一套佈局</span>
        {LAYOUTS.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => setForced(l.key)}
            className={forced === l.key ? 'nx-btn-primary' : 'nx-btn'}
            title={l.who}
          >
            {l.label}
          </button>
        ))}
        <span className="mx-2 h-6 w-px bg-border" />
        <span className="nx-hint">這台螢幕註冊成</span>
        {STATION_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => ws.register(k)}
            className={ws.station?.kind === k ? 'nx-btn-primary' : 'nx-btn'}
          >
            {STATION_LABEL[k]}
          </button>
        ))}
        <button type="button" className="nx-btn" onClick={ws.clear}>
          取消註冊
        </button>
        <span className="nx-hint ml-auto">
          自動判斷＝{ws.ready ? ws.layout : '⋯'}
          {ws.station ? `（${ws.station.label}）` : '（沒註冊）'}
        </span>
      </div>

      <div className="min-h-0 flex-1">
        <FieldTemplate
          title="撿貨"
          tasks={tasks}
          currentId={currentId}
          onCurrentChange={setCurrentId}
          forceLayout={forced}
          onScan={(code) => setLog(`掃到條碼：${code}`)}
          scanSlot={
            <button type="button" className="nx-btn h-12 w-full" onClick={() => setLog('（走動版：這裡會開相機掃碼）')}>
              掃條碼
            </button>
          }
          actions={[
            {
              key: 'ok',
              label: '確認取件',
              tone: 'confirm',
              onClick: (t) => {
                if (!t) return;
                complete(t.id);
                setLog(`完成 ${t.code} × ${t.qty}`);
              },
            },
            { key: 'short', label: '缺料', tone: 'problem', onClick: (t) => t && setLog(`回報缺料：${t.code}`) },
            { key: 'skip', label: '跳過', onClick: (t) => t && setLog(`跳過 ${t.code}`) },
          ]}
        />
      </div>

      <div className="border-t border-border px-5 py-2">
        <span className="nx-hint">{log}</span>
      </div>
    </div>
  );
}
