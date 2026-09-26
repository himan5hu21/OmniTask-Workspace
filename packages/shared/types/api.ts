// Shared API types for frontend and backend

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

export interface ApiSuccess<T = any> {
  success: true;
  message?: string;
  data: T;
}

export interface ValidationError {
  field: string;
  message: string;
  code: 'INVALID' | 'UNIQUE' | 'REQUIRED' | 'MIN_LENGTH' | 'MAX_LENGTH' | 'EMAIL' | 'CUSTOM';
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string> | ValidationError[];
}

// Common HTTP status codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
}

// Axios error interface for frontend
export interface AxiosApiError {
  response?: {
    status?: number;
    data?: ApiError | ApiErrorResponse;
  };
  message?: string;
}

// Fastify request/response types for backend
export interface ApiRequest<T = any> {
  body?: T;
  query?: Record<string, any>;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface ApiResponseHandler {
  success<T>(data: T, message?: string, statusCode?: number): ApiSuccess<T>;
  error(message: string, statusCode?: number, errors?: Record<string, string>): ApiError;
  validationError(errors: Record<string, string>): ApiError;
}

// Common error codes
export enum ErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
}
