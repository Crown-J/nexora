/**
 * @FUNCTION_CODE NX00-DOC-UI-001-F01
 * 明細表格：主檔 nx-master-table 樣式 + Excel 式鍵盤
 */

'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@design/primitives/button';
import { Input } from '@design/primitives/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@design/primitives/dialog';
import { cx } from '@/shared/lib/cx';

export type DocItemColKind = 'index' | 'text' | 'number' | 'select' | 'checkbox' | 'readonly' | 'actions';

export type DocItemCellRenderArgs = {
  row: DocItemRow;
  rowIndex: number;
  value: unknown;
  update: (v: unknown) => void;
  selected: boolean;
  editingHere: boolean;
  setEditing: (e: Editing) => void;
  setCurrentRow: (i: number) => void;
  inputRef: (el: HTMLInputElement | HTMLSelectElement | null) => void;
};

export type DocItemColumn = {
  id: string;
  header: string;
  widthClass: string;
  kind: DocItemColKind;
  align?: 'left' | 'right' | 'center';
  selectOptions?: readonly { value: string; label: string }[];
  /** 套在 text/number 輸入框（Tab 順序仍依欄位） */
  inputClassName?: string | ((row: DocItemRow) => string);
  /** 自訂儲存格（不參與預設 Tab 鍵順序） */
  renderCell?: (p: DocItemCellRenderArgs) => ReactNode;
};

export type DocItemRow = Record<string, unknown> & { id: string };

type Editing = { row: number; col: string } | null;

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

export type DocItemTableProps = {
  ariaLabel?: string;
  columns: DocItemColumn[];
  rows: DocItemRow[];
  setRows: React.Dispatch<React.SetStateAction<DocItemRow[]>>;
  onAddRow?: () => void;
  toolbar?: React.ReactNode;
  emptyHint?: string;
  /** 若回傳 true，該列刪除鈕停用（仍會選取列） */
  disableRowDelete?: (row: DocItemRow) => boolean;
};

