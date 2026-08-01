// apps/nx-ui/src/app/preview/layout.tsx
//
// 設計預覽區（v3.0.0 模板軌）
//
// 目的：不必登入、不碰任何 API，就能檢視與操作各種模板。
//   · 執行長要看設計不必先登入
//   · 改樣式時直接在這裡看，不必進系統翻頁
//   · 久了它就是活的設計系統文件——模板改了，這裡跟著就是最新的樣子
//
// ⛔ 這一區一律用假資料、⛔ 不呼叫任何 API、⛔ 不做登入守衛。
//    正式部署要關掉的話，在此 layout 加環境變數判斷即可（單點）。

import Link from 'next/link';

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    // ⚠️ relative z-10 + 不透明 bg-background：root layout 掛了全域 NxAppBackdrop（六角背景），
    //    不墊高就會蓋住內容——只有自帶 z-index 的元素（如 sticky 表頭）浮得上來。
    //    這是 V3Shell 的既有做法，這裡照抄。
    // ⚠️ h-dvh + overflow-hidden：高度要鎖住，內部表格才會自己捲；
    //    用 min-h-dvh 會被長清單撐開，整頁跟著變高。
    <div className="relative z-10 flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center gap-4 border-b border-border px-5 py-3">
        <Link href="/preview" className="text-lg">
          NEXORA 設計預覽
        </Link>
        <span className="text-[14px] text-muted-foreground">v3.0.0 模板 · 假資料 · 免登入</span>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
