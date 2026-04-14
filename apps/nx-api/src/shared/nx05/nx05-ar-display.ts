/** 列表／明細顯示用：逾期則標示 OVERDUE（DB 仍為 OPEN/PARTIAL） */
export function effectiveArStatus(dbStatus: string, dueDate: Date): string {
  if (dbStatus === 'OPEN' || dbStatus === 'PARTIAL') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dueDate);
    d.setHours(0, 0, 0, 0);
    if (d < today) return 'OVERDUE';
  }
  return dbStatus;
}

export function effectiveApStatus(dbStatus: string, dueDate: Date): string {
  return effectiveArStatus(dbStatus, dueDate);
}
