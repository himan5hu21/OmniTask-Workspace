import { useSyncExternalStore } from "react";

/**
 * Subscribes to window online/offline events.
 */
function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * Gets the current online status from the browser.
 */
function getSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Returns the default status for server-side rendering (SSR).
 */
function getServerSnapshot() {
  return true;
}

/**
 * Custom hook to track the browser's online/offline status using useSyncExternalStore.
 * This prevents hydration mismatches in Next.js.
 */
export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
