// apps/nx-ui/src/features/shared/part-photo/PartPhotoManager.tsx
// 02 第三批 T4 2026-06-07：零件照片編輯介面（每顆 5 張、可設主圖、可刪、可拍照可選檔）
//
// 業務範式：
//   - 手機：input capture="environment" → 直接開後鏡頭拍
//   - 平板/電腦：input file → 選檔上傳
//   - 縮圖列表、第一張（sortNo=0）標「主圖」徽章
//   - 業務員可點任意照片設為主圖（其他 sortNo 自動往後讓）
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '@data/api/client';
import {
  deletePartPhoto,
  listPartPhotos,
  setPartPhotoSortNo,
  uploadPartPhoto,
  type PartPhotoRow,
} from '@data/endpoints/shared/part-photo/part-photo-api';

const MAX_PHOTOS = 5;

const btnPrimary =
  'rounded-md border border-[#22D88F]/40 bg-[#22D88F]/10 px-3 py-1.5 text-xs font-medium text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50';
const btnSecondary =
  'rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 py-1.5 text-xs font-medium text-[#888892] hover:text-[#E8E8EC] disabled:opacity-50';
const btnDanger =
  'rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-2 py-1 text-[10px] font-medium text-[#E26060] hover:bg-[#E26060]/20 disabled:opacity-50';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/png;base64,XXXX → 只取 XXXX
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function PartPhotoManager({ partId }: { partId: string }) {
  const [rows, setRows] = useState<PartPhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await listPartPhotos(partId);
      setRows(list);
      // 同步抓 binary 拼預覽（用 authed apiFetch、回 blob → object URL）
      const newPreviews = new Map<string, string>();
      await Promise.all(
        list.map(async (r) => {
          try {
            const res = await apiFetch(`/nx01/parts/${partId}/photos/${r.id}/raw`, { method: 'GET' });
            if (res.ok) {
              const blob = await res.blob();
              newPreviews.set(r.id, URL.createObjectURL(blob));
            }
          } catch {
            // skip
          }
        }),
      );
      setPreviews((prev) => {
        // revoke 舊 URL
        for (const url of prev.values()) URL.revokeObjectURL(url);
        return newPreviews;
      });
    } catch (e) {
      setErr((e as Error)?.message ?? 'load failed');
    } finally {
      setLoading(false);
    }
  }, [partId]);

  useEffect(() => {
    void reload();
    return () => {
      // unmount 時 revoke object URLs
      setPreviews((prev) => {
        for (const url of prev.values()) URL.revokeObjectURL(url);
        return new Map();
      });
    };
  }, [reload]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErr(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (rows.length >= MAX_PHOTOS) {
          setErr(`每顆零件最多 ${MAX_PHOTOS} 張、已達上限`);
          break;
        }
        const base64 = await fileToBase64(file);
        await uploadPartPhoto(partId, {
          base64Content: base64,
          originalFilename: file.name,
          mimeType: file.type || 'image/jpeg',
        });
      }
      await reload();
    } catch (e) {
      setErr((e as Error)?.message ?? 'upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const setAsPrimary = async (r: PartPhotoRow) => {
    if (r.sortNo === 0) return;
    setErr(null);
    try {
      await setPartPhotoSortNo(partId, r.id, 0);
      await reload();
    } catch (e) {
      setErr((e as Error)?.message ?? 'set primary failed');
    }
  };

  const remove = async (r: PartPhotoRow) => {
    if (!confirm('刪除這張照片？')) return;
    setErr(null);
    try {
      await deletePartPhoto(partId, r.id);
      await reload();
    } catch (e) {
      setErr((e as Error)?.message ?? 'delete failed');
    }
  };

  if (loading) return <div className="p-4 text-xs text-[#888892]">載入照片中…</div>;

  const atLimit = rows.length >= MAX_PHOTOS;

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 p-3 text-xs text-[#E26060]">{err}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
          照片（{rows.length}/{MAX_PHOTOS}）
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            className={btnPrimary}
            disabled={atLimit || uploading}
            onClick={() => cameraInputRef.current?.click()}
          >
            📷 拍照（手機/平板）
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={atLimit || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            🖼 選檔上傳
          </button>
        </div>
        {/* 隱藏的 file input：拍照 capture=environment 在手機/平板開後鏡頭、桌面 fallback file dialog */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {atLimit ? (
        <div className="rounded-md border border-[#E8A020]/40 bg-[#E8A020]/10 p-2 text-[11px] text-[#E8A020]">
          已達上限 {MAX_PHOTOS} 張、請先刪除既有照片才能再上傳
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#2A2A30] p-8 text-center text-xs text-[#5A5A60]">
          尚未上傳照片、點上方按鈕拍照或選檔
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((r) => (
            <div
              key={r.id}
              className={`group relative overflow-hidden rounded-md border ${
                r.sortNo === 0 ? 'border-[#22D88F]/40' : 'border-[#2A2A30]'
              } bg-[#0A0A0C]`}
            >
              <div className="aspect-square w-full bg-[#0E0E12]">
                {previews.get(r.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previews.get(r.id)}
                    alt={r.origFilename ?? 'photo'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-[#5A5A60]">
                    載入中…
                  </div>
                )}
              </div>
              {r.sortNo === 0 ? (
                <span className="absolute left-2 top-2 rounded-full border border-[#22D88F]/40 bg-[#22D88F]/20 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#22D88F]">
                  主圖
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                {r.sortNo !== 0 ? (
                  <button type="button" className="flex-1 text-[10px] text-[#22D88F] hover:underline" onClick={() => void setAsPrimary(r)}>
                    設主圖
                  </button>
                ) : null}
                <button type="button" className={btnDanger} onClick={() => void remove(r)}>
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
