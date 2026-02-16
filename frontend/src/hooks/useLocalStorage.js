import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        const { value } = await Preferences.get({ key });
        const parsedValue = value ? JSON.parse(value) : initialValue;
        setStoredValue(parsedValue);
      } catch (error) {
        console.error('Error loading from preferences:', error);
        setStoredValue(initialValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredValue();
  }, [key, initialValue]);

  const setValue = async (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await Preferences.set({
        key,
        value: JSON.stringify(valueToStore),
      });
    } catch (error) {
      console.error('Error saving to preferences:', error);
    }
  };

  return [storedValue, setValue, isLoading];
};