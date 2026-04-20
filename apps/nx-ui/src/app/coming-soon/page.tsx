/**
 * @FUNCTION_CODE NX00-UI-COMING-001-F01
 * 各中心 Hub 卡片暫導向之占位頁（TASK-0420-D）
 */

export default function ComingSoonPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-xs tracking-[0.35em] text-muted-foreground">NEXORA GRID</p>
      <h1 className="text-xl font-semibold text-foreground">即將開放</h1>
      <p className="text-sm text-muted-foreground">此功能尚在規劃或建置中，DEMO 主線完成後會接上實際頁面。</p>
    </div>
  );
}
