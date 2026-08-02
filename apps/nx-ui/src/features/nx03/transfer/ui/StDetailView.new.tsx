// apps/nx-ui/src/features/nx03/transfer/ui/StDetailView.new.tsx
// NX04-QT-SHELL：調撥單詳情面板（比照 SoDetailView.new 模板：左右兩塊 + 三狀態工作列）
//   調撥專屬（Nx03St 倉對倉內部調撥、無客戶）：
//   狀態流 DRAFT→TRANSIT(出庫)→RECEIVED(收貨過帳、動庫存)；作廢限 DRAFT/TRANSIT。
//   明細（DRAFT 限定編輯）：料號 + 出庫位/入庫位（各屬撥出/撥入倉）+ 數量；成本過帳時自動帶平均成本。
'use client';

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { NavButton, ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
import { DocPrintView } from '@/features/shared/doc-shell/DocPrintView';

import { PartPicker, type PickedPart } from '@/features/nx04/quote/ui/PartPicker';
import {
  addStItem,
  createSt,
  getSt,
  patchStItem,
  removeStItem,
  updateSt,
  voidSt,
} from '@data/endpoints/nx03/transfer/api/transfer';
import { listLocation } from '@data/endpoints/shared/master/location/api/location';
import { listWarehouses } from '@data/endpoints/nx01/api/warehouse';
import type { St, StItem } from '@data/types/nx03/transfer';
import { ST_STATUS_LABEL } from '@data/types/nx03/transfer';

const fmt = (n: string | number) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

type LocOpt = { id: string; code: string };

const TOOLBAR_STYLE: React.CSSProperties = {
  backgroundImage: 'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
};

/** 載入某倉全部啟用庫位（下拉用、200 上限足夠單倉） */
async function loadLocs(warehouseId: string): Promise<LocOpt[]> {
  try {
    const res = await listLocation({ page: 1, pageSize: 200, warehouseId, isActive: true });
    return res.items.map((l) => ({ id: l.id, code: l.code }));
  } catch {
    return [];
  }
}

export function StDetailPanel({
  id,
  onChanged,
  itemIndex,
  itemTotal,
  onPrevItem,
  onNextItem,
  onJumpFirst,
  onJumpLast,
  onCreate,
  onSearch,
  initialMode = 'browse',
}: {
  id: string;
  onChanged?: () => void;
  itemIndex?: number;
  itemTotal?: number;
  onPrevItem?: () => void;
  onNextItem?: () => void;
  onJumpFirst?: () => void;
  onJumpLast?: () => void;
  onCreate?: () => void;
  onSearch?: () => void;
  initialMode?: 'browse' | 'editHeader' | 'editItems';
}) {
  const [st, setSt] = useState<St | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'browse' | 'editHeader' | 'editItems'>(initialMode);
  const [addMode, setAddMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selItem, setSelItem] = useState<string | null>(null);
  const [fromLocs, setFromLocs] = useState<LocOpt[]>([]);
  const [toLocs, setToLocs] = useState<LocOpt[]>([]);

  // 表頭可編欄位
  const [stDate, setStDate] = useState('');
  const [remark, setRemark] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSt(await getSt(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const reloadAll = useCallback(async () => {
    await reload();
    onChanged?.();
  }, [reload, onChanged]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!st) return;
    setStDate(st.stDate.slice(0, 10));
    setRemark(st.remark ?? '');
  }, [st?.id, st?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // 出/入倉庫位（明細顯示 code + 編輯下拉）
  useEffect(() => {
    if (!st) return;
    void (async () => {
      const [f, t] = await Promise.all([loadLocs(st.fromWarehouseId), loadLocs(st.toWarehouseId)]);
      setFromLocs(f);
      setToLocs(t);
    })();
  }, [st?.fromWarehouseId, st?.toWarehouseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setMode('browse');
    }
  }, [id]);

  const autoAddRef = useRef(false);
  useEffect(() => {
    if (initialMode === 'editItems' && st && !autoAddRef.current) {
      autoAddRef.current = true;
      setAddMode(true);
    }
  }, [st, initialMode]);

  useEffect(() => {
    const its = st?.items ?? [];
    if (!its.length) {
      if (selItem !== null) setSelItem(null);
      return;
    }
    if (!its.some((i) => i.id === selItem)) setSelItem(its[0].id);
  }, [st, selItem]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const its = st?.items ?? [];
      if (!its.length) return;
      const idx = its.findIndex((i) => i.id === selItem);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const n = its[Math.min(its.length - 1, idx < 0 ? 0 : idx + 1)];
        if (n) setSelItem(n.id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const n = its[Math.max(0, idx < 0 ? 0 : idx - 1)];
        if (n) setSelItem(n.id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [st, selItem]);

  useEffect(() => {
    if (mode !== 'editItems') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (addMode || editingItemId)) {
        e.preventDefault();
        setAddMode(false);
        setEditingItemId(null);
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const map: Record<string, () => void> = {
        a: () => {
          setEditingItemId(null);
          setAddMode(true);
        },
        e: () => {
          if (selItem) {
            setAddMode(false);
            setEditingItemId(selItem);
          }
        },
        d: () => void removeSelectedItem(),
        s: () => {
          setAddMode(false);
          setEditingItemId(null);
          setMode('browse');
        },
        c: () => {
          setAddMode(false);
          setEditingItemId(null);
          setMode('browse');
        },
      };
      const fn = map[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, addMode, editingItemId, selItem]);

  useEffect(() => {
    if (mode !== 'editItems') {
      setAddMode(false);
      setEditingItemId(null);
    }
  }, [mode]);

  useEffect(() => {
    if (!selItem) return;
    document.querySelector(`[data-item-id="${selItem}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selItem]);

  const handle = async (fn: () => Promise<unknown>, prefix: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reloadAll();
    } catch (e) {
      setError(`${prefix}: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !st) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !st) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!st) return null;

  const statusEditable = st.status === 'DRAFT' && !st.voidedAt;
  const headerEditing = mode === 'editHeader' && statusEditable;
  const itemsEditable = mode === 'editItems' && statusEditable;
  const canShip = st.status === 'DRAFT' && (st.items?.length ?? 0) > 0;
  const canReceive = st.status === 'TRANSIT';
  const canVoid = (st.status === 'DRAFT' || st.status === 'TRANSIT') && !st.voidedAt;

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updateSt(id, { stDate, remark });
      setMode('editItems');
      await reloadAll();
    } catch (e) {
      setError(`存檔: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    if (st) {
      setStDate(st.stDate.slice(0, 10));
      setRemark(st.remark ?? '');
    }
    setMode('browse');
  }

  async function removeSelectedItem() {
    if (!selItem) {
      alert('請先選一筆明細');
      return;
    }
    if (!window.confirm('移除選中的明細項目？')) return;
    try {
      await removeStItem(id, selItem);
      await reloadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失敗');
    }
  }

  function doShip() {
    if (!window.confirm('出庫？（單據轉為「調撥中」、待撥入倉收貨）')) return;
    void handle(() => updateSt(id, { status: 'TRANSIT' }), '出庫');
  }
  function doReceive() {
    if (!window.confirm('收貨過帳？（撥出倉扣庫存、撥入倉加庫存）')) return;
    void handle(() => updateSt(id, { status: 'RECEIVED' }), '收貨過帳');
  }
  function doVoid() {
    if (!window.confirm(`作廢調撥單 ${st!.docNo}？`)) return;
    void handle(() => voidSt(id), '作廢');
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-60';
  const roCls = 'w-full rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm text-foreground';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ToolbarPortal>
        <div data-nx-frame className="flex items-center gap-1 border-b border-border/40 px-3 py-2" style={TOOLBAR_STYLE}>
          {mode === 'browse' ? (
            <>
              <NavButton icon={ChevronsLeft} disabled={!onJumpFirst || (itemIndex ?? 1) <= 1} onClick={onJumpFirst} title="第一筆" />
              <NavButton icon={ChevronLeft} disabled={!onPrevItem || (itemIndex ?? 1) <= 1} onClick={onPrevItem} title="上一筆" />
              <span className="min-w-[3rem] px-1 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
                {itemIndex ?? '-'} / {itemTotal ?? '-'}
              </span>
              <NavButton icon={ChevronRight} disabled={!onNextItem || (itemTotal !== undefined && (itemIndex ?? 0) >= itemTotal)} onClick={onNextItem} title="下一筆" />
              <NavButton icon={ChevronsRight} disabled={!onJumpLast || (itemTotal !== undefined && (itemIndex ?? 0) >= itemTotal)} onClick={onJumpLast} title="最後一筆" />
              <ToolbarSeparator />
              <ToolbarButton icon={Plus} letter="A" label="新增" enabled={!!onCreate} onClick={onCreate} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯" enabled={statusEditable && !busy} onClick={() => setMode('editHeader')} />
              <ToolbarButton icon={Trash2} letter="D" label="作廢" enabled={canVoid && !busy} variant="danger" onClick={doVoid} />
              <ToolbarSeparator />
              {/* 調撥狀態流：出庫 → 收貨過帳 */}
              <ToolbarButton icon={Send} letter="G" label="出庫" enabled={canShip && !busy} onClick={doShip} />
              <ToolbarButton icon={CheckCircle2} letter="T" label="收貨過帳" enabled={canReceive && !busy} accent onClick={doReceive} />
              <ToolbarSeparator />
              <ToolbarButton icon={Search} letter="F" label="查詢" enabled={!!onSearch} onClick={onSearch} />
              <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={() => void reload()} />
              <ToolbarButton icon={Printer} letter="P" label="列印" enabled onClick={() => setPrintOpen(true)} />
              <ToolbarButton icon={Download} letter="O" label="匯出" enabled onClick={() => setPrintOpen(true)} />
            </>
          ) : mode === 'editHeader' ? (
            <>
              <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!busy} accent onClick={() => void saveHeader()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={cancelEdit} />
            </>
          ) : (
            <>
              <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!busy} accent onClick={() => setMode('browse')} />
              <ToolbarButton icon={Plus} letter="A" label="新增項目" enabled={itemsEditable} pressed={addMode} onClick={() => { setEditingItemId(null); setAddMode(true); }} />
              <ToolbarButton icon={Pencil} letter="E" label="編輯項目" enabled={itemsEditable && !!selItem} pressed={!!editingItemId} onClick={() => { if (selItem) { setAddMode(false); setEditingItemId(selItem); } }} />
              <ToolbarButton icon={Trash2} letter="D" label="移除項目" enabled={itemsEditable && !!selItem} variant="danger" onClick={() => void removeSelectedItem()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={() => setMode('browse')} />
            </>
          )}
          <div className="flex-1" />
        </div>
      </ToolbarPortal>

      {printOpen && st ? <StPrintSheet doc={st} fromLocs={fromLocs} toLocs={toLocs} onClose={() => setPrintOpen(false)} /> : null}

      {error ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/* 左：表頭 Form */}
        <section
          className={`w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 transition-opacity lg:w-[420px] ${
            mode === 'editItems' ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <FieldRow label="單號"><input readOnly value={st.docNo} className={`${roCls} font-mono`} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value={ST_STATUS_LABEL[st.status] ?? st.status} className={roCls} /></FieldRow>
          <FieldRow label="調撥日期"><input type="date" value={stDate} onChange={(e) => setStDate(e.target.value)} disabled={!headerEditing} className={inputCls} /></FieldRow>
          <FieldRow label="撥出倉"><input readOnly value={st.fromWarehouseName ? `${st.fromWarehouseCode ?? ''}　${st.fromWarehouseName}` : st.fromWarehouseId} className={roCls} /></FieldRow>
          <FieldRow label="撥入倉"><input readOnly value={st.toWarehouseName ? `${st.toWarehouseCode ?? ''}　${st.toWarehouseName}` : st.toWarehouseId} className={roCls} /></FieldRow>
          <FieldRow label="收貨時間"><input readOnly value={st.receivedAt ? st.receivedAt.slice(0, 16).replace('T', ' ') : '—'} className={roCls} /></FieldRow>
          <FieldRow label="建單人員"><input readOnly value={st.createdByName ?? ''} className={roCls} /></FieldRow>
          <FieldRow label="建單日期"><input readOnly value={st.createdAt.slice(0, 10)} className={roCls} /></FieldRow>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">備註：</div>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!headerEditing} rows={3} className="w-full resize-y rounded border bg-background px-2 py-1 text-sm disabled:opacity-60" />
          </div>
          <p className="pt-1 text-[11px] text-muted-foreground">流程：草稿 → 出庫（調撥中）→ 收貨過帳（撥出倉−／撥入倉＋）。</p>
        </section>

        {/* 右：明細 */}
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col transition-opacity ${mode === 'editHeader' ? 'pointer-events-none opacity-40' : ''}`}>
          <StItemsTable
            items={st.items ?? []}
            fromLocs={fromLocs}
            toLocs={toLocs}
            editable={itemsEditable}
            selectedItemId={selItem}
            onSelectItem={setSelItem}
            onRemoveItem={async (itemId) => {
              try {
                await removeStItem(id, itemId);
                await reloadAll();
              } catch (e) {
                alert(e instanceof Error ? e.message : '刪除失敗');
              }
            }}
            editingItemId={itemsEditable ? editingItemId : null}
            renderEditRow={(it) => (
              <StInlineItemRow
                stId={st.id}
                fromLocs={fromLocs}
                toLocs={toLocs}
                nextLineNo={it.lineNo}
                editItem={it}
                onSaved={reloadAll}
                onExit={() => setEditingItemId(null)}
              />
            )}
            addRow={
              itemsEditable && addMode ? (
                <StInlineItemRow
                  stId={st.id}
                  fromLocs={fromLocs}
                  toLocs={toLocs}
                  nextLineNo={((st.items ?? [])[st.items!.length - 1]?.lineNo ?? 0) + 1}
                  onSaved={reloadAll}
                  onExit={() => setAddMode(false)}
                />
              ) : null
            }
          />
        </section>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">{label}：</span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

/** 新增調撥單面板（內嵌）：撥出倉/撥入倉（必異）→ 調撥日期 → 建單 → 進編輯明細 */
export function StCreatePanel({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [fromWh, setFromWh] = useState('');
  const [toWh, setToWh] = useState('');
  const [stDate, setStDate] = useState(new Date().toISOString().slice(0, 10));
  const [remark, setRemark] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmOpen) confirmRef.current?.focus();
  }, [confirmOpen]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await listWarehouses({ page: 1, pageSize: 200, isActive: true });
        setWarehouses(res.items.map((w) => ({ id: w.id, code: w.code, name: w.name })));
      } catch {
        /* 撈不到不擋 */
      }
    })();
  }, []);

  const valid = !!fromWh && !!toWh && fromWh !== toWh;

  async function doSave() {
    if (!valid) {
      setErr('撥出倉與撥入倉必填且不可相同');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const st = await createSt({ fromWarehouseId: fromWh, toWarehouseId: toWh, stDate, remark: remark.trim() || undefined });
      onCreated(st.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const roCls = 'w-full rounded border border-border/40 bg-muted/30 px-2 py-1 text-sm text-muted-foreground';
  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  const whName = (id: string) => {
    const w = warehouses.find((x) => x.id === id);
    return w ? `${w.code}　${w.name}` : '';
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ToolbarPortal>
        <div data-nx-frame className="flex items-center gap-1 border-b border-border/40 px-3 py-2" style={TOOLBAR_STYLE}>
          <ToolbarButton icon={Save} letter="S" label="存檔" enabled={valid && !busy} accent onClick={() => setConfirmOpen(true)} />
          <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={onCancel} />
          <div className="flex-1" />
          <span className="px-1 text-[11px] text-muted-foreground">新增調撥單</span>
        </div>
      </ToolbarPortal>

      {err ? <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{err}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <section className="w-full shrink-0 space-y-2 overflow-auto rounded-lg border border-border/40 bg-card p-4 lg:w-[420px]">
          <FieldRow label="單號"><input readOnly value="存檔後產生" className={roCls} /></FieldRow>
          <FieldRow label="單據狀態"><input readOnly value="新建" className={roCls} /></FieldRow>
          <FieldRow label="調撥日期"><input type="date" value={stDate} onChange={(e) => setStDate(e.target.value)} className={inputCls} /></FieldRow>
          <FieldRow label="撥出倉">
            <select autoFocus value={fromWh} onChange={(e) => setFromWh(e.target.value)} className={inputCls}>
              <option value="">（請選擇）</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code}　{w.name}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="撥入倉">
            <select value={toWh} onChange={(e) => setToWh(e.target.value)} className={inputCls}>
              <option value="">（請選擇）</option>
              {warehouses.filter((w) => w.id !== fromWh).map((w) => (
                <option key={w.id} value={w.id}>{w.code}　{w.name}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="備註"><input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} /></FieldRow>
          <p className="pt-1 text-[11px] text-muted-foreground">存檔後進入明細編輯（料號＋出庫位／入庫位＋數量）。</p>
        </section>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <StItemsTable items={[]} fromLocs={[]} toLocs={[]} editable={false} selectedItemId={null} />
        </section>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h2 className="text-sm font-semibold">確認建立調撥單</h2>
            <p className="text-sm text-muted-foreground">
              {whName(fromWh)} → {whName(toWh)}
              <br />
              存檔後將產生單號，並可開始編輯明細。
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded border px-4 py-1.5 text-sm">取消</button>
              <button ref={confirmRef} type="button" disabled={busy} onClick={() => void doSave()} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
                {busy ? '建立中…' : '確認 (Enter)'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 內嵌明細列（新增/編輯共用）：料號（編輯時鎖定）→ 出庫位 → 入庫位 → 數量。Enter 逐格、末格存檔、Esc 退出。 */
function StInlineItemRow({
  stId,
  fromLocs,
  toLocs,
  nextLineNo,
  editItem,
  onSaved,
  onExit,
}: {
  stId: string;
  fromLocs: LocOpt[];
  toLocs: LocOpt[];
  nextLineNo: number;
  editItem?: StItem;
  onSaved: () => void | Promise<void>;
  onExit: () => void;
}) {
  const isEdit = !!editItem;
  const [part, setPart] = useState<PickedPart | null>(
    editItem ? { id: editItem.partId, code: editItem.partNo, name: editItem.partName, secCode: null, brandName: null, availableTotal: '0', onHandTotal: '0' } : null,
  );
  const [fromLoc, setFromLoc] = useState(editItem?.fromLocationId ?? '');
  const [toLoc, setToLoc] = useState(editItem?.toLocationId ?? '');
  const [qty, setQty] = useState(editItem ? String(editItem.qty) : '1');
  const [busy, setBusy] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const partRef = useRef<HTMLInputElement>(null);
  const fromRef = useRef<HTMLSelectElement>(null);
  const toRef = useRef<HTMLSelectElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit) qtyRef.current?.focus();
    else partRef.current?.focus();
  }, [isEdit]);

  // 預設庫位：清單只有一筆時自動帶
  useEffect(() => {
    if (!fromLoc && fromLocs.length === 1) setFromLoc(fromLocs[0].id);
  }, [fromLocs, fromLoc]);
  useEffect(() => {
    if (!toLoc && toLocs.length === 1) setToLoc(toLocs[0].id);
  }, [toLocs, toLoc]);

  const reset = () => {
    setPart(null);
    setQty('1');
    setPickerKey((k) => k + 1);
    setTimeout(() => partRef.current?.focus(), 0);
  };

  const commit = async () => {
    if (!part || !fromLoc || !toLoc || Number(qty) <= 0) {
      (!part ? partRef : !fromLoc ? fromRef : !toLoc ? toRef : qtyRef).current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (isEdit && editItem) {
        await patchStItem(stId, editItem.id, { fromLocationId: fromLoc, toLocationId: toLoc, qty: Number(qty) });
        await onSaved();
        onExit();
      } else {
        await addStItem(stId, { partId: part.id, fromLocationId: fromLoc, toLocationId: toLoc, qty: Number(qty) });
        await onSaved();
        reset();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : isEdit ? '修改失敗' : '新增失敗');
    } finally {
      setBusy(false);
    }
  };

  const cell = 'w-full rounded border border-primary/40 bg-background px-2 py-1 text-sm';
  const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  return (
    <tr
      className={isEdit ? 'bg-amber-400/10' : 'bg-primary/[0.06]'}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onExit();
        }
      }}
    >
      <td className="px-3 py-1 text-xs text-primary">{isEdit ? editItem!.lineNo : nextLineNo}</td>
      <td className="px-2 py-1" colSpan={2} onKeyDown={(e) => { if (e.key === 'Enter' && !isEdit) { e.preventDefault(); fromRef.current?.focus(); } }}>
        {isEdit ? (
          <span className="font-mono text-[14px]">{editItem!.partNo}　{editItem!.partName}</span>
        ) : (
          <PartPicker key={pickerKey} inputRef={partRef} onPick={(p) => { setPart(p); setTimeout(() => fromRef.current?.focus(), 0); }} />
        )}
      </td>
      <td className="px-2 py-1">
        <select
          ref={fromRef}
          value={fromLoc}
          onChange={(e) => setFromLoc(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); toRef.current?.focus(); } }}
          className={cell}
        >
          <option value="">出庫位…</option>
          {fromLocs.map((l) => (
            <option key={l.id} value={l.id}>{l.code}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1">
        <select
          ref={toRef}
          value={toLoc}
          onChange={(e) => setToLoc(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); qtyRef.current?.focus(); } }}
          className={cell}
        >
          <option value="">入庫位…</option>
          {toLocs.map((l) => (
            <option key={l.id} value={l.id}>{l.code}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1">
        <input
          ref={qtyRef}
          type="number"
          min="0"
          step="1"
          value={qty}
          onFocus={selectAll}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void commit(); } }}
          disabled={busy}
          className={`${cell} text-right tabular-nums`}
        />
      </td>
      <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">—</td>
      <td className="px-2 py-1 text-center text-[11px] text-muted-foreground">Enter↵ / Esc</td>
    </tr>
  );
}

/** 調撥明細表（純呈現）：料號/品名/出庫位/入庫位/數量/單位成本 */
function StItemsTable({
  items,
  fromLocs,
  toLocs,
  editable,
  selectedItemId,
  onSelectItem,
  onRemoveItem,
  addRow,
  editingItemId,
  renderEditRow,
}: {
  items: StItem[];
  fromLocs: LocOpt[];
  toLocs: LocOpt[];
  editable: boolean;
  selectedItemId: string | null;
  onSelectItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  addRow?: React.ReactNode;
  editingItemId?: string | null;
  renderEditRow?: (it: StItem) => React.ReactNode;
}) {
  const colCount = editable ? 8 : 7;
  const locCode = (id: string | null, list: LocOpt[]) => (id ? (list.find((l) => l.id === id)?.code ?? id) : '—');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitRows, setFitRows] = useState(12);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ROW = 37;
    const calc = () => setFitRows(Math.max(0, Math.floor((el.clientHeight - 38 - 42) / ROW)));
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pad = Math.max(0, fitRows - items.length - (addRow ? 1 : 0));
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  return (
    <div ref={scrollRef} className="flex-1 overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap [&_td]:border [&_td]:border-border/60 [&_th]:whitespace-nowrap [&_th]:border [&_th]:border-border/60">
        <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">序號</th>
            <th className="px-3 py-2 text-left">料號</th>
            <th className="px-3 py-2 text-left">品名</th>
            <th className="px-3 py-2 text-left">出庫位</th>
            <th className="px-3 py-2 text-left">入庫位</th>
            <th className="px-3 py-2 text-right">數量</th>
            <th className="px-3 py-2 text-right">單位成本</th>
            {editable ? <th className="px-3 py-2"></th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            if (editingItemId && it.id === editingItemId && renderEditRow) {
              return <Fragment key={it.id}>{renderEditRow(it)}</Fragment>;
            }
            const sel = it.id === selectedItemId;
            return (
              <tr
                key={it.id}
                data-item-id={it.id}
                onClick={() => onSelectItem?.(it.id)}
                className={`cursor-pointer ${
                  sel ? 'bg-[var(--primary)]/15 shadow-[inset_3px_0_0_var(--primary)]' : `${i % 2 === 1 ? 'bg-foreground/[0.04]' : 'bg-card'} hover:bg-accent/15`
                }`}
              >
                <td className="px-3 py-2 text-xs text-muted-foreground">{it.lineNo}</td>
                <td className="px-3 py-2 font-mono text-[14px]">{it.partNo}</td>
                <td className="px-3 py-2">{it.partName}</td>
                <td className="px-3 py-2 font-mono text-[14px]">{locCode(it.fromLocationId, fromLocs)}</td>
                <td className="px-3 py-2 font-mono text-[14px]">{locCode(it.toLocationId, toLocs)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{Number(it.unitCost) > 0 ? fmt(it.unitCost) : '—'}</td>
                {editable ? (
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!window.confirm(`刪除明細 ${it.lineNo}？`)) return;
                        onRemoveItem?.(it.id);
                      }}
                      className="text-xs text-rose-700 hover:underline"
                    >
                      刪除
                    </button>
                  </td>
                ) : null}
              </tr>
            );
          })}
          {addRow}
          {Array.from({ length: pad }).map((_, i) => (
            <tr key={`ph_${i}`} aria-hidden className={(items.length + i) % 2 === 1 ? 'bg-foreground/[0.04]' : 'bg-card'}>
              {Array.from({ length: colCount }).map((__, j) => (
                <td key={j} className="px-3 py-2">&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-10 border-t border-border/60 bg-muted text-sm">
          <tr>
            <td className="px-3 py-2 text-right text-xs text-muted-foreground" colSpan={5}>合計 {items.length} 項</td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt(totalQty)}</td>
            <td />
            {editable ? <td /> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** NX-DOC-PRINT：調撥單列印設定（DocPrintView 皮；出/入庫位代碼由面板庫位表查） */
function StPrintSheet({
  doc,
  fromLocs,
  toLocs,
  onClose,
}: {
  doc: St;
  fromLocs: LocOpt[];
  toLocs: LocOpt[];
  onClose: () => void;
}) {
  const lc = (id: string | null, ls: LocOpt[]) => (id ? ls.find((l) => l.id === id)?.code ?? id : '—');
  const totalQty = (doc.items ?? []).reduce((s, it) => s + Number(it.qty), 0);
  return (
    <DocPrintView
      title="調　撥　單"
      docNo={doc.docNo}
      fields={[
        { label: '單號', value: doc.docNo },
        { label: '調撥日期', value: doc.stDate.slice(0, 10) },
        { label: '撥出倉', value: doc.fromWarehouseName ? `${doc.fromWarehouseCode ?? ''} ${doc.fromWarehouseName}` : doc.fromWarehouseId },
        { label: '撥入倉', value: doc.toWarehouseName ? `${doc.toWarehouseCode ?? ''} ${doc.toWarehouseName}` : doc.toWarehouseId },
        { label: '出庫時間', value: doc.postedAt ? doc.postedAt.slice(0, 10) : '' },
        { label: '收貨時間', value: doc.receivedAt ? doc.receivedAt.slice(0, 10) : '' },
        { label: '建單人員', value: doc.createdByName ?? '' },
        { label: '建單日期', value: doc.createdAt.slice(0, 10) },
      ]}
      columns={[
        { label: '序', width: '6%', align: 'center', render: (it) => it.lineNo },
        { label: '料號', width: '20%', render: (it) => <span className="font-mono">{it.partNo}</span> },
        { label: '品名', render: (it) => it.partName },
        { label: '出庫位', width: '13%', render: (it) => <span className="font-mono">{lc(it.fromLocationId, fromLocs)}</span> },
        { label: '入庫位', width: '13%', render: (it) => <span className="font-mono">{lc(it.toLocationId, toLocs)}</span> },
        { label: '數量', width: '9%', align: 'right', render: (it) => Number(it.qty) },
        { label: '備註', width: '14%', render: (it) => it.remark ?? '' },
      ]}
      items={doc.items ?? []}
      getRowKey={(it) => it.id}
      totals={[{ label: '總數量', value: String(totalQty), strong: true }]}
      note={doc.remark}
      signatures={['出庫倉管', '運送', '收貨倉管']}
      onClose={onClose}
    />
  );
}
