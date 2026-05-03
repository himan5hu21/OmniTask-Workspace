// src/lib/api-errors.ts

export interface ApiErrorResponse {
  response?: {
    status?: number;
    data?: {
      errors?: {
        name?: string;
        email?: string;
        [key: string]: string | undefined;
      };
    };
  };
}

export interface ApiErrorHandlers {
  uniqueName?: () => void;
  uniqueEmail?: () => void;
  accessDenied?: () => void;
  onOtherError?: (message: string) => void;
}

/**
 * Handles API errors in a consistent way across the application
 * @param error - The error object from the API call
 * @param handlers - Custom handlers for specific error types
 * @param defaultErrorMessage - Default message to show for generic errors
 */
export function handleApiError(
  error: unknown,
  handlers?: ApiErrorHandlers,
  defaultErrorMessage: string = "An error occurred. Please try again."
): void {
  // Check if it's an API error with response data
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as ApiErrorResponse;
    const errors = apiError?.response?.data?.errors;
    const response = apiError?.response;

    // Handle 403 Access Denied errors
    if (response?.status === 403 && handlers?.accessDenied) {
      handlers.accessDenied();
      return;
    }

    // Handle UNIQUE constraint errors
    if (errors?.name === "UNIQUE" && handlers?.uniqueName) {
      handlers.uniqueName();
      return;
    }

    if (errors?.email === "UNIQUE" && handlers?.uniqueEmail) {
      handlers.uniqueEmail();
      return;
    }
  }

  // Handle other errors
  const errorMessage = error instanceof Error ? error.message : defaultErrorMessage;
  if (handlers?.onOtherError) {
    handlers.onOtherError(errorMessage);
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
  if (error instanceof Error) {
    return error.message;
  }
  return defaultErrorMessage;
}

