import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldError[];
}

const STATUS_BY_CODE: Record<ErrorCode, ContentfulStatusCode> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: ContentfulStatusCode;
  readonly fieldErrors: FieldError[] | undefined;

  constructor(code: ErrorCode, message: string, fieldErrors?: FieldError[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fieldErrors = fieldErrors;
  }

  toBody(): ErrorBody {
    return this.fieldErrors
      ? { code: this.code, message: this.message, fieldErrors: this.fieldErrors }
      : { code: this.code, message: this.message };
  }
}
