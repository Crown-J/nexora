// apps/nx-ui/src/features/nx01/partner/supplier-supply/SelectBrandModal.tsx
// 加入品牌 — 「先選品牌 → 全品項匯入」modal
//
// 範式：單選 modal（vs EntityPickerDialog 多選）
// 設計：parent conditional mount（{open && <Modal />}）、modal 內 state 每次
// mount 自然 reset、避免 set-state-in-effect lint warning。
//
// 鍵盤：↑↓ 走、Enter/Space 選、Esc 關
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Filter } from 'lucide-react';

import { cn } from '@design/utils/cn';

import { partsInBrand, type BrandMock } from './mock-data';

export type SelectBrandModalProps = {
  onClose: () => void;
  availableBrands: BrandMock[];
  onConfirm: (brand: BrandMock) => void;
};

export function SelectBrandModal({ onClose, availableBrands, onConfirm }: SelectBrandModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = useState(0);

  const handleSubmit = useCallback(() => {
    if (!selectedId) return;
    const b = availableBrands.find((x) => x.id === selectedId);
    if (b) onConfirm(b);
  }, [availableBrands, onConfirm, selectedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        const n = availableBrands.length;
        if (!n) return;
        setFocusedIdx((i) => (e.key === 'ArrowDown' ? Math.min(n - 1, i + 1) : Math.max(0, i - 1)));
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        e.stopPropagation();
        const it = availableBrands[focusedIdx];
        if (it) setSelectedId(it.id);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedId) handleSubmit();
        else {
          const it = availableBrands[focusedIdx];
          if (it) setSelectedId(it.id);
        }
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [availableBrands, focusedIdx, selectedId, handleSubmit, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-2xl border border-[#2A2A30] bg-[#131316] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[#2A2A30] px-5 py-3">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <Filter className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-[#F0F0F3]">加入品牌</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60]">
            Select Brand
          </span>
        </div>

        {/* Hint */}
        <div className="border-b border-[#2A2A30] px-5 py-2 text-xs text-[#888892]">
          選一個品牌 → 該品牌全品項自動匯入。加入後可在 accordion 內逐個剔除不供的品項。
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-auto">
          {availableBrands.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-[#5A5A60]">
              所有品牌都已對應、可在現有品牌組內加減品項
            </div>
          ) : (
            <ul className="divide-y divide-[#1A1A1F]">
              {availableBrands.map((b, index) => {
                const isSelected = selectedId === b.id;
                const isFocused = index === focusedIdx;
                const partsCount = partsInBrand(b.id).length;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(b.id)}
                      onMouseEnter={() => setFocusedIdx(index)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        isFocused && 'ring-1 ring-inset ring-[#E8A020]/60',
                        isSelected ? 'bg-[#E8A020]/12 hover:bg-[#E8A020]/16' : 'hover:bg-[#1A1A22]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                          isSelected
                            ? 'border-[#E8A020]/60 bg-[#E8A020]/20 text-[#E8A020]'
                            : 'border-[#3A3A42] bg-[#1A1A1F]',
                        )}
                      >
                        {isSelected ? <Check className="size-3" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={cn(
                            'truncate text-sm',
                            isSelected ? 'font-semibold text-[#E8A020]' : 'text-[#E8E8EB]',
                          )}
                        >
                          {b.name}
                        </span>
                        <span className="truncate text-[11px] text-[#5A5A60]">
                          將匯入 {partsCount} 個品項
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-[#2A2A30] bg-[#0A0A0C]/40 px-5 py-3">
          <span className="text-[10px] text-[#5A5A60]">
            ESC 取消 · 已選 <span className="font-mono text-[#E8A020]">{selectedId ? 1 : 0}</span> 個品牌
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-3 text-xs font-medium text-[#B8B8C0] transition-colors hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedId}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/15 px-3 text-xs font-medium text-[#E8A020] transition-colors',
                !selectedId ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#E8A020]/25',
              )}
            >
              匯入全品項
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
