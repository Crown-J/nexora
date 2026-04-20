/**
 * @FUNCTION_CODE NX02-PO-UI-001-F01
 * 國內採購工作台 — 詢價節點：新增詢價單表單（TASK-0420-H2）
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cx } from '@/shared/lib/cx';
import type { MockDemand, MockVendor } from './mock-data';
import { MOCK_VENDORS, defaultRfqQty } from './mock-data';

export type RfqDraftLine = {
  id: string;
  demandNo: string | null;
  partCode: string;
  partName: string;
  partBrand: string;
  qty: number;
  note: string;
};

function newLineId(): string {
  return `rfq-line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function demandToLine(d: MockDemand): RfqDraftLine {
  return {
    id: newLineId(),
    demandNo: d.no,
    partCode: d.partCode,
    partName: d.partName,
    partBrand: d.partBrand,
    qty: defaultRfqQty(d),
    note: d.remark ?? '',
  };
}

function emptyManualLine(): RfqDraftLine {
  return {
    id: newLineId(),
    demandNo: null,
    partCode: '',
    partName: '',
    partBrand: '',
    qty: 1,
    note: '',
  };
}

type EditingCell = { row: number; field: 'qty' | 'note' } | null;

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

export type PurchaseDomesticRfqFormViewProps = {
  demands: MockDemand[];
};

export function PurchaseDomesticRfqFormView({ demands }: PurchaseDomesticRfqFormViewProps) {
  const [vendorId, setVendorId] = useState('');
  const [replyDate, setReplyDate] = useState('2026-04-23');
  const [headerNote, setHeaderNote] = useState('');
  const [lines, setLines] = useState<RfqDraftLine[]>([]);
  const [currentRow, setCurrentRow] = useState(0);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPick, setImportPick] = useState<Set<string>>(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftTag, setDraftTag] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(() => new Set());

  const tableRootRef = useRef<HTMLDivElement>(null);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  const noteRefs = useRef<(HTMLInputElement | null)[]>([]);

  const vendor = useMemo(() => MOCK_VENDORS.find((v) => v.id === vendorId) ?? null, [vendorId]);

  const demandNosInLines = useMemo(() => new Set(lines.map((l) => l.demandNo).filter(Boolean) as string[]), [lines]);

  const markDirty = useCallback(() => setDirty(true), []);

  const focusQty = useCallback((row: number) => {
    queueMicrotask(() => qtyRefs.current[row]?.focus());
  }, []);

  const focusNote = useCallback((row: number) => {
    queueMicrotask(() => noteRefs.current[row]?.focus());
  }, []);

  useEffect(() => {
    if (editingCell?.field === 'qty') focusQty(editingCell.row);
    if (editingCell?.field === 'note') focusNote(editingCell.row);
  }, [editingCell, focusQty, focusNote]);

  const moveRow = useCallback(
    (next: number) => {
      if (lines.length === 0) return;
      const r = Math.max(0, Math.min(lines.length - 1, next));
      setCurrentRow(r);
      setEditingCell(null);
    },
    [lines.length],
  );

  const deleteRowAt = useCallback((idx: number) => {
    setLines((prev) => {
      const removed = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      if (removed) {
        setSelectedLineIds((s) => {
          const n = new Set(s);
          n.delete(removed.id);
          return n;
        });
      }
      queueMicrotask(() => {
        setCurrentRow((r) => {
          if (next.length === 0) return 0;
          if (idx < r) return r - 1;
          if (idx === r) return Math.min(r, next.length - 1);
          return Math.min(r, next.length - 1);
        });
      });
      return next;
    });
    setEditingCell(null);
    markDirty();
  }, [markDirty]);

  const insertBelow = useCallback(
    (idx: number) => {
      const row = emptyManualLine();
      setLines((prev) => {
        const pos = idx < 0 ? 0 : Math.min(idx + 1, prev.length);
        const next = [...prev];
        next.splice(pos, 0, row);
        queueMicrotask(() => {
          setCurrentRow(pos);
          setEditingCell({ row: pos, field: 'qty' });
        });
        return next;
      });
      markDirty();
    },
    [markDirty],
  );

  const submitRfq = useCallback(() => {
    if (!vendorId || lines.length === 0) return;
    setDraftTag(false);
    setDirty(false);
    setVendorId('');
    setHeaderNote('');
    setReplyDate('2026-04-23');
    setLines([]);
    setSelectedLineIds(new Set());
    setCurrentRow(0);
    setEditingCell(null);
  }, [lines.length, vendorId]);

  const toggleLineSelected = useCallback((lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (importOpen || cancelOpen || deleteOpen) {
        if (e.key === 'Escape') e.preventDefault();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        submitRfq();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        insertBelow(currentRow);
        return;
      }
      const t = e.target;
      if (isEditableTarget(t)) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditingCell(null);
          tableRootRef.current?.focus();
        }
        if (e.key === 'Tab' && editingCell) {
          const { row, field } = editingCell;
          if (!e.shiftKey && field === 'qty') {
            e.preventDefault();
            setEditingCell({ row, field: 'note' });
          } else if (!e.shiftKey && field === 'note') {
            e.preventDefault();
            if (row < lines.length - 1) {
              setCurrentRow(row + 1);
              setEditingCell({ row: row + 1, field: 'qty' });
            } else {
              setEditingCell(null);
              tableRootRef.current?.focus();
            }
          } else if (e.shiftKey && field === 'note') {
            e.preventDefault();
            setEditingCell({ row, field: 'qty' });
          } else if (e.shiftKey && field === 'qty') {
            e.preventDefault();
            if (row > 0) {
              setCurrentRow(row - 1);
              setEditingCell({ row: row - 1, field: 'note' });
            }
          }
        }
        return;
      }

      if (lines.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (e.ctrlKey) moveRow(lines.length - 1);
          else moveRow(currentRow + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (e.ctrlKey) moveRow(0);
          else moveRow(currentRow - 1);
          break;
        case 'Enter':
          e.preventDefault();
          setEditingCell({ row: currentRow, field: 'qty' });
          break;
        case 'Delete':
          e.preventDefault();
          setDeleteOpen(true);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    importOpen,
    cancelOpen,
    deleteOpen,
    vendorId,
    lines.length,
    currentRow,
    editingCell,
    moveRow,
    insertBelow,
    submitRfq,
  ]);

  const openImport = () => {
    setImportPick(new Set());
    setImportOpen(true);
  };

  const toggleImport = (no: string, disabled: boolean) => {
    if (disabled) return;
    setImportPick((prev) => {
      const next = new Set(prev);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  };

  const confirmImport = () => {
    const picked = demands.filter((d) => importPick.has(d.no) && !demandNosInLines.has(d.no));
    const newLines = picked.map(demandToLine);
    setLines((prev) => {
      const merged = [...prev, ...newLines];
      queueMicrotask(() => {
        if (newLines.length > 0) {
          setCurrentRow(merged.length - 1);
          setEditingCell(null);
          tableRootRef.current?.focus();
        }
      });
      return merged;
    });
    setImportOpen(false);
    markDirty();
  };

  const onManualAdd = () => {
    insertBelow(lines.length === 0 ? -1 : currentRow);
  };

  const canSubmit = Boolean(vendorId && lines.length > 0);

  const brandsText = vendor ? vendor.brands.join(' · ') : '';

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">新增詢價單</h2>
          {draftTag ? (
            <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              草稿
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 shrink-0 space-y-3 rounded-lg border border-border/50 bg-card/40 p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="rfq-vendor">詢價廠商</Label>
            <select
              id="rfq-vendor"
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={vendorId}
              onChange={(e) => {
                setVendorId(e.target.value);
                markDirty();
              }}
            >
              <option value="">請選擇廠商…</option>
              {MOCK_VENDORS.map((v: MockVendor) => (
                <option key={v.id} value={v.id}>
                  {v.name}（{v.grade} 級）
                </option>
              ))}
            </select>
            {vendor ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                代理廠牌：<span className="font-medium">{brandsText}</span>
              </p>
            ) : null}
          </div>
          <div className="grid gap-1.5 sm:max-w-[12rem]">
            <Label htmlFor="rfq-reply">期望回覆日</Label>
            <Input
              id="rfq-reply"
              type="date"
              value={replyDate}
              onChange={(e) => {
                setReplyDate(e.target.value);
                markDirty();
              }}
              className="h-9"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rfq-hnote">備註</Label>
          <Input
            id="rfq-hnote"
            value={headerNote}
            onChange={(e) => {
              setHeaderNote(e.target.value);
              markDirty();
            }}
            placeholder="表頭備註"
            className="h-9"
          />
        </div>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-card/30">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-2 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" className="h-8" onClick={openImport}>
              + 從需求單帶入
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={onManualAdd}>
              + 手動新增
            </Button>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">共 {lines.length} 筆</span>
        </div>

        <div
          ref={tableRootRef}
          tabIndex={0}
          role="grid"
          aria-label="詢價明細"
          className="nx-master-scroll min-h-0 flex-1 overflow-auto pr-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30"
          onMouseDown={() => setEditingCell(null)}
        >
          <table className="nx-master-table w-full min-w-[720px] border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="nx-master-thead-row text-left text-muted-foreground">
                <th className="w-8 px-1 py-2.5">
                  <span className="sr-only">選取</span>
                </th>
                <th className="w-[180px] px-2 py-2.5">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    料號
                    <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                  </span>
                </th>
                <th className="min-w-0 px-2 py-2.5">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    品名
                    <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                  </span>
                </th>
                <th className="w-20 px-2 py-2.5">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    廠牌
                    <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                  </span>
                </th>
                <th className="w-[100px] px-2 py-2.5">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    詢價數量
                    <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                  </span>
                </th>
                <th className="w-40 px-2 py-2.5">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    備註
                    <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                  </span>
                </th>
                <th className="w-8 px-1 py-2.5" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const selected = idx === currentRow;
                const editQty = editingCell?.row === idx && editingCell.field === 'qty';
                const editNote = editingCell?.row === idx && editingCell.field === 'note';
                const rowCls = cx(
                  'nx-master-tbody-row cursor-pointer transition-colors duration-150',
                  selected && 'border-l-2 border-l-amber-500 bg-[rgba(232,160,32,0.10)]',
                  !selected && 'hover:bg-primary/12',
                );
                return (
                  <tr
                    key={line.id}
                    className={rowCls}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setCurrentRow(idx);
                    }}
                  >
                    <td className="px-1 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="nx-master-row-checkbox mx-auto block"
                        aria-label={`選取 ${line.partName || line.partCode}`}
                        checked={selectedLineIds.has(line.id)}
                        onChange={() => toggleLineSelected(line.id)}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <Input
                        value={line.partCode}
                        readOnly={Boolean(line.demandNo)}
                        className={cx('h-8 text-xs', line.demandNo && 'bg-muted/40')}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, partCode: v } : l)));
                          markDirty();
                        }}
                      />
                    </td>
                    <td className="min-w-0 px-2 py-2 align-middle">
                      <Input
                        value={line.partName}
                        readOnly={Boolean(line.demandNo)}
                        className={cx('h-8 min-w-0 text-xs', line.demandNo && 'bg-muted/40')}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, partName: v } : l)));
                          markDirty();
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <Input
                        value={line.partBrand}
                        readOnly={Boolean(line.demandNo)}
                        className={cx('h-8 text-xs', line.demandNo && 'bg-muted/40')}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, partBrand: v } : l)));
                          markDirty();
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <Input
                        ref={(el) => {
                          qtyRefs.current[idx] = el;
                        }}
                        type="number"
                        min={1}
                        className={cx(
                          'h-8 text-xs tabular-nums',
                          editQty && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background',
                        )}
                        value={line.qty}
                        onFocus={() => {
                          setCurrentRow(idx);
                          setEditingCell({ row: idx, field: 'qty' });
                        }}
                        onChange={(e) => {
                          const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, qty: v } : l)));
                          markDirty();
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <Input
                        ref={(el) => {
                          noteRefs.current[idx] = el;
                        }}
                        className={cx(
                          'h-8 text-xs',
                          editNote && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background',
                        )}
                        value={line.note}
                        onFocus={() => {
                          setCurrentRow(idx);
                          setEditingCell({ row: idx, field: 'note' });
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, note: v } : l)));
                          markDirty();
                        }}
                      />
                    </td>
                    <td className="px-1 py-2 text-center align-middle">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label="刪除此列"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentRow(idx);
                          setDeleteOpen(true);
                        }}
                      >
                        ×
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lines.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">尚無明細，請從需求單帶入或手動新增。</p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2">
        <span className="text-sm text-muted-foreground">
          共 <span className="tabular-nums text-foreground">{lines.length}</span> 個料號
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (dirty) setCancelOpen(true);
            }}
          >
            取消
          </Button>
          <Button type="button" variant="secondary" onClick={() => setDraftTag(true)}>
            儲存草稿
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            title={!canSubmit ? '請選廠商並至少一筆明細' : undefined}
            onClick={submitRfq}
          >
            送出詢價 <span className="ml-1 text-xs font-normal opacity-80">Alt+S</span>
          </Button>
        </div>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[min(90dvh,720px)] max-w-2xl overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>從採購需求單帶入</DialogTitle>
            <DialogDescription>勾選要加入詢價明細的需求單；已帶入者無法重複選取。</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-auto rounded-md border border-border/50">
            <table className="nx-master-table w-full border-collapse text-sm">
              <thead>
                <tr className="nx-master-thead-row text-left text-muted-foreground">
                  <th className="w-10 px-2 py-2"> </th>
                  <th className="px-2 py-2">品名</th>
                  <th className="w-24 px-2 py-2">廠牌</th>
                  <th className="w-24 px-2 py-2">建議量</th>
                  <th className="w-28 px-2 py-2">來源</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((d) => {
                  const inTable = demandNosInLines.has(d.no);
                  const picked = importPick.has(d.no);
                  return (
                    <tr key={d.no} className="nx-master-tbody-row">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          className="nx-master-row-checkbox"
                          checked={inTable || picked}
                          disabled={inTable}
                          onChange={() => toggleImport(d.no, inTable)}
                        />
                      </td>
                      <td className="px-2 py-2">{d.partName}</td>
                      <td className="px-2 py-2">{d.partBrand}</td>
                      <td className="px-2 py-2 tabular-nums">{defaultRfqQty(d)}</td>
                      <td className="px-2 py-2 text-xs">
                        {d.source === 'system' ? '系統' : '業務'}
                        {d.isUrgent ? '·急' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between">
            <span className="text-sm text-muted-foreground">
              已選 <span className="tabular-nums text-foreground">{importPick.size}</span> 筆
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
                取消
              </Button>
              <Button type="button" onClick={confirmImport}>
                帶入
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>捨棄變更？</DialogTitle>
            <DialogDescription>將捨棄尚未儲存的編輯內容。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
              返回
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setLines([]);
                setVendorId('');
                setHeaderNote('');
                setReplyDate('2026-04-23');
                setDraftTag(false);
                setSelectedLineIds(new Set());
                setCurrentRow(0);
                setEditingCell(null);
                setDirty(false);
                setCancelOpen(false);
              }}
            >
              捨棄
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>刪除此列？</DialogTitle>
            <DialogDescription>確定要從詢價明細移除目前選取的列嗎？</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                deleteRowAt(currentRow);
                setDeleteOpen(false);
              }}
            >
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
