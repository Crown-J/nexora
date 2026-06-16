// apps/nx-ui/src/features/sale/ui/hub/components/PlaceholderPage.tsx
/**
 * R7 子功能路由統一使用的 placeholder 內容頁。
 *
 * 所有尚未實作的工作站 / 單據管理 / 客戶維護子路由（共 13 頁），
 * page.tsx 只負責薄包裝呼叫此元件並傳入 title，其他完全共用。
 *
 * title 是 spec 基礎 placeholder 的擴充：使用者點進不同路徑應該能看到
 * 不同標題，避免誤以為「點錯了」，不破壞 spec 的核心樣式。
 */

'use client';

import { useRouter } from 'next/navigation';
import { Hammer } from 'lucide-react';

interface PlaceholderPageProps {
  /** 頁面標題；未提供時不顯示標題列 */
  title?: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center p-6 text-center">
      {title ? <div className="mb-6 text-xs tracking-wider text-white/40">{title}</div> : null}

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
        <Hammer className="h-7 w-7 text-white/40" aria-hidden />
      </div>

      <div className="mb-2 text-base text-white">即將推出</div>
      <div className="max-w-xs text-xs text-white/50">
        此功能將於後續版本推出，敬請期待。
      </div>

      <button
        type="button"
        onClick={() => router.back()}
        className="mt-6 text-xs text-white/60 transition-colors hover:text-white"
      >
        ← 返回
      </button>
    </div>
  );
}
