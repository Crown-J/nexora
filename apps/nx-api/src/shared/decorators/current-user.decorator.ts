// C:\nexora\apps\nx-api\src\auth\current-user.decorator.ts
// CurrentUser Decorator：從 req.user 取出 JWT payload

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
