// C:\nexora\apps\nx-api\src\auth\jwt-auth.guard.ts
// JwtAuthGuard：保護路由用（@UseGuards(JwtAuthGuard)）

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
