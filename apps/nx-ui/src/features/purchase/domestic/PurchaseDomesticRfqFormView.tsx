/**
 * @FUNCTION_CODE NX02-PO-UI-001-F01
 * 新增詢價單表單 — 表頭對應 nx02_rfq、明細 nx02_rfq_item（TASK-0420-I3）
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
import type { MockDemand, MockRfqListRow, MockVendor } from './mock-data';
import {
  MOCK_RFQ_CREATOR_NAME,
  MOCK_VENDORS,
  MOCK_WAREHOUSES,
  MOCK_RFQ_CURRENCIES,
  defaultRfqQty,
  demandGapToSafety,
  nextRfqDocNo,
} from './mock-data';

export type RfqItemStatus = 'P' | 'R' | 'S' | 'C';
export type RfqReasonCode = 'S' | 'O' | 'N' | 'P';

export type RfqDraftLine = {
  id: string;
  demandNo: string | null;
  part_no: string;
  part_name: string;
  partBrand: string;
  qty: number;
  unit_price: string;
  lead_time_days: string;
  remark: string;
  itemStatus: RfqItemStatus;
  rfq_reason: RfqReasonCode;
};

function newLineId(): string {
  return `rfq-line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function inferReasonFromDemand(d: MockDemand): RfqReasonCode {
  if (d.source === 'sales') return 'O';
  if (demandGapToSafety(d) > 0) return 'S';
  return 'N';
}

function demandToLine(d: MockDemand): RfqDraftLine {
  return {
    id: newLineId(),
    demandNo: d.no,
    part_no: d.partCode,
    part_name: d.partName,
    partBrand: d.partBrand,
    qty: defaultRfqQty(d),
    unit_price: '',
    lead_time_days: '',
    remark: d.remark ?? '',
    itemStatus: 'P',
    rfq_reason: inferReasonFromDemand(d),
  };
}

function emptyManualLine(): RfqDraftLine {
  return {
    id: newLineId(),
    demandNo: null,
    part_no: '',
    part_name: '',
    partBrand: '',
    qty: 1,
    unit_price: '',
    lead_time_days: '',
    remark: '',
    itemStatus: 'P',
    rfq_reason: 'N',
  };
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + days);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

type EditingCell = { row: number; field: 'qty' | 'unit_price' | 'lead_time_days' | 'remark' } | null;

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

const ITEM_STATUS_OPTIONS: { v: RfqItemStatus; label: string }[] = [
  { v: 'P', label: '待回覆' },
  { v: 'R', label: '已回覆' },
  { v: 'S', label: '採用' },
  { v: 'C', label: '不採用' },
];

const REASON_OPTIONS: { v: RfqReasonCode; label: string }[] = [
  { v: 'S', label: '庫存不足' },
  { v: 'O', label: '客訂' },
  { v: 'N', label: '一般' },
  { v: 'P', label: '專案' },
];

export type PurchaseDomesticRfqFormViewProps = {
  demands: MockDemand[];
  existingRfqs: readonly MockRfqListRow[];
  onCancel: () => void;
  onSubmitSuccess: (row: MockRfqListRow) => void;
};

export function PurchaseDomesticRfqFormView({
  demands,
  existingRfqs,
  onCancel,
  onSubmitSuccess,
}: PurchaseDomesticRfqFormViewProps) {
  const defaultRfqDate = '2026-04-20';
  const [supplierId, setSupplierId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [rfqDate, setRfqDate] = useState(defaultRfqDate);
  const [validUntil, setValidUntil] = useState(() => addDaysIso(defaultRfqDate, 5));
  const [warehouseId, setWarehouseId] = useState('MW1');
  const [currency, setCurrency] = useState<string>('TWD');
  const [headerRemark, setHeaderRemark] = useState('');
  const [lines, setLines] = useState<RfqDraftLine[]>([]);
  const [currentRow, setCurrentRow] = useState(0);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPick, setImportPick] = useState<Set<string>>(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftTag, setDraftTag] = useState(false);
  const [validTouched, setValidTouched] = useState(false);

  const tableRootRef = useRef<HTMLDivElement>(null);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceRefs = useRef<(HTMLInputElement | null)[]>([]);
  const leadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const remarkRefs = useRef<(HTMLInputElement | null)[]>([]);

  const vendor = useMemo(() => MOCK_VENDORS.find((v) => v.id === supplierId) ?? null, [supplierId]);

  const demandNosInLines = useMemo(() => new Set(lines.map((l) => l.demandNo).filter(Boolean) as string[]), [lines]);

  const markDirty = useCallback(() => setDirty(true), []);

  useEffect(() => {
    if (!supplierId) {
      setContactName('');
      setContactPhone('');
      return;
    }
    const v = MOCK_VENDORS.find((x) => x.id === supplierId);
    if (v) {
      setContactName(v.contactName);
      setContactPhone(v.contactPhone);
    }
  }, [supplierId]);

  useEffect(() => {
    if (validTouched) return;
    setValidUntil(addDaysIso(rfqDate, 5));
  }, [rfqDate, validTouched]);

  const focusField = useCallback((row: number, field: NonNullable<EditingCell>['field']) => {
    const refMap = {
      qty: qtyRefs,
      unit_price: priceRefs,
      lead_time_days: leadRefs,
      remark: remarkRefs,
    }[field];
    queueMicrotask(() => refMap.current[row]?.focus());
  }, []);

  useEffect(() => {
    if (!editingCell) return;
    focusField(editingCell.row, editingCell.field);
  }, [editingCell, focusField]);

  const moveRow = useCallback(
    (next: number) => {
      if (lines.length === 0) return;
      const r = Math.max(0, Math.min(lines.length - 1, next));
      setCurrentRow(r);
      setEditingCell(null);
    },
    [lines.length],
  );

  const deleteRowAt = useCallback(
    (idx: number) => {
      setLines((prev) => {
        const next = prev.filter((_, i) => i !== idx);
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
    },
    [markDirty],
  );

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

  const linesValid = useMemo(() => {
    if (lines.length === 0) return false;
    return lines.every((l) => {
      if (l.qty < 1) return false;
      if (!l.demandNo && (!l.part_no.trim() || !l.part_name.trim())) return false;
      return true;
    });
  }, [lines]);

  const canSubmit = Boolean(supplierId && warehouseId && currency && rfqDate && linesValid);

  const submitRfq = useCallback(() => {
    if (!canSubmit || !vendor) return;
    const docNo = nextRfqDocNo(existingRfqs);
    const row: MockRfqListRow = {
      docNo,
      date: rfqDate,
      vendor: vendor.name,
      itemCount: lines.length,
      currency,
      validUntil: validUntil.trim() ? validUntil : addDaysIso(rfqDate, 5),
      status: 'S',
      createdBy: MOCK_RFQ_CREATOR_NAME,
      createdAt: '2026-04-20 15:00',
    };
    onSubmitSuccess(row);
  }, [canSubmit, vendor, existingRfqs, rfqDate, lines.length, currency, validUntil, onSubmitSuccess]);

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
          const cycle: Array<NonNullable<EditingCell>['field']> = ['qty', 'unit_price', 'lead_time_days', 'remark'];
          const i = cycle.indexOf(field);
          if (i < 0) return;
          if (!e.shiftKey) {
            e.preventDefault();
            if (i < cycle.length - 1) {
              setEditingCell({ row, field: cycle[i + 1]! });
            } else if (row < lines.length - 1) {
              setCurrentRow(row + 1);
              setEditingCell({ row: row + 1, field: 'qty' });
            } else {
              setEditingCell(null);
              tableRootRef.current?.focus();
            }
          } else {
            e.preventDefault();
            if (i > 0) {
              setEditingCell({ row, field: cycle[i - 1]! });
            } else if (row > 0) {
              setCurrentRow(row - 1);
              setEditingCell({ row: row - 1, field: 'remark' });
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

  const brandsText = vendor ? vendor.brands.join(' · ') : '';

  const resetForm = () => {
    setSupplierId('');
    setContactName('');
    setContactPhone('');
    setRfqDate(defaultRfqDate);
    setValidUntil(addDaysIso(defaultRfqDate, 5));
    setWarehouseId('MW1');
    setCurrency('TWD');
    setHeaderRemark('');
    setLines([]);
    setCurrentRow(0);
    setEditingCell(null);
    setDraftTag(false);
    setDirty(false);
    setValidTouched(false);
  };

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

      <div className="mt-2 shrink-0 rounded-lg border border-border/50 bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            單號：<span className="font-medium text-foreground">儲存後產生</span>
          </span>
          <span>
            狀態：<span className="font-medium text-foreground">草稿（D）</span>
          </span>
          <span>
            建立人：<span className="font-medium text-foreground">{MOCK_RFQ_CREATOR_NAME}</span>
          </span>
          <span>
            建立時間：<span className="font-medium text-foreground">—</span>
          </span>
        </div>
      </div>

      <div className="mt-2 shrink-0 space-y-3 rounded-lg border border-border/50 bg-card/40 p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="rfq-supplier">
              詢價廠商 <span className="text-destructive">*</span>
            </Label>
            <select
              id="rfq-supplier"
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
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
          <div className="grid gap-1.5">
            <Label htmlFor="rfq-wh">
              入庫倉庫 <span className="text-destructive">*</span>
            </Label>
            <select
              id="rfq-wh"
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                markDirty();
              }}
            >
              {MOCK_WAREHOUSES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rfq-contact">聯絡人</Label>
            <Input
              id="rfq-contact"
              value={contactName}
              onChange={(e) => {
                setContactName(e.target.value);
                markDirty();
              }}
              className="h-9"
              placeholder="選填"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rfq-phone">聯絡電話</Label>
            <Input
              id="rfq-phone"
              value={contactPhone}
              onChange={(e) => {
                setContactPhone(e.target.value);
                markDirty();
              }}
              className="h-9"
              placeholder="選填"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rfq-date">
              詢價日期 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rfq-date"
              type="date"
              value={rfqDate}
              onChange={(e) => {
                setRfqDate(e.target.value);
                markDirty();
              }}
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rfq-valid">有效期限</Label>
            <Input
              id="rfq-valid"
              type="date"
              value={validUntil}
              onChange={(e) => {
                setValidUntil(e.target.value);
                setValidTouched(true);
                markDirty();
              }}
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rfq-ccy">
              幣別 <span className="text-destructive">*</span>
            </Label>
            <select
              id="rfq-ccy"
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                markDirty();
              }}
            >
              {MOCK_RFQ_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="rfq-rmk">備註</Label>
            <Input
              id="rfq-rmk"
              value={headerRemark}
              onChange={(e) => {
                setHeaderRemark(e.target.value);
                markDirty();
              }}
              placeholder="給廠商的說明（選填）"
              className="h-9"
            />
          </div>
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
          <span className="text-sm text-muted-foreground">
            共 <span className="tabular-nums text-foreground">{lines.length}</span> 筆 · 詢價類型：一般採購（G）
          </span>
        </div>

        <div
          ref={tableRootRef}
          tabIndex={0}
          role="grid"
          aria-label="詢價明細"
          className="nx-master-scroll min-h-0 flex-1 overflow-auto pr-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30"
          onMouseDown={() => setEditingCell(null)}
        >
          <table className="nx-master-table w-full min-w-[1100px] border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="nx-master-thead-row text-left text-muted-foreground">
                <th className="w-10 px-1 py-2.5">項次</th>
                <th className="w-40 px-2 py-2.5">
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
                <th className="w-20 px-2 py-2.5">廠牌</th>
                <th className="w-[90px] px-2 py-2.5">詢價數量</th>
                <th className="w-[90px] px-2 py-2.5">回覆單價</th>
                <th className="w-[70px] px-2 py-2.5">交期(天)</th>
                <th className="w-36 px-2 py-2.5">備註</th>
                <th className="w-[72px] px-1 py-2.5">狀態</th>
                <th className="w-24 px-1 py-2.5">原因</th>
                <th className="w-8 px-1 py-2.5" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const selected = idx === currentRow;
                const ro = Boolean(line.demandNo);
                const editQty = editingCell?.row === idx && editingCell.field === 'qty';
                const editPrice = editingCell?.row === idx && editingCell.field === 'unit_price';
                const editLead = editingCell?.row === idx && editingCell.field === 'lead_time_days';
                const editRm = editingCell?.row === idx && editingCell.field === 'remark';
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
                    <td className="px-1 py-2 text-center align-middle tabular-nums text-muted-foreground">{idx + 1}</td>
                    <td className="px-2 py-2 align-middle">
                      <Input
                        value={line.part_no}
                        readOnly={ro}
                        className={cx('h-8 text-xs', ro && 'bg-muted/40')}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, part_no: v } : l)));
                          markDirty();
                        }}
                      />
                    </td>
                    <td className="min-w-0 px-2 py-2 align-middle">
                      <Input
                        value={line.part_name}
                        readOnly={ro}
                        className={cx('h-8 min-w-0 text-xs', ro && 'bg-muted/40')}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, part_name: v } : l)));
                          markDirty();
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <Input
                        value={line.partBrand}
                        readOnly={ro}
                        className={cx('h-8 text-xs', ro && 'bg-muted/40')}
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
                          priceRefs.current[idx] = el;
                        }}
                        type="number"
                        min={0}
                        step="0.01"
                        className={cx(
                          'h-8 text-xs tabular-nums',
                          editPrice && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background',
                        )}
                        value={line.unit_price}
                        placeholder="—"
                        onFocus={() => {
                          setCurrentRow(idx);
                          setEditingCell({ row: idx, field: 'unit_price' });
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unit_price: v } : l)));
                          markDirty();
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <Input
                        ref={(el) => {
                          leadRefs.current[idx] = el;
                        }}
                        type="number"
                        min={0}
                        className={cx(
                          'h-8 text-xs tabular-nums',
                          editLead && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background',
                        )}
                        value={line.lead_time_days}
                        placeholder="—"
                        onFocus={() => {
                          setCurrentRow(idx);
                          setEditingCell({ row: idx, field: 'lead_time_days' });
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, lead_time_days: v } : l)));
                          markDirty();
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <Input
                        ref={(el) => {
                          remarkRefs.current[idx] = el;
                        }}
                        className={cx(
                          'h-8 text-xs',
                          editRm && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background',
                        )}
                        value={line.remark}
                        onFocus={() => {
                          setCurrentRow(idx);
                          setEditingCell({ row: idx, field: 'remark' });
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, remark: v } : l)));
                          markDirty();
                        }}
                      />
                    </td>
                    <td className="px-1 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                      <select
                        className="border-input bg-background h-8 w-full min-w-0 rounded border px-0.5 text-[11px]"
                        value={line.itemStatus}
                        onChange={(e) => {
                          const v = e.target.value as RfqItemStatus;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, itemStatus: v } : l)));
                          markDirty();
                        }}
                      >
                        {ITEM_STATUS_OPTIONS.map((o) => (
                          <option key={o.v} value={o.v}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                      <select
                        className="border-input bg-background h-8 w-full min-w-0 rounded border px-0.5 text-[11px]"
                        value={line.rfq_reason}
                        disabled={ro}
                        title={ro ? '由需求單自動判斷' : undefined}
                        onChange={(e) => {
                          const v = e.target.value as RfqReasonCode;
                          setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, rfq_reason: v } : l)));
                          markDirty();
                        }}
                      >
                        {REASON_OPTIONS.map((o) => (
                          <option key={o.v} value={o.v}>
                            {o.label}
                          </option>
                        ))}
                      </select>
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
        <span className="min-w-0 text-sm text-muted-foreground">
          共 <span className="tabular-nums text-foreground">{lines.length}</span> 個料號
          {vendor ? (
            <>
              {' '}
              · 詢價廠商：<span className="font-medium text-foreground">{vendor.name}</span>
            </>
          ) : null}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (dirty) setCancelOpen(true);
              else {
                resetForm();
                onCancel();
              }
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
            title={!canSubmit ? '請完成必填欄位與明細' : undefined}
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
                resetForm();
                setCancelOpen(false);
                onCancel();
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
