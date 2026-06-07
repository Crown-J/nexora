// T1b 詢價對齊 2026-06-07：露 backend RfqStatus 全名 + 短碼雙吃
export function rfqStatusLabel(s: string): string {
  const m: Record<string, string> = {
    DRAFT: '草稿',
    SENT: '已發出',
    REPLIED: '已回覆',
    CLOSED: '已關閉',
    CANCELLED: '作廢',
    D: '草稿',
    S: '已發出',
    R: '已回覆',
    C: '已關閉',
    V: '作廢',
  };
  return m[s] ?? s;
}

// T1-fix 2026-06-07：露完整 9 階狀態（加 PENDING_APPROVAL 待核准、對齊三版本一致）
//   DRAFT 草稿 →〔送審〕→ PENDING_APPROVAL 待核准 →〔核准〕→ APPROVED 已核准
//                                                →〔退件〕→ DRAFT 草稿
//   APPROVED →〔寄出〕→ SUBMITTED 已寄廠商 →〔廠商確認〕→ CONFIRMED 廠商已確認
//   CONFIRMED → PARTIAL_RECEIVED 部分驗收 / RECEIVED 全部驗收 → CLOSED 結案
//   任何階段 → CANCELLED 作廢
// 短碼保留 fallback（PR 範式雙吃、避免歷史資料顯示 raw 字串）。
export function poStatusLabel(s: string): string {
  const m: Record<string, string> = {
    // 全名（backend 主用）
    DRAFT: '草稿',
    PENDING_APPROVAL: '待核准',
    APPROVED: '已核准',
    SUBMITTED: '已寄廠商',
    CONFIRMED: '廠商已確認',
    PARTIAL_RECEIVED: '部分驗收',
    RECEIVED: '全部驗收',
    CLOSED: '已結案',
    CANCELLED: '作廢',
    // 短碼（fallback）
    D: '草稿',
    A: '已核准',
    S: '已寄廠商',
    CF: '廠商已確認',
    PR: '部分驗收',
    R: '全部驗收',
    C: '已結案',
    V: '作廢',
  };
  return m[s] ?? s;
}

// T0/T1：RR 雙吃（PR 範式：PATCH /:id { status: 'POSTED' / 'CANCELLED' }）
export function rrStatusLabel(s: string): string {
  const m: Record<string, string> = {
    DRAFT: '草稿',
    INSPECTING: '驗收中',
    POSTED: '已過帳',
    REJECTED: '退件',
    CANCELLED: '作廢',
    D: '草稿',
    P: '已過帳',
    C: '已取消',
  };
  return m[s] ?? s;
}

export function prStatusLabel(s: string): string {
  const m: Record<string, string> = {
    D: '草稿',
    P: '已過帳',
    V: '作廢',
  };
  return m[s] ?? s;
}
