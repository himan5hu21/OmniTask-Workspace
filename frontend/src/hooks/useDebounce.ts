"use client";

import { useState, useEffect } from "react";

/**
 * useDebounce hook delays updating a value until a specified time has passed.
 * Useful for debouncing search inputs to avoid excessive API calls.
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
