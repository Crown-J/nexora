// apps/nx-api/src/shared/filters/translator-error.filter.ts
// 把 D4 翻譯器自定 Exception 轉成 HTTP response 的全局 filter。
// 只負責 TranslatorBaseError 子類；其他 Exception 走 NestJS 預設處理。

import { Catch, type ArgumentsHost, type ExceptionFilter, Logger } from '@nestjs/common';

import { TranslatorBaseError } from '../../nx04/so/translator/translator-error';

@Catch(TranslatorBaseError)
export class TranslatorErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(TranslatorErrorFilter.name);

  catch(exception: TranslatorBaseError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (n: number) => { json: (b: unknown) => void } }>();

    // ERROR log（含 cause stack 給排查）— 業務看到的訊息不暴露這層
    if (exception.httpStatus >= 500) {
      this.logger.error(
        `${exception.code} ${exception.userMessage}`,
        (exception.causeError as Error | undefined)?.stack ?? exception.stack,
      );
    } else if (exception.httpStatus === 503) {
      // TranslatorBusyError 已在 service 層 WARN log（runWithRetry），這裡不再重複
    } else {
      // 400 input error — 業務操作問題，DEBUG 級即可
      this.logger.debug(`${exception.code} ${exception.userMessage}`);
    }

    response.status(exception.httpStatus).json({
      errorCode: exception.code,
      message: exception.userMessage,
    });
  }
}
