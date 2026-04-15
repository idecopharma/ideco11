// FIX: Import React to make types like React.Dispatch available.
import React, { useState, useCallback } from 'react';

// The hook's signature matches React's useState return type.
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Prevent server-side rendering issues.
    if (typeof window === 'undefined') {
        return initialValue;
    }
    
    let item: string | null = null;
    try {
        item = window.localStorage.getItem(key);
    } catch (e) {
        console.error(`Error reading localStorage key “${key}”:`, e);
        // If reading fails, proceed as if no item was found.
    }

    if (item) {
        try {
            // If an item exists, parse and return it.
            return JSON.parse(item) as T;
        } catch (error) {
            // If parsing fails (e.g., corrupted data), log the error and fall through to initialize.
            console.error(`Error parsing localStorage key “${key}” with value “${item}”:`, error);
        }
    }
    
    // If no item exists, or if reading/parsing failed, initialize storage with the initial value.
    try {
        window.localStorage.setItem(key, JSON.stringify(initialValue));
    } catch (e) {
        console.error(`Error setting initial localStorage key “${key}”:`, e);
    }
    return initialValue;
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (value) => {
      // Prevent server-side rendering issues.
      if (typeof window === 'undefined') {
        console.warn(`Tried to set localStorage key “${key}” even though no window was found`);
        return;
      }

      try {
        setStoredValue((prevStoredValue) => {
          const valueToStore = value instanceof Function ? value(prevStoredValue) : value;
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        });
      } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key]
  );

  return [storedValue, setValue];
}

export default useLocalStorage;