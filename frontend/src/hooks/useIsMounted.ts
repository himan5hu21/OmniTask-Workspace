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

