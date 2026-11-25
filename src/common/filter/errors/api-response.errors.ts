import type { ErrorCode } from './error-code.js';

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: {
    field: string;
    message: string;
  }[];
}

export interface ApiErrorResponse {
  statusCode: number;
  error: ApiError;
  requestId: string;
  timestamp: string;
  path: string;
}
