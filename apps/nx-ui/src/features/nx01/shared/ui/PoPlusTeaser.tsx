'use client';

/**
 * LITE 方案下採購單區塊：不呼叫 API，靜態示意列表外觀。
 */
export function PoPlusTeaser() {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
      <p className="text-sm text-muted-foreground">
        升級至 PLUS 後可建立採購單、維護明細與交期，並從詢價轉入或轉成進貨單。
      </p>
      <div className="mt-4 overflow-hidden rounded-lg border border-dashed border-border/80 opacity-60">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">採購單號</th>
              <th className="px-3 py-2 font-medium">供應商</th>
              <th className="px-3 py-2 font-medium">狀態</th>
              <th className="px-3 py-2 font-medium text-right">總額</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border/60">
              <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                單據列表將於升級後載入
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
