/**
 * File: apps/nx-ui/src/features/nx02/stock-take/hooks/useStockTakeDetail.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-UI-HOOK-002：盤點單明細／儲存／過帳／作廢／匯出
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  downloadStockTakeCsv,
  getStockTake,
  patchStockTakeItems,
  postStockTake,
  voidStockTake,
} from '../api/stock-take';
import type { StockTakeDetailDto, StockTakeItemDto } from '../types';

export type LineDraft = StockTakeItemDto & {
  countedInput: string;
  remarkInput: string;
};

function toDrafts(items: StockTakeItemDto[]): LineDraft[] {
  return items.map((it) => ({
    ...it,
    countedInput: it.countedQty == null ? '' : String(it.countedQty),
    remarkInput: it.remark ?? '',
  }));
}

/**
 * @FUNCTION_CODE NX02-STTK-UI-HOOK-002-F01
 */
export function useStockTakeDetail(id: string) {
  const router = useRouter();
  const [doc, setDoc] = useState<StockTakeDetailDto | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getStockTake(id);
      setDoc(d);
      setLines(toDrafts(d.items));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setDoc(null);
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const editable = doc?.status === 'D' || doc?.status === 'C';

  const updateLine = useCallback((itemId: string, patch: Partial<Pick<LineDraft, 'countedInput' | 'remarkInput'>>) => {
    setLines((prev) => prev.map((x) => (x.id === itemId ? { ...x, ...patch } : x)));
  }, []);

  const save = useCallback(async () => {
    if (!doc || !editable) return;
    setSaving(true);
    try {
      const items = lines.map((l) => ({
        id: l.id,
        countedQty: l.countedInput.trim() === '' ? null : Number(l.countedInput),
        remark: l.remarkInput.trim() || null,
      }));
      const d = await patchStockTakeItems(doc.id, { items });
      setDoc(d);
      setLines(toDrafts(d.items));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '儲存失敗';
      setError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [doc, editable, lines]);

  const post = useCallback(async () => {
    if (!doc || !editable) return;
    let gain = 0;
    let loss = 0;
    let same = 0;
    let skip = 0;
    for (const l of lines) {
      const c = l.countedInput.trim() === '' ? null : Number(l.countedInput);
      if (c == null) {
        skip += 1;
        continue;
      }
      const diff = c - l.systemQty;
      if (diff > 0) gain += 1;
      else if (diff < 0) loss += 1;
      else same += 1;
    }
    const msg = `盤盈 ${gain} 筆／盤虧 ${loss} 筆／無差異 ${same} 筆／未盤 ${skip} 筆\n確定過帳？`;
    if (!window.confirm(msg)) return;
    setSaving(true);
    try {
      await save();
    } catch {
      setSaving(false);
      return;
    }
    try {
      const d = await postStockTake(doc.id);
      setDoc(d);
      setLines(toDrafts(d.items));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '過帳失敗');
    } finally {
      setSaving(false);
    }
  }, [doc, editable, lines, save]);

  const voidDoc = useCallback(async () => {
    if (!doc || doc.status !== 'D') return;
    if (!window.confirm('確定作廢？')) return;
    setSaving(true);
    try {
      const d = await voidStockTake(doc.id);
      setDoc(d);
      setLines(toDrafts(d.items));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '作廢失敗');
    } finally {
      setSaving(false);
    }
  }, [doc]);

  const exportCsv = useCallback(async () => {
    if (!doc) return;
    try {
      await downloadStockTakeCsv(doc.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '匯出失敗');
    }
  }, [doc]);

  const back = useCallback(() => router.push('/dashboard/nx02/stock-take'), [router]);

  return useMemo(
    () => ({
      doc,
      lines,
      loading,
      saving,
      error,
      editable,
      updateLine,
      save,
      post,
      voidDoc,
      exportCsv,
      reload: load,
      back,
    }),
    [doc, lines, loading, saving, error, editable, updateLine, save, post, voidDoc, exportCsv, load, back],
  );
}

export type StockTakeDetailVm = ReturnType<typeof useStockTakeDetail>;
