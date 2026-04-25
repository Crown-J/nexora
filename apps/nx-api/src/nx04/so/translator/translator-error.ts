// apps/nx-api/src/nx04/so/translator/translator-error.ts
// D4 翻譯器自定 Exception，跟 NestJS HttpException 解耦。
// 三層階層（D4-impl §2 取捨 4）：InvalidInput / Busy / SystemError
// 統一由 TranslatorErrorFilter 轉成 HTTP response（不暴露 Postgres errno）

export type TranslatorErrorCode =
  // 業務輸入錯誤（HTTP 400）
  | 'TRANSFER_SOURCE_REF_NOT_FOUND'
  | 'TRANSFER_SOURCE_REF_TYPE_MISMATCH'
  | 'PART_NOT_IN_TENANT'
  | 'WAREHOUSE_NOT_IN_TENANT'
  | 'CUSTOMER_NOT_C_PARTNER'
  | 'EMPTY_LINE_ITEMS'
  // 並發失敗（HTTP 503）
  | 'TRANSLATOR_BUSY'
  // 系統錯誤（HTTP 500）
  | 'TRANSLATOR_SYSTEM_ERROR';

export class TranslatorBaseError extends Error {
  public readonly code: TranslatorErrorCode;
  public readonly userMessage: string;
  public readonly httpStatus: number;
  public readonly causeError?: unknown;

  constructor(args: {
    code: TranslatorErrorCode;
    userMessage: string;
    httpStatus: number;
    cause?: unknown;
  }) {
    super(args.userMessage);
    this.name = 'TranslatorBaseError';
    this.code = args.code;
    this.userMessage = args.userMessage;
    this.httpStatus = args.httpStatus;
    this.causeError = args.cause;
  }
}

export class TranslatorInvalidInputError extends TranslatorBaseError {
  constructor(code: TranslatorErrorCode, userMessage: string, cause?: unknown) {
    super({ code, userMessage, httpStatus: 400, cause });
    this.name = 'TranslatorInvalidInputError';
  }
}

export class TranslatorBusyError extends TranslatorBaseError {
  constructor(cause?: unknown) {
    super({
      code: 'TRANSLATOR_BUSY',
      userMessage: '系統忙碌，請稍後再試',
      httpStatus: 503,
      cause,
    });
    this.name = 'TranslatorBusyError';
  }
}

export class TranslatorSystemError extends TranslatorBaseError {
  constructor(cause?: unknown) {
    super({
      code: 'TRANSLATOR_SYSTEM_ERROR',
      userMessage: '系統錯誤，請聯絡管理員',
      httpStatus: 500,
      cause,
    });
    this.name = 'TranslatorSystemError';
  }
}
