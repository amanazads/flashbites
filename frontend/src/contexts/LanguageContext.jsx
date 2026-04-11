import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'fb_language';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [isLanguageSelected, setIsLanguageSelected] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (savedLanguage === 'en' || savedLanguage === 'hi') {
      setLanguageState(savedLanguage);
      setIsLanguageSelected(true);
      setIsLanguageReady(true);
      return;
    }

    setLanguageState('en');
    setIsLanguageSelected(false);
    setIsLanguageReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage) => {
    if (nextLanguage !== 'en' && nextLanguage !== 'hi') return;

    setLanguageState(nextLanguage);
    setIsLanguageSelected(true);
    setIsLanguageModalOpen(false);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const openLanguageModal = useCallback(() => {
    setIsLanguageModalOpen(true);
  }, []);

  const closeLanguageModal = useCallback(() => {
    setIsLanguageModalOpen(false);
  }, []);

  const t = useCallback((key, fallback = '') => {
    const dictionary = translations[language] || {};
    return dictionary[key] || fallback || key;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isLanguageSelected,
      isLanguageReady,
      isLanguageModalOpen,
      openLanguageModal,
      closeLanguageModal,
    }),
    [
      language,
      setLanguage,
      t,
      isLanguageSelected,
      isLanguageReady,
      isLanguageModalOpen,
      openLanguageModal,
      closeLanguageModal,
    ]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
};
