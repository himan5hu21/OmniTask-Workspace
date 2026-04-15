"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import type {
  FieldError,
  FieldErrors,
  FieldPath,
  FieldValues,
  Resolver,
  UseFormSetError,
} from "react-hook-form";
import type * as z from "zod";
import type { ApiErrorResponse, AxiosApiError, ValidationError } from "@/types/api";

type FormProps = Omit<ComponentPropsWithoutRef<"form">, "children"> & {
  children: ReactNode;
  errors?: FieldErrors<FieldValues>;
  scrollToError?: boolean;
};

type FormFieldErrorProps<TFieldValues extends FieldValues> = {
  errors: FieldErrors<TFieldValues>;
  name: FieldPath<TFieldValues>;
  mode?: "inline" | "toast" | "none";
  className?: string;
  toastTitle?: string;
};

type FormFieldErrorMode = "inline" | "toast" | "none";

type HandleApiFormErrorOptions<TFieldValues extends FieldValues> = {
  error: unknown;
  setError: UseFormSetError<TFieldValues>;
  fieldModes?: Partial<Record<FieldPath<TFieldValues>, FormFieldErrorMode>>;
  fieldMessages?: Partial<Record<FieldPath<TFieldValues>, Partial<Record<string, string>>>>;
  fallbackMessage?: string;
};

/**
 * Global zodResolver utility for zod v4 compatibility.
 */
export function createZodResolver<T extends FieldValues>(schema: z.ZodType): Resolver<T> {
  return zodResolver(schema as unknown as Parameters<typeof zodResolver>[0]) as Resolver<T>;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  const parsed = parseApiError(error);
  return parsed.message || fallback;
}

export function handleApiFormError<TFieldValues extends FieldValues>({
  error,
  setError,
  fieldModes,
  fieldMessages,
  fallbackMessage = "Something went wrong. Please try again.",
}: HandleApiFormErrorOptions<TFieldValues>): void {
  const parsed = parseApiError(error);
  const fieldErrors = Object.entries(parsed.fieldErrors);

  for (const [field, rawMessage] of fieldErrors) {
    const fieldPath = field as FieldPath<TFieldValues>;
    const mode = fieldModes?.[fieldPath] ?? "inline";
    const message = resolveApiFieldMessage(fieldPath, rawMessage, fieldMessages);

    if (mode === "none") {
      continue;
    }

    setError(fieldPath, {
      type: "server",
      message,
    });
  }

  if (!fieldErrors.length || parsed.message !== "Validation failed") {
    toast.error(parsed.message || fallbackMessage);
  }
}

function getFirstErrorFieldName(
  errors: FieldErrors<FieldValues>,
  prefix = ""
): string | null {
  for (const [key, value] of Object.entries(errors)) {
    if (!value) {
      continue;
    }

    const fieldName = prefix ? `${prefix}.${key}` : key;

    if (isFieldError(value)) {
      return fieldName;
    }

    if (typeof value === "object") {
      const nestedFieldName = getFirstErrorFieldName(
        value as FieldErrors<FieldValues>,
        fieldName
      );

      if (nestedFieldName) {
        return nestedFieldName;
      }
    }
  }

  return null;
}

function getNestedError<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
  name: FieldPath<TFieldValues>
): FieldError | null {
  const segments = String(name).split(".");
  let current: unknown = errors;

  for (const segment of segments) {
    if (current === null || typeof current !== "object") {
      return null;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return isFieldError(current) ? current : null;
}

function isFieldError(value: unknown): value is FieldError {
  return value !== null && typeof value === "object" && "message" in value;
}

function parseApiError(error: unknown): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  const axiosError = error as AxiosApiError | AxiosError<ApiErrorResponse>;
  const data = axiosError.response?.data;

  return {
    message: data?.message || axiosError.message || "Something went wrong. Please try again.",
    fieldErrors: normalizeApiFieldErrors(data?.errors),
  };
}

function normalizeApiFieldErrors(
  errors: ApiErrorResponse["errors"] | undefined
): Record<string, string> {
  if (!errors) {
    return {};
  }

  if (Array.isArray(errors)) {
    return errors.reduce<Record<string, string>>((acc, error) => {
      acc[error.field] = error.message || error.code;
      return acc;
    }, {});
  }

  return errors;
}

function resolveApiFieldMessage<TFieldValues extends FieldValues>(
  field: FieldPath<TFieldValues>,
  rawMessage: string,
  fieldMessages?: Partial<Record<FieldPath<TFieldValues>, Partial<Record<string, string>>>>
): string {
  const customMessage = fieldMessages?.[field]?.[rawMessage];

  if (customMessage) {
    return customMessage;
  }

  return defaultApiFieldMessage(rawMessage);
}

function defaultApiFieldMessage(message: string): string {
  const mappedMessages: Partial<Record<ValidationError["code"], string>> = {
    INVALID: "Invalid value.",
    UNIQUE: "This value already exists.",
    REQUIRED: "This field is required.",
    MIN_LENGTH: "Value is too short.",
    MAX_LENGTH: "Value is too long.",
    EMAIL: "Please enter a valid email address.",
    CUSTOM: "Invalid value.",
  };

  return mappedMessages[message as ValidationError["code"]] || message;
}

export function Form({
  children,
  errors,
  onSubmit,
  scrollToError = false,
  ...props
}: FormProps) {
  const handleSubmit: ComponentPropsWithoutRef<"form">["onSubmit"] = (event) => {
    onSubmit?.(event);

    if (!scrollToError || !errors || event.defaultPrevented) {
      return;
    }

    window.requestAnimationFrame(() => {
      const firstErrorField = getFirstErrorFieldName(errors);

      if (!firstErrorField) {
        return;
      }

      const escapedName =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape(firstErrorField)
          : firstErrorField;
      const field = document.querySelector<HTMLElement>(`[name="${escapedName}"]`);

      if (!field) {
        return;
      }

      field.scrollIntoView({ behavior: "smooth", block: "center" });
      field.focus({ preventScroll: true });
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
}

export function FormFieldError<TFieldValues extends FieldValues>({
  errors,
  name,
  mode = "inline",
  className = "mt-1 text-xs font-medium text-red-500",
  toastTitle = "Validation error",
}: FormFieldErrorProps<TFieldValues>) {
  const error = getNestedError(errors, name);
  const message = typeof error?.message === "string" ? error.message : null;
  const toastId = useMemo(() => `field-error:${String(name)}`, [name]);
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== "toast") {
      toast.dismiss(toastId);
      lastMessageRef.current = null;
      return;
    }

    if (!message) {
      toast.dismiss(toastId);
      lastMessageRef.current = null;
      return;
    }

    if (lastMessageRef.current === message) {
      return;
    }

    lastMessageRef.current = message;
    toast.error(message, {
      id: toastId,
      description: toastTitle,
      action: {
        label: "Dismiss",
        onClick: () => toast.dismiss(toastId),
      },
    });
  }, [message, mode, name, toastId, toastTitle]);

  if (mode !== "inline" || !message) {
    return null;
  }

  return (
    <p role="alert" className={className}>
      {message}
    </p>
  );
}
