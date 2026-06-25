// apps/nx-ui/src/features/sale/ui/sop-workspace/components/ImageLightbox.tsx
/**
 * 簡易圖片 Lightbox — 點料號縮圖放大檢視。
 * - 全螢幕黑底 90% 遮罩
 * - 點背景或右上 X 關閉
 * - Esc 關閉
 * - 內部圖片 click 事件 stopPropagation 避免誤關
 */

'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { useModalLayer } from '@design/primitives/modal-stack';

export type ImageLightboxProps = {
  imageUrl: string | null;
  alt?: string;
  onClose: () => void;
};

export function ImageLightbox({ imageUrl, alt, onClose }: ImageLightboxProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onClose, !!imageUrl);
  useEffect(() => {
    if (!imageUrl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      ref={layerRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt ?? '圖片放大檢視'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="關閉"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt ?? ''}
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
