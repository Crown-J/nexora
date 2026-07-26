// apps/nx-ui/src/app/work/page.tsx
// 新殼首頁（新版面封存軌 2026-07-26：簡約起步、之後再長內容）

export default function WorkHomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-bold tracking-widest">NEXORA</h1>
      <p className="text-sm text-muted-foreground">
        左側選單是情境入口——每一個日常動作一個入口、陸續掛上。
      </p>
      <p className="text-xs text-muted-foreground/70">
        鍵盤 F2 可隨時叫出即時工作檯
      </p>
    </div>
  );
}
