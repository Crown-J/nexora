export function rfqStatusLabel(s: string): string {
  const m: Record<string, string> = {
    D: '草稿',
    S: '已發出',
    R: '已回覆',
    C: '已關閉',
    V: '作廢',
  };
  return m[s] ?? s;
}

export function poStatusLabel(s: string): string {
  const m: Record<string, string> = {
    D: '草稿',
    S: '已送出',
    C: '已關閉',
    V: '作廢',
  };
  return m[s] ?? s;
}

export function rrStatusLabel(s: string): string {
  const m: Record<string, string> = {
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
