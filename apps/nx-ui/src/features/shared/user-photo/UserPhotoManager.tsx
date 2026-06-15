// apps/nx-ui/src/features/shared/user-photo/UserPhotoManager.tsx
// 02 第四批 軌 1 2026-06-07：使用者大頭貼管理元件（單張、拍照/選檔/刪除）
//
// 對齊範式：
//   - 同零件照片 PartPhotoManager 的 base64 上傳鏈
//   - 但「單張」：上傳新檔自動取代舊檔；無 sortNo、無「設主圖」概念
//   - 手機：input capture="user" → 直接開前鏡頭（自拍範式）
//   - 平板/電腦：input file → 選檔上傳
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '@data/api/client';
import {
  deleteUserPhoto,
  uploadUserPhoto,
  userPhotoRawPath,
} from '@data/endpoints/shared/user-photo/user-photo-api';

const btnPrimary =
  'rounded-md border border-[#22D88F]/40 bg-[#22D88F]/10 px-3 py-1.5 text-xs font-medium text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50';
const btnSecondary =
  'rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 py-1.5 text-xs font-medium text-[#888892] hover:text-[#E8E8EC] disabled:opacity-50';
const btnDanger =
  'rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-1.5 text-xs font-medium text-[#E26060] hover:bg-[#E26060]/20 disabled:opacity-50';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function UserPhotoManager({
  userId,
  initialHasPhoto,
}: {
  userId: string;
  initialHasPhoto?: boolean;
}) {
  const [hasPhoto, setHasPhoto] = useState<boolean>(Boolean(initialHasPhoto));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reloadPreview = useCallback(async () => {
    setErr(null);
    try {
      const res = await apiFetch(userPhotoRawPath(userId), { method: 'GET' });
      if (res.ok) {
        const blob = await res.blob();
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setHasPhoto(true);
      } else {
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setHasPhoto(false);
      }
    } catch (e) {
      setErr((e as Error)?.message ?? 'load failed');
    }
  }, [userId]);

  useEffect(() => {
    void reloadPreview();
    return () => {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [reloadPreview]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErr(null);
    setBusy(true);
    try {
      const file = files[0]; // 單張、即使選多檔也只取第一張
      const base64 = await fileToBase64(file);
      await uploadUserPhoto(userId, {
        base64Content: base64,
        originalFilename: file.name,
        mimeType: file.type || 'image/jpeg',
      });
      await reloadPreview();
    } catch (e) {
      setErr((e as Error)?.message ?? 'upload failed');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const remove = async () => {
    if (!hasPhoto) return;
    if (!confirm('刪除大頭貼？')) return;
    setErr(null);
    setBusy(true);
    try {
      await deleteUserPhoto(userId);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setHasPhoto(false);
    } catch (e) {
      setErr((e as Error)?.message ?? 'delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 p-3 text-xs text-[#E26060]">{err}</div>
      ) : null}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2A2A30] bg-[#0E0E12]">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="大頭貼" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] text-[#5A5A60]">尚無大頭貼</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={busy}
              onClick={() => cameraInputRef.current?.click()}
            >
              📷 拍照（手機/平板）
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              🖼 選檔上傳
            </button>
            {hasPhoto ? (
              <button type="button" className={btnDanger} disabled={busy} onClick={() => void remove()}>
                刪除
              </button>
            ) : null}
          </div>
          <p className="text-[11px] text-[#5A5A60]">
            支援 PNG / JPEG / GIF / WebP。上傳新檔會自動取代舊大頭貼。
          </p>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}

/** 小圓頭像（員工列表用）：固定 size、authed binary 載入；無大頭貼時顯示姓名首字 */
export function UserAvatarSmall({
  userId,
  hasPhoto,
  displayName,
  size = 28,
}: {
  userId: string;
  hasPhoto: boolean;
  displayName: string;
  size?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto) {
      setUrl(null);
      return;
    }
    let revoked = false;
    let blobUrl: string | null = null;
    void (async () => {
      try {
        const res = await apiFetch(userPhotoRawPath(userId), { method: 'GET' });
        if (!res.ok) return;
        const blob = await res.blob();
        if (revoked) return;
        blobUrl = URL.createObjectURL(blob);
        setUrl(blobUrl);
      } catch {
        // skip
      }
    })();
    return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [userId, hasPhoto]);

  const initials = displayName.slice(0, 1).toUpperCase() || '?';
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2A2A30] bg-[#0E0E12] text-[10px] font-semibold text-[#888892]"
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={displayName} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
