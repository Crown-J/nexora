/**
 * @FUNCTION_CODE NX00-DOC-UI-001-F01
 * 單據公版：工具列 + Alt+1/2 列表／明細切換
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cx } from '@/shared/lib/cx';

export type DocViewMode = 'list' | 'detail';

export type DocLayoutProps = {
  title: string;
  docCode: string;
  listView: React.ReactNode;
  detailView: React.ReactNode;
  onNew: () => void;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint?: () => void;
  /** Esc 取消 */
  onCancel?: () => void;
  canSave: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** 受控視圖（選填） */
  view?: DocViewMode;
  onViewChange?: (v: DocViewMode) => void;
  defaultView?: DocViewMode;
  className?: string;
};

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

export function DocLayout({
  title,
  docCode,
  listView,
  detailView,
  onNew,
  onSave,
  onEdit,
  onDelete,
  onPrint,
  onCancel,
  canSave,
  canEdit,
  canDelete,
  view: controlledView,
  onViewChange,
  defaultView = 'list',
  className,
}: DocLayoutProps) {
  const [innerView, setInnerView] = useState<DocViewMode>(defaultView);
  const view = controlledView ?? innerView;
  const setView = useCallback(
    (v: DocViewMode) => {
      if (onViewChange) onViewChange(v);
      else setInnerView(v);
    },
    [onViewChange],
  );

  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (isEditableTarget(e.target)) {
        if (e.key === 'Escape' && onCancel) {
          e.preventDefault();
          onCancel();
        }
        return;
      }
      if (e.altKey && (e.key === '1' || e.key === 'Digit1')) {
        e.preventDefault();
        setView('list');
        return;
      }
      if (e.altKey && (e.key === '2' || e.key === 'Digit2')) {
        e.preventDefault();
        setView('detail');
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        onNew();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (canEdit) onEdit();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (canSave) onSave();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (canDelete) setDeleteOpen(true);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'p' && onPrint) {
        e.preventDefault();
        onPrint();
        return;
      }
      if (e.key === 'Escape' && onCancel) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNew, onSave, onEdit, onDelete, onPrint, onCancel, canSave, canEdit, canDelete, setView]);

  return (
    <div className={cx('flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden', className)}>
      <header className="shrink-0 space-y-0.5 px-0.5">
        <p className="text-xs tracking-[0.25em] text-muted-foreground">{docCode}</p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
      </header>

      <div className="flex shrink-0 gap-1 rounded-lg border border-border/50 bg-muted/20 p-1">
        <button
          type="button"
          onClick={() => setView('list')}
          className={cx(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            view === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          資料瀏覽（列表）
          <span className="ml-1 hidden font-mono text-[10px] opacity-70 sm:inline">Alt+1</span>
        </button>
        <button
          type="button"
          onClick={() => setView('detail')}
          className={cx(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            view === 'detail' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          詳細資料（明細）
          <span className="ml-1 hidden font-mono text-[10px] opacity-70 sm:inline">Alt+2</span>
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/40 pb-2">
        <Button type="button" size="sm" variant="secondary" className="h-8 gap-1" onClick={onNew}>
          新增 <kbd className="hidden font-mono text-[10px] opacity-70 sm:inline">Alt+A</kbd>
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" disabled={!canEdit} onClick={onEdit}>
          更正 <kbd className="hidden font-mono text-[10px] opacity-70 sm:inline">Alt+E</kbd>
        </Button>
        <Button type="button" size="sm" className="h-8 gap-1" disabled={!canSave} onClick={onSave}>
          存檔 <kbd className="hidden font-mono text-[10px] opacity-70 sm:inline">Alt+S</kbd>
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 gap-1" onClick={() => onCancel?.()}>
          取消 <kbd className="hidden font-mono text-[10px] opacity-70 sm:inline">Esc</kbd>
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" disabled={!canDelete} onClick={() => setDeleteOpen(true)}>
          刪除 <kbd className="hidden font-mono text-[10px] opacity-70 sm:inline">Alt+D</kbd>
        </Button>
        {onPrint ? (
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={onPrint}>
            列印 <kbd className="hidden font-mono text-[10px] opacity-70 sm:inline">Alt+P</kbd>
          </Button>
        ) : null}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{view === 'list' ? listView : detailView}</div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>確認刪除？</DialogTitle>
            <DialogDescription>此操作無法復原（DEMO）。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDeleteOpen(false);
                onDelete();
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