export function DocItemTable({
  columns,
  rows,
  setRows,
  onAddRow,
  toolbar,
  ariaLabel = '單據明細',
  emptyHint = '尚無明細',
  disableRowDelete,
}: DocItemTableProps) {
  const editableCols = useMemo(
    () =>
      columns
        .filter((c) => !c.renderCell && ['text', 'number', 'select', 'checkbox'].includes(c.kind))
        .map((c) => c.id),
    [columns],
  );

  const [currentRow, setCurrentRow] = useState(0);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const tableRootRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Record<string, (HTMLInputElement | HTMLSelectElement | null)[]>>({});

  const setCellRef = useCallback((colId: string, rowIdx: number, el: HTMLInputElement | HTMLSelectElement | null) => {
    if (!cellRefs.current[colId]) cellRefs.current[colId] = [];
    cellRefs.current[colId]![rowIdx] = el;
  }, []);

  const focusCell = useCallback((row: number, colId: string) => {
    queueMicrotask(() => cellRefs.current[colId]?.[row]?.focus());
  }, []);

  useEffect(() => {
    if (!editing) return;
    focusCell(editing.row, editing.col);
  }, [editing, focusCell]);

  const moveRow = useCallback(
    (next: number) => {
      if (rows.length === 0) return;
      setCurrentRow((r) => Math.max(0, Math.min(rows.length - 1, next)));
      setEditing(null);
    },
    [rows.length],
  );

  const moveEditHoriz = useCallback(
    (row: number, colId: string, dir: 1 | -1) => {
      const i = editableCols.indexOf(colId);
      if (i < 0) return;
      const ni = i + dir;
      if (ni >= 0 && ni < editableCols.length) {
        setEditing({ row, col: editableCols[ni]! });
      } else if (dir === 1 && row < rows.length - 1) {
        setCurrentRow(row + 1);
        setEditing({ row: row + 1, col: editableCols[0]! });
      } else if (dir === -1 && row > 0) {
        setCurrentRow(row - 1);
        setEditing({ row: row - 1, col: editableCols[editableCols.length - 1]! });
      } else {
        setEditing(null);
        tableRootRef.current?.focus();
      }
    },
    [editableCols, rows.length],
  );

  const deleteRowAt = useCallback(
    (idx: number) => {
      setRows((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        queueMicrotask(() => {
          setCurrentRow((r) => {
            if (next.length === 0) return 0;
            if (idx < r) return r - 1;
            if (idx === r) return Math.min(r, next.length - 1);
            return r;
          });
        });
        return next;
      });
      setEditing(null);
    },
    [setRows],
  );

  const updateCell = useCallback(
    (rowIdx: number, colId: string, value: unknown) => {
      setRows((prev) =>
        prev.map((row, i) => (i === rowIdx ? { ...row, [colId]: value } : { ...row })),
      );
    },
    [setRows],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (deleteOpen) {
        if (e.key === 'Escape') e.preventDefault();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        if (!onAddRow) return;
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        onAddRow();
        return;
      }
      const t = e.target;
      if (isEditableTarget(t)) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditing(null);
          tableRootRef.current?.focus();
        }
        if (e.key === 'Tab' && editing) {
          e.preventDefault();
          moveEditHoriz(editing.row, editing.col, e.shiftKey ? -1 : 1);
        }
        return;
      }

      if (rows.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (e.ctrlKey) moveRow(rows.length - 1);
          else moveRow(currentRow + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (e.ctrlKey) moveRow(0);
          else moveRow(currentRow - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (editableCols.length > 0) setEditing({ row: currentRow, col: editableCols[0]! });
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
    deleteOpen,
    rows.length,
    currentRow,
    editing,
    moveRow,
    moveEditHoriz,
    editableCols,
    onAddRow,
  ]);

  useEffect(() => {
    setCurrentRow((r) => Math.min(Math.max(0, r), Math.max(0, rows.length - 1)));
  }, [rows.length]);

  const alignCls = (a?: string) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-card/30">
      {toolbar ? <div className="shrink-0 border-b border-border/40 bg-muted/20 px-2 py-2">{toolbar}</div> : null}
      <div
        ref={tableRootRef}
        tabIndex={0}
        role="grid"
        aria-label={ariaLabel}
        className="nx-master-scroll min-h-0 flex-1 overflow-auto pr-0.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30"
        onMouseDown={() => setEditing(null)}
      >
        <table className="nx-master-table w-full min-w-[720px] border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="nx-master-thead-row text-left text-muted-foreground">
              {columns.map((c) => (
                <th key={c.id} className={cx('px-2 py-2.5', c.widthClass, alignCls(c.align))}>
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    {c.header}
                    <ArrowUpDown className="size-3.5 shrink-0 opacity-50" aria-hidden />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const selected = rowIdx === currentRow;
              return (
                <tr
                  key={row.id}
                  className={cx(
                    'nx-master-tbody-row cursor-pointer',
                    selected && 'border-l-2 border-l-amber-500 bg-[rgba(232,160,32,0.08)]',
                  )}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setCurrentRow(rowIdx);
                  }}
                  onMouseEnter={() => setCurrentRow(rowIdx)}
                >
                  {columns.map((c) => {
                    const editHere = editing?.row === rowIdx && editing.col === c.id;
                    const val = row[c.id];

                    if (c.renderCell) {
                      return (
                        <td key={c.id} className={cx('px-2 py-2 align-middle', c.widthClass, alignCls(c.align))} onClick={(e) => e.stopPropagation()}>
                          {c.renderCell({
                            row,
                            rowIndex: rowIdx,
                            value: val,
                            update: (v) => updateCell(rowIdx, c.id, v),
                            selected,
                            editingHere: editHere,
                            setEditing,
                            setCurrentRow,
                            inputRef: (el) => setCellRef(c.id, rowIdx, el),
                          })}
                        </td>
                      );
                    }

                    if (c.kind === 'index') {
                      return (
                        <td key={c.id} className={cx('px-2 py-2 tabular-nums text-muted-foreground', c.widthClass, alignCls(c.align))}>
                          {rowIdx + 1}
                        </td>
                      );
                    }
                    if (c.kind === 'readonly') {
                      return (
                        <td key={c.id} className={cx('px-2 py-2 align-middle', c.widthClass, alignCls(c.align))}>
                          <span className="break-all text-xs">{String(val ?? '')}</span>
                        </td>
                      );
                    }
                    if (c.kind === 'number') {
                      const extraInput =
                        typeof c.inputClassName === 'function' ? c.inputClassName(row) : c.inputClassName;
                      return (
                        <td key={c.id} className={cx('px-2 py-2 align-middle', c.widthClass)} onClick={(e) => e.stopPropagation()}>
                          <Input
                            ref={(el) => setCellRef(c.id, rowIdx, el)}
                            type="number"
                            className={cx(
                              'h-8 text-xs tabular-nums',
                              editHere && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background',
                              extraInput,
                            )}
                            value={val === '' || val === undefined || val === null ? '' : Number(val)}
                            onFocus={() => {
                              setCurrentRow(rowIdx);
                              setEditing({ row: rowIdx, col: c.id });
                            }}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateCell(rowIdx, c.id, raw === '' ? '' : parseFloat(raw));
                            }}
                          />
                        </td>
                      );
                    }
                    if (c.kind === 'text') {
                      const extraInputT =
                        typeof c.inputClassName === 'function' ? c.inputClassName(row) : c.inputClassName;
                      return (
                        <td key={c.id} className={cx('min-w-0 px-2 py-2 align-middle', c.widthClass)} onClick={(e) => e.stopPropagation()}>
                          <Input
                            ref={(el) => setCellRef(c.id, rowIdx, el)}
                            className={cx(
                              'h-8 min-w-0 text-xs',
                              editHere && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background',
                              extraInputT,
                            )}
                            value={String(val ?? '')}
                            onFocus={() => {
                              setCurrentRow(rowIdx);
                              setEditing({ row: rowIdx, col: c.id });
                            }}
                            onChange={(e) => updateCell(rowIdx, c.id, e.target.value)}
                          />
                        </td>
                      );
                    }
                    if (c.kind === 'select') {
                      return (
                        <td key={c.id} className={cx('px-2 py-2 align-middle', c.widthClass)} onClick={(e) => e.stopPropagation()}>
                          <select
                            ref={(el) => setCellRef(c.id, rowIdx, el)}
                            className={cx(
                              'border-input bg-background h-8 w-full rounded-md border px-1 text-xs',
                              editHere && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background',
                            )}
                            value={String(val ?? '')}
                            onFocus={() => {
                              setCurrentRow(rowIdx);
                              setEditing({ row: rowIdx, col: c.id });
                            }}
                            onChange={(e) => updateCell(rowIdx, c.id, e.target.value)}
                          >
                            {(c.selectOptions ?? []).map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    }
                    if (c.kind === 'checkbox') {
                      const checked = Boolean(val);
                      return (
                        <td key={c.id} className={cx('px-2 py-2 align-middle', c.widthClass, alignCls(c.align))} onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={(el) => setCellRef(c.id, rowIdx, el as unknown as HTMLInputElement)}
                            type="checkbox"
                            className="nx-master-row-checkbox mx-auto block"
                            checked={checked}
                            onChange={(e) => updateCell(rowIdx, c.id, e.target.checked)}
                            onFocus={() => {
                              setCurrentRow(rowIdx);
                              setEditing({ row: rowIdx, col: c.id });
                            }}
                          />
                        </td>
                      );
                    }
                    if (c.kind === 'actions') {
                      const delDisabled = disableRowDelete?.(row) ?? false;
                      return (
                        <td key={c.id} className="px-1 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={delDisabled}
                            className="size-8 text-muted-foreground hover:text-destructive disabled:opacity-40"
                            aria-label="刪除此列"
                            onClick={() => {
                              if (delDisabled) return;
                              setCurrentRow(rowIdx);
                              setDeleteOpen(true);
                            }}
                          >
                            ×
                          </Button>
                        </td>
                      );
                    }
                    return null;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyHint}</p> : null}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>刪除此列？</DialogTitle>
            <DialogDescription>將自明細移除（DEMO）。</DialogDescription>
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
