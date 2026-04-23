// apps/nx-ui/src/features/sale/ui/sop-workspace/components/SignaturePadModal.tsx
/**
 * 電子簽名板 Modal — 全螢幕黑底、canvas 簽名
 *
 * - 支援 touch + mouse（手機與桌面都能 demo）
 * - 防止滾動：fixed inset-0 + touch-none
 * - 清除 / 完成按鈕；未簽過時「完成」disabled
 * - Mock：不實際儲存簽名圖檔，只發 COMPLETE_SIGNATURE
 */

'use client';

import { useEffect, useRef, useState } from 'react';

import { cx } from '@/shared/lib/cx';

export type SignaturePadModalProps = {
  customerContact?: string;
  onComplete: () => void;
  onCancel: () => void;
};

export function SignaturePadModal({
  customerContact,
  onComplete,
  onCancel,
}: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 依元素尺寸設定內部解析度（含 devicePixelRatio）
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#E8A020';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let drawing = false;

    const getPos = (e: TouchEvent | MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      return { x: clientX - r.left, y: clientY - r.top };
    };

    const start = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      drawing = true;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      setHasSigned(true);
    };
    const move = (e: TouchEvent | MouseEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const end = () => {
      drawing = false;
    };

    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);

    return () => {
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
      canvas.removeEventListener('touchcancel', end);
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
    };
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="客戶簽名"
      className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4"
    >
      {/* 頂部列 */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-white/60 transition-colors hover:text-white/90"
        >
          取消
        </button>
        <div className="text-sm text-white/80">客戶簽名</div>
        <div className="w-10" />
      </div>

      <div className="mb-2 text-center text-xs text-white/50">
        {customerContact ? `請${customerContact}在下方簽名` : '請客戶在下方簽名'}
      </div>

      {/* 簽名區 */}
      <div className="flex-1 overflow-hidden rounded-lg border border-white/15 bg-white/5">
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-crosshair touch-none"
        />
      </div>

      {/* 操作按鈕 */}
      <div className="mt-4 flex items-center gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-white/20 text-sm text-white/80 transition-colors hover:border-white/40"
        >
          清除
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={!hasSigned}
          className={cx(
            'inline-flex h-11 flex-[2] items-center justify-center rounded-lg text-sm font-medium transition-colors',
            hasSigned
              ? 'bg-[#E8A020] text-black hover:bg-[#E8A020]/90'
              : 'cursor-not-allowed bg-white/10 text-white/40',
          )}
        >
          完成簽名
        </button>
      </div>
    </div>
  );
}
