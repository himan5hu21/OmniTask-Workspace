import { useState } from "react";

/**
 * A hook that syncs external server state into local editable state
 * DURING the render phase, avoiding useEffect cascading renders.
 * It deeply clones the data so local mutations (like Drag & Drop)
 * do not corrupt the original data (e.g., React Query cache).
 */
export function useSyncedState<T>(serverValue: T) {
  // Keep track of the last server value to detect changes
  const [prevServerValue, setPrevServerValue] = useState<T>(serverValue);
  
  // Initialize local state with a deep copy of the server value
  const [localValue, setLocalValue] = useState<T>(() => 
    serverValue ? JSON.parse(JSON.stringify(serverValue)) : serverValue
  );

  // If the server value reference changes (e.g., fresh API fetch completes),
  // update the local state immediately during render.
  if (serverValue !== prevServerValue) {
    setPrevServerValue(serverValue);
    setLocalValue(serverValue ? JSON.parse(JSON.stringify(serverValue)) : serverValue);
  }

  // Return exactly like a standard useState hook
  return [localValue, setLocalValue] as const;
}
