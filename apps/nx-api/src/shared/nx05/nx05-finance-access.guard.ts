import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';

/**
 * NX05 財務 API 存取：行動裝置封鎖；PLUS/PRO 在非公司 IP 需 OTP（暫 mock）。
 * TODO(NX05): 串接真實 OTP／MFA，取代 header `x-nx05-finance-otp: mock-ok`。
 */
@Injectable()
export class Nx05FinanceAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; ip?: string; user?: RequestUser }>();
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini|webos/i.test(ua)) {
      throw new ForbiddenException('NX05 finance APIs are not available on mobile clients.');
    }
    const user = req.user;
    const plan = user?.planCode;
    if (plan === 'PLUS' || plan === 'PRO') {
      const cidrs = process.env.NX05_COMPANY_IP_CIDRS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      if (cidrs.length) {
        const fwd = req.headers['x-forwarded-for'];
        const ip = (typeof fwd === 'string' ? fwd.split(',')[0]?.trim() : undefined) || req.ip || '';
        if (!this.ipInAnyCidr(ip, cidrs)) {
          const otp = req.headers['x-nx05-finance-otp'];
          if (otp !== 'mock-ok') {
            throw new ForbiddenException(
              'NX05: access from non-company IP requires OTP. TODO: integrate real OTP. Dev bypass: header x-nx05-finance-otp: mock-ok',
            );
          }
        }
      }
    }
    return true;
  }

  private ipInAnyCidr(ip: string, cidrs: string[]): boolean {
    for (const c of cidrs) {
      if (c.includes('/')) {
        if (this.ipv4InCidr(ip, c)) return true;
      } else if (ip === c || ip.startsWith(`${c}.`)) {
        return true;
      }
    }
    return false;
  }

  private ipv4InCidr(ip: string, cidr: string): boolean {
    const [base, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr || '32', 10);
    const ipNum = this.ipv4ToInt(ip);
    const baseNum = this.ipv4ToInt(base);
    if (ipNum === null || baseNum === null) return false;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipNum & mask) === (baseNum & mask);
  }

  private ipv4ToInt(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    const a = +parts[0]!;
    const b = +parts[1]!;
    const c = +parts[2]!;
    const d = +parts[3]!;
    if ([a, b, c, d].some((x) => !Number.isFinite(x) || !Number.isInteger(x) || x < 0 || x > 255)) return null;
    return (((a << 24) | (b << 16) | (c << 8) | d) >>> 0);
  }
}
