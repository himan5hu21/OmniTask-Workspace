"use client";

import { useSyncExternalStore } from 'react';

export function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function useServerValue<T>(getValue: () => T, serverValue: T) {
  return useSyncExternalStore(
    () => () => {},
    getValue,
    () => serverValue
  );
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/**
 * A generic hook to subscribe to any browser event and sync it with React state.
 */
export function useEventListenerStore<T>(
  target: EventTarget | undefined | null,
  event: string,
  getSnapshot: () => T,
  serverSnapshot: T
) {
  return useSyncExternalStore(
    (callback) => {
      if (!target) return () => {};
      target.addEventListener(event, callback);
      return () => target.removeEventListener(event, callback);
    },
    getSnapshot,
    () => serverSnapshot
  );
}

