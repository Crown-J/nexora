// apps/nx-ui/src/features/inventory/conversion/ui/ConversionDetailView.tsx
// NX03-STOCK-LITE M3-3b：重組 / 分解 - 詳情 + 過帳 / 作廢
//
// DRAFT 階段：顯示 inputs / outputs（唯讀）+ 過帳 / 作廢按鈕
// POSTED 階段：唯讀 + 顯示 ledger 過帳結果（unitCost / totalCost 已被 service 算好）

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  getConversion,
  softDeleteConversion,
  updateConversion,
} from '../api/conversion';
import type { Conversion, ConversionInput, ConversionOutput } from '../types';
import { CV_STATUS_LABEL, CV_TYPE_LABEL } from './ConversionListView';

export function ConversionDetailView({ id }: { id: string }) {
  const [cv, setCv] = useState<Conversion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConversion(id);
      setCv(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handle = async (fn: () => Promise<unknown>, prefix: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(`${prefix}: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !cv) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !cv) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!cv) return null;

  const isDraft = cv.status === 'DRAFT';

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · CONVERSION</p>
          <h1 className="text-2xl font-mono font-semibold">{cv.docNo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded bg-muted px-2 py-0.5 text-xs">
              類型：{CV_TYPE_LABEL[cv.conversionType] ?? cv.conversionType}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">
              狀態：{CV_STATUS_LABEL[cv.status] ?? cv.status}
            </span>
            <span className="text-muted-foreground">倉庫：{cv.warehouseId}</span>
            <span className="text-muted-foreground">日期：{cv.conversionDate.slice(0, 10)}</span>
          </div>
          {cv.remark ? <p className="mt-2 text-sm text-muted-foreground">備註：{cv.remark}</p> : null}
          {cv.postedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              過帳時間：{new Date(cv.postedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <Link href="/dashboard/inventory/conversion" className="text-sm text-primary hover:underline">
          ← 返回列表
        </Link>
      </header>

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      <section className="flex flex-wrap items-center gap-2 rounded border bg-muted/20 p-3">
        <span className="text-xs text-muted-foreground">流程：</span>
        {isDraft ? (
          <>
            <button
              disabled={busy}
              onClick={() => {
                if (window.confirm(`確認過帳？\n${cv.conversionType === 'M' ? '重組 (N→1) inputs 全出庫、output 入庫 + 加權單位成本' : '分解 (1→N) input 出庫、outputs 入庫 + 按 priceA 或 costRatio 分攤成本'}`))
                  void handle(() => updateConversion(cv.id, { status: 'POSTED' }), '過帳失敗');
              }}
              className="rounded bg-green-700 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              ✅ 過帳（寫 ledger）
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (window.confirm('確認作廢？')) void handle(() => softDeleteConversion(cv.id), '作廢失敗');
              }}
              className="ml-auto rounded border px-3 py-1 text-sm text-muted-foreground hover:bg-destructive/10 disabled:opacity-50"
            >
              作廢
            </button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            {cv.status === 'POSTED' ? '已過帳、不可修改' : '已作廢'}
          </span>
        )}
      </section>

      <LinesTable title="輸入 inputs" rows={cv.inputs ?? []} kind="input" />
      <LinesTable title="輸出 outputs" rows={cv.outputs ?? []} kind="output" />
    </div>
  );
}

function LinesTable(props: {
  title: string;
  rows: (ConversionInput | ConversionOutput)[];
  kind: 'input' | 'output';
}) {
  const { title, rows, kind } = props;
  const showCostRatio = kind === 'output' && rows.some((r) => 'costRatio' in r && r.costRatio !== null);

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left">行</th>
              <th className="px-2 py-2 text-left">料號</th>
              <th className="px-2 py-2 text-left">品名</th>
              <th className="px-2 py-2 text-left">庫位</th>
              <th className="px-2 py-2 text-right">數量</th>
              <th className="px-2 py-2 text-right">單位成本</th>
              <th className="px-2 py-2 text-right">小計</th>
              {showCostRatio ? <th className="px-2 py-2 text-right">costRatio</th> : null}
              <th className="px-2 py-2 text-left">備註</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showCostRatio ? 9 : 8} className="px-2 py-6 text-center text-sm text-muted-foreground">
                  無資料
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/20">
                <td className="px-2 py-1">{r.lineNo}</td>
                <td className="px-2 py-1 font-mono text-xs">{r.partNo}</td>
                <td className="px-2 py-1">{r.partName}</td>
                <td className="px-2 py-1 font-mono text-xs">{r.locationId}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r.qty}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r.unitCost}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r.totalCost}</td>
                {showCostRatio ? (
                  <td className="px-2 py-1 text-right tabular-nums text-xs">
                    {'costRatio' in r ? (r.costRatio ?? '—') : '—'}
                  </td>
                ) : null}
                <td className="px-2 py-1 text-xs text-muted-foreground">{r.remark ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
