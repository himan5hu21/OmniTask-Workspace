// src/lib/api-errors.ts

import { ApiError, ApiErrorResponse, ValidationError } from "@/types/api";

export interface ApiErrorHandlers {
  uniqueName?: (message?: string) => void;
  uniqueEmail?: (message?: string) => void;
  accessDenied?: (message?: string) => void;
  onOtherError?: (message: string) => void;
}

/**
 * Handles API errors in a consistent way across the application
 * @param error - The error object from the API
 * @param handlers - Specific handlers for different types of errors
 * @param defaultErrorMessage - Default message to show for generic errors
 */
export function handleApiError(
  error: unknown,
  handlers?: ApiErrorHandlers,
  defaultErrorMessage: string = "An error occurred. Please try again."
): void {
  let backendMessage: string | undefined;
  let data: ApiError | ApiErrorResponse | undefined;
  let status: number | undefined;

  // Custom type to handle both formats safely
  type PotentialApiError = {
    response?: {
      data?: ApiError | ApiErrorResponse;
      status?: number;
    };
    data?: ApiError | ApiErrorResponse;
    status?: number;
  };

  // Check if it's an API error with response data
  if (error && typeof error === 'object') {
    const err = error as PotentialApiError;
    if (err.response?.data) {
      data = err.response.data;
      status = err.response.status;
    } else if (err.data) {
      data = err.data;
      status = err.status;
    }
  }
  
  if (data) {
    const errors = data.errors;
    backendMessage = data.message;

    // Handle 403 Access Denied errors
    if (status === 403 && handlers?.accessDenied) {
      handlers.accessDenied(backendMessage);
      return;
    }

    // Handle Validation/UNIQUE errors dynamically
    if (errors) {
      if (Array.isArray(errors)) {
        errors.forEach((err: ValidationError) => {
          const field = err.field?.toLowerCase().trim();
          const code = err.code?.toUpperCase().trim();
          const message = err.message || backendMessage;

          if (field === "name" && handlers?.uniqueName) {
            if (code === "UNIQUE" || message?.toLowerCase().includes("exists")) {
              handlers.uniqueName(message);
            }
          }
          if (field === "email" && handlers?.uniqueEmail) {
            if (code === "UNIQUE" || message?.toLowerCase().includes("exists")) {
              handlers.uniqueEmail(message);
            }
          }
        });
        return;
      } else {
        const errorObj = errors as Record<string, string>;
        const keys = Object.keys(errorObj);

        for (const key of keys) {
          const normalizedKey = key.toLowerCase().trim();
          const val = String(errorObj[key]).toUpperCase().trim();
          
          if (normalizedKey === "name" && handlers?.uniqueName) {
            if (val === "UNIQUE" || backendMessage?.toLowerCase().includes("exists")) {
              handlers.uniqueName(val === "UNIQUE" ? backendMessage : errorObj[key]);
              return;
            }
          }
          if (normalizedKey === "email" && handlers?.uniqueEmail) {
            if (val === "UNIQUE" || backendMessage?.toLowerCase().includes("exists")) {
              handlers.uniqueEmail(val === "UNIQUE" ? backendMessage : errorObj[key]);
              return;
            }
          }
        }
      }
    }
  }

  // Handle other errors
  const errorMessage = error instanceof Error ? error.message : defaultErrorMessage;
  if (handlers?.onOtherError) {
    handlers.onOtherError(backendMessage || errorMessage);
  }
}

/**
 * Helper function to get a user-friendly error message from an API error
 * @param error - The error object
 * @param defaultErrorMessage - Default message to return
 */
export function getApiErrorMessage(
  error: unknown,
  defaultErrorMessage: string = "An error occurred. Please try again."
): string {
  if (error && typeof error === 'object') {
    const err = error as { 
      response?: { data?: { message?: string } }; 
      data?: { message?: string } 
    };
    const data = err.response?.data || err.data;
    if (data?.message) return data.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  return defaultErrorMessage;
}
