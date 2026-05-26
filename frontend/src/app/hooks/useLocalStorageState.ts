import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

type InitialValue<T> = T | (() => T);

function resolveInitialValue<T>(initialValue: InitialValue<T>) {
  return typeof initialValue === 'function'
    ? (initialValue as () => T)()
    : initialValue;
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: InitialValue<T>
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return resolveInitialValue(initialValue);

    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : resolveInitialValue(initialValue);
    } catch {
      return resolveInitialValue(initialValue);
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors so private browsing/quota issues do not break the UI.
    }
  }, [key, value]);

  return [value, setValue];
}
