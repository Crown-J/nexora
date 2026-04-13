/** Derive nx01_view.module_code from view_code (e.g. NX01_PART → nx01, SYS_DASHBOARD → sys). */
export function viewCodeToModuleCode(viewCode: string): string {
  const head = viewCode.split('_')[0]?.toUpperCase() ?? '';
  if (head === 'SYS') return 'sys';
  const m = /^NX(\d{2})$/.exec(head);
  if (m) return `nx${m[1]}`;
  return head.toLowerCase() || 'sys';
}
