/**
 * File: apps/nx-ui/src/shared/lib/jwt.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-JWT-001：JWT helpers（decode sub）
 *
 * Notes:
 * - 僅做簡單 decode，不驗簽
 */

export function decodeJwtSub(token: string | null): string | null {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(b64)
                .split('')
                .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
                .join(''),
        );
        const payload = JSON.parse(json) as { sub?: string };
        return typeof payload?.sub === 'string' ? payload.sub : null;
    } catch {
        return null;
    }
}