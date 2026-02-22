// C:\nexora\apps\nx-api\src\auth\user.decorator.ts
// @User()：從 req.user 取出 JwtStrategy validate 回傳的 payload

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator((_, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});
