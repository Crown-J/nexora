// apps/nx-api/src/shared/filters/nx02-error.filter.ts
// 把 B5 RFQ/QT API 自定 Exception 轉成 HTTP response 的 filter。
// 只負責 Nx02BaseError 子類；其他 Exception 走 NestJS 預設處理。

import { Catch, type ArgumentsHost, type ExceptionFilter, Logger } from '@nestjs/common';

import { Nx02BaseError } from '../../nx02/qt/qt-error';

@Catch(Nx02BaseError)
export class Nx02ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(Nx02ErrorFilter.name);

  catch(exception: Nx02BaseError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (n: number) => { json: (b: unknown) => void } }>();

    if (exception.httpStatus >= 500) {
      this.logger.error(
        `${exception.code} ${exception.userMessage}`,
        (exception.causeError as Error | undefined)?.stack ?? exception.stack,
      );
    } else if (exception.httpStatus === 503) {
      // Nx02BusyError 已在 service 層 WARN log（runWithRetry），這裡不再重複
    } else {
      // 400 / 409 — 業務操作問題，DEBUG 級即可
      this.logger.debug(`${exception.code} ${exception.userMessage}`);
    }

    response.status(exception.httpStatus).json({
      errorCode: exception.code,
      message: exception.userMessage,
    });
  }
}
