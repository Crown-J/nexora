// apps/nx-ui/src/features/inventory/workstation/shared/BarcodeScanner.tsx
// v1.2 階段 G：條碼掃描共用元件（html5-qrcode、Alex Q1=html5-qrcode 拍板）
//
// 範式：
// - 全螢幕 modal、顯示鏡頭預覽
// - 偵測到 code → onScan(text) 回調 + 自動關閉（單次模式）
// - 支援多種格式：CODE128 / EAN / QR / Code39 / UPC（html5-qrcode 預設）
// - 跨平台：iOS Safari / Chrome / Android（html5-qrcode 內建處理）
// - 用 dynamic import 避免 SSR（html5-qrcode 需 window）+ 縮 initial bundle

'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useModalLayer } from '@design/primitives/modal-stack';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  /** 掃到條碼後回調（傳遞 decoded text）。回 true 表示繼續掃、否則自動關閉。 */
  onScan: (decodedText: string) => boolean | void | Promise<boolean | void>;
  /** 標題（譬如「掃描料號 / 條碼」） */
  title?: string;
}

export function BarcodeScanner({ open, onClose, onScan, title = '掃描條碼' }: BarcodeScannerProps) {
  const elementId = 'barcode-scanner-region';
  const scannerRef = useRef<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onClose);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let activeScanner: { stop: () => Promise<void>; clear: () => void } | null = null;

    const start = async () => {
      setStarting(true);
      setError(null);
      try {
        // dynamic import：避免 SSR + 縮 initial bundle
        const mod = await import('html5-qrcode');
        if (cancelled) return;

        const { Html5Qrcode } = mod;
        const region = document.getElementById(elementId);
        if (!region) {
          setError('掃描區域未就緒');
          setStarting(false);
          return;
        }

        const instance = new Html5Qrcode(elementId, { verbose: false });
        activeScanner = instance as unknown as { stop: () => Promise<void>; clear: () => void };
        scannerRef.current = instance;

        await instance.start(
          { facingMode: 'environment' }, // 後鏡頭優先
          {
            fps: 10,
            qrbox: { width: 250, height: 200 },
            aspectRatio: 1.333,
          },
          (decodedText: string) => {
            if (cancelled) return;
            void Promise.resolve(onScan(decodedText)).then((keepOpen) => {
              if (!keepOpen) {
                onClose();
              }
            });
          },
          () => {
            // ignore decode errors（很常見、別污染 UI）
          },
        );
        setStarting(false);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(`無法啟動相機：${msg}`);
        setStarting(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (activeScanner) {
        activeScanner
          .stop()
          .then(() => activeScanner?.clear())
          .catch(() => {
            // 已 stop / element 已移除、忽略
          });
      }
      scannerRef.current = null;
    };
  }, [open, onScan, onClose]);

  if (!open) return null;

  return (
    <div ref={layerRef} className="fixed inset-0 z-[60] flex flex-col bg-black">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉掃描"
          className="rounded-md p-1 text-white/70 hover:bg-white/10"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <div id={elementId} className="absolute inset-0" />
        {starting ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
            正在啟動相機…
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-x-4 top-4 rounded-md border border-[#E26060]/40 bg-[#E26060]/20 px-3 py-2 text-xs text-[#E26060]">
            {error}
          </div>
        ) : null}
      </div>

      <footer className="border-t border-white/10 px-4 py-3 text-center text-xs text-white/50">
        將條碼對準掃描框、自動辨識
      </footer>
    </div>
  );
}
