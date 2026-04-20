/**
 * @FUNCTION_CODE NX02-PO-UI-001-F01
 * 詢價節點：列表預設｜新增表單｜詳情占位（TASK-0420-I2/I3）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cx } from '@/shared/lib/cx';
import type { MockDemand, MockRfqListRow, MockRfqStatusCode } from './mock-data';
import { MOCK_RFQS_INITIAL } from './mock-data';
import { PurchaseDomesticRfqFormView } from './PurchaseDomesticRfqFormView';

const REF_DATE = '2026-04-20';

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

function validUntilExpired(validUntil: string, today = REF_DATE): boolean {
  return validUntil < today;
}

function statusBadgeClass(status: MockRfqStatusCode): string {
  switch (status) {
    case 'D':
      return 'bg-muted text-muted-foreground';
    case 'S':
      return 'bg-sky-600/20 text-sky-900 dark:text-sky-100';
    case 'R':
      return 'bg-orange-500/20 text-orange-950 dark:text-orange-50';
    case 'C':
      return 'bg-emerald-600/20 text-emerald-950 dark:text-emerald-50';
    case 'V':
      return 'bg-muted text-muted-foreground line-through';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function statusLabel(status: MockRfqStatusCode): string {
  switch (status) {
    case 'D':
      return '草稿';
    case 'S':
      return '已發送';
    case 'R':
      return '已回覆';
    case 'C':
      return '已關閉';
    case 'V':
      return '已作廢';
    default:
      return status;
  }
}

type RfqListFilter = 'all' | MockRfqStatusCode;

const FILTER_CHIPS: { key: RfqListFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'D', label: '草稿' },
  { key: 'S', label: '已發送' },
  { key: 'R', label: '已回覆' },
  { key: 'C', label: '已關閉' },
  { key: 'V', label: '已作廢' },
];

export type PurchaseDomesticRfqNodeViewProps = {
  demands: MockDemand[];
  onRfqCountChange?: (n: number) => void;
};

export function PurchaseDomesticRfqNodeView({ demands, onRfqCountChange }: PurchaseDomesticRfqNodeViewProps) {
  const [rfqs, setRfqs] = useState<MockRfqListRow[]>(() => [...MOCK_RFQS_INITIAL]);
  const [mode, setMode] = useState<'list' | 'new' | 'detail'>('list');
  const [detailDocNo, setDetailDocNo] = useState<string | null>(null);
  const [highlightDocNo, setHighlightDocNo] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<RfqListFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    onRfqCountChange?.(rfqs.length);
  }, [rfqs.length, onRfqCountChange]);

  const filteredRfqs = useMemo(() => {
    let list = [...rfqs];
    if (listFilter !== 'all') list = list.filter((r) => r.status === listFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => r.docNo.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q));
    }
    return list;
  }, [rfqs, listFilter, search]);

  const appendSubmitted = useCallback((row: MockRfqListRow) => {
    setRfqs((prev) => [row, ...prev]);
    setHighlightDocNo(row.docNo);
    window.setTimeout(() => setHighlightDocNo(null), 5000);
  }, []);

  useEffect(() => {
    if (mode !== 'list') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!e.altKey || e.key.toLowerCase() !== 'a') return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      setMode('new');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  if (mode === 'new') {
    return (
      <PurchaseDomesticRfqFormView
        demands={demands}
        existingRfqs={rfqs}
        onCancel={() => setMode('list')}
        onSubmitSuccess={(row) => {
          appendSubmitted(row);
          setMode('list');
        }}
      />
    );
  }

  if (mode === 'detail' && detailDocNo) {
    const row = rfqs.find((r) => r.docNo === detailDocNo);
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
          <h2 className="text-lg font-semibold text-foreground">詢價單詳情</h2>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setMode('list')}>
            返回列表
          </Button>
        </div>
        <div className="min-h-0 flex-1 rounded-lg border border-dashed border-border/60 bg-card/30 p-4 text-sm text-muted-foreground">
          <p className="font-mono text-foreground">{detailDocNo}</p>
          {row ? (
            <ul className="mt-3 space-y-1.5">
              <li>廠商：{row.vendor}</li>
              <li>狀態：{statusLabel(row.status)}</li>
              <li>料號數：{row.itemCount}</li>
            </ul>
          ) : null}
          <p className="mt-4 text-xs">詳情編輯（佔位，後續接 API）。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
        <h2 className="text-base font-semibold text-foreground">詢價</h2>
        <Button
          type="button"
          size="sm"
          className="h-9 border-amber-500/40 bg-amber-500/15 text-amber-950 hover:bg-amber-500/25 dark:text-amber-50"
          onClick={() => setMode('new')}
        >
          + 新增詢價單 <span className="ml-1 text-xs font-normal opacity-80">Alt+A</span>
        </Button>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">篩選：</span>
          {FILTER_CHIPS.map((c) => (
            <Button
              key={c.key}
              type="button"
              size="sm"
              variant={listFilter === c.key ? 'secondary' : 'outline'}
              className="h-8 px-2.5 text-xs"
              onClick={() => setListFilter(c.key)}
            >
              {c.label}
            </Button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="單號 / 廠商名稱…"
          className="h-9 w-full max-w-md text-sm"
          aria-label="搜尋詢價單號或廠商"
        />
      </div>

      <div className="nx-master-scroll min-h-0 flex-1 overflow-auto rounded-lg border border-border/50 bg-card/30">
        <table className="nx-master-table w-full min-w-[960px] border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="nx-master-thead-row text-left text-muted-foreground">
              <th className="w-40 px-2 py-2.5">
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  詢價單號
                  <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                </span>
              </th>
              <th className="w-[100px] px-2 py-2.5">詢價日期</th>
              <th className="min-w-0 px-2 py-2.5">廠商</th>
              <th className="w-14 px-2 py-2.5 text-right">料號數</th>
              <th className="w-14 px-2 py-2.5">幣別</th>
              <th className="w-[100px] px-2 py-2.5">有效期限</th>
              <th className="w-[90px] px-2 py-2.5">狀態</th>
              <th className="w-20 px-2 py-2.5">建立人</th>
              <th className="w-[120px] px-2 py-2.5">建立時間</th>
            </tr>
          </thead>
          <tbody>
            {filteredRfqs.map((r) => {
              const expired = validUntilExpired(r.validUntil);
              const hi = highlightDocNo === r.docNo;
              return (
                <tr
                  key={r.docNo}
                  className={cx(
                    'nx-master-tbody-row cursor-pointer',
                    hi && 'bg-amber-500/15 ring-1 ring-inset ring-amber-500/40',
                  )}
                  onClick={() => {
                    setDetailDocNo(r.docNo);
                    setMode('detail');
                  }}
                >
                  <td className="px-2 py-2 font-mono text-xs font-medium text-foreground">{r.docNo}</td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">{r.date}</td>
                  <td className="min-w-0 truncate px-2 py-2 text-foreground" title={r.vendor}>
                    {r.vendor}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-foreground">{r.itemCount}</td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">{r.currency}</td>
                  <td className={cx('px-2 py-2 tabular-nums', expired ? 'font-medium text-[#E24B4A]' : 'text-muted-foreground')}>
                    {r.validUntil}
                  </td>
                  <td className="px-2 py-2">
                    <span className={cx('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', statusBadgeClass(r.status))}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-foreground">{r.createdBy}</td>
                  <td className="px-2 py-2 text-xs tabular-nums text-muted-foreground">{r.createdAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRfqs.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">無符合條件之詢價單。</p>
        ) : null}
      </div>
    </div>
  );
}
