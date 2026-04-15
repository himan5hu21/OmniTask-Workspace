// src/utils/AppError.ts
import { ApiError, HttpStatus } from '../types/api';

export class AppError extends Error {
  public statusCode: number;
  public errors?: Record<string, string>; // Validation errors

  constructor(message: string, statusCode: number = HttpStatus.BAD_REQUEST, errors?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    if (errors) {
      this.errors = errors;
    }
    Error.captureStackTrace(this, this.constructor);
  }

  // Convert to API response format
  toApiResponse(): ApiError {
    return {
      success: false,
      message: this.message,
      ...(this.errors && { errors: this.errors })
    };
  }
}

// Controller ma upyog:
// throw new AppError("Event not found", HttpStatus.NOT_FOUND);
// throw new AppError("Validation failed", HttpStatus.BAD_REQUEST, { email: "INVALID", password: "MIN_LENGTH" });