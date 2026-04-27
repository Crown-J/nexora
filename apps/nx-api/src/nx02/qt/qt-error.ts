// apps/nx-api/src/nx02/qt/qt-error.ts
// B5 RFQ/QT API 自定 Exception，跟 NestJS HttpException 解耦。
// 四層階層（B5-impl §3.9）：InvalidInput / Conflict / Busy / SystemError
// 統一由 Nx02ErrorFilter 轉成 HTTP response（不暴露 Postgres errno）

export type Nx02ErrorCode =
  // 業務輸入錯誤（HTTP 400）
  | 'RFQ_NOT_FOUND'
  | 'QT_NOT_FOUND'
  | 'PARTNER_NOT_INQUIRY_TYPE'
  | 'REJECT_REASON_REQUIRED'
  | 'CANCEL_REASON_REQUIRED'
  // 業務狀態衝突（HTTP 409）
  | 'RFQ_ALREADY_CLOSED'
  | 'RFQ_NOT_TRANSFER_INQUIRY'
  | 'QT_ALREADY_AGREED'
  | 'QT_ALREADY_REJECTED'
  // 並發失敗（HTTP 503）
  | 'NX02_BUSY'
  // 系統錯誤（HTTP 500）
  | 'NX02_SYSTEM_ERROR';

export class Nx02BaseError extends Error {
  public readonly code: Nx02ErrorCode;
  public readonly userMessage: string;
  public readonly httpStatus: number;
  public readonly causeError?: unknown;

  constructor(args: {
    code: Nx02ErrorCode;
    userMessage: string;
    httpStatus: number;
    cause?: unknown;
  }) {
    super(args.userMessage);
    this.name = 'Nx02BaseError';
    this.code = args.code;
    this.userMessage = args.userMessage;
    this.httpStatus = args.httpStatus;
    this.causeError = args.cause;
  }
}

export class Nx02InvalidInputError extends Nx02BaseError {
  constructor(code: Nx02ErrorCode, userMessage: string, cause?: unknown) {
    super({ code, userMessage, httpStatus: 400, cause });
    this.name = 'Nx02InvalidInputError';
  }
}

export class Nx02ConflictError extends Nx02BaseError {
  constructor(code: Nx02ErrorCode, userMessage: string, cause?: unknown) {
    super({ code, userMessage, httpStatus: 409, cause });
    this.name = 'Nx02ConflictError';
  }
}

export class Nx02BusyError extends Nx02BaseError {
  constructor(cause?: unknown) {
    super({
      code: 'NX02_BUSY',
      userMessage: '系統忙碌，請稍後再試',
      httpStatus: 503,
      cause,
    });
    this.name = 'Nx02BusyError';
  }
}

export class Nx02SystemError extends Nx02BaseError {
  constructor(cause?: unknown) {
    super({
      code: 'NX02_SYSTEM_ERROR',
      userMessage: '系統錯誤，請聯絡管理員',
      httpStatus: 500,
      cause,
    });
    this.name = 'Nx02SystemError';
  }
}

// ---- 具名子類（給 service 層拋、給單元測試斷言）----

export class RfqNotFoundError extends Nx02InvalidInputError {
  constructor(rfqId: string) {
    super('RFQ_NOT_FOUND', `RFQ '${rfqId}' 不存在或不屬於目前租戶`);
    this.name = 'RfqNotFoundError';
  }
}

export class QtNotFoundError extends Nx02InvalidInputError {
  constructor(qtId: string) {
    super('QT_NOT_FOUND', `QT '${qtId}' 不存在或不屬於目前租戶`);
    this.name = 'QtNotFoundError';
  }
}

export class PartnerNotInquiryTypeError extends Nx02InvalidInputError {
  constructor(partnerId: string) {
    super(
      'PARTNER_NOT_INQUIRY_TYPE',
      `Partner '${partnerId}' 不存在或不是同行供應商（partner_type='S'）`,
    );
    this.name = 'PartnerNotInquiryTypeError';
  }
}

export class RejectReasonRequiredError extends Nx02InvalidInputError {
  constructor() {
    super('REJECT_REASON_REQUIRED', '拒絕 QT 時必須填寫 rejectReason');
    this.name = 'RejectReasonRequiredError';
  }
}

export class CancelReasonRequiredError extends Nx02InvalidInputError {
  constructor() {
    super('CANCEL_REASON_REQUIRED', '取消 RFQ 時必須填寫 cancelReason');
    this.name = 'CancelReasonRequiredError';
  }
}

export class RfqAlreadyClosedError extends Nx02ConflictError {
  constructor(rfqId: string, status: string) {
    super(
      'RFQ_ALREADY_CLOSED',
      `RFQ '${rfqId}' 狀態為 ${status}，無法再操作`,
    );
    this.name = 'RfqAlreadyClosedError';
  }
}

export class QtAlreadyAgreedError extends Nx02ConflictError {
  constructor(qtId: string) {
    super('QT_ALREADY_AGREED', `QT '${qtId}' 已被採用，無法再操作`);
    this.name = 'QtAlreadyAgreedError';
  }
}

export class QtAlreadyRejectedError extends Nx02ConflictError {
  constructor(qtId: string) {
    super('QT_ALREADY_REJECTED', `QT '${qtId}' 已被拒絕，無法再操作`);
    this.name = 'QtAlreadyRejectedError';
  }
}

export class RfqNotTransferInquiryError extends Nx02ConflictError {
  constructor(rfqId: string) {
    super(
      'RFQ_NOT_TRANSFER_INQUIRY',
      `RFQ '${rfqId}' 不是同行調貨詢價（rfqType≠'P'），不能透過 B5 採用 QT 建 TI`,
    );
    this.name = 'RfqNotTransferInquiryError';
  }
}
