'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ko } from '../i18n/locales/ko';
import { en } from '../i18n/locales/en';
import { zh } from '../i18n/locales/zh';

export type Language = 'ko' | 'en' | 'zh';
type Translations = typeof ko;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const translations: Record<Language, Translations> = {
  ko,
  en,
  zh,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 브라우저 언어 감지
function detectBrowserLanguage(): Language {
  if (typeof window === 'undefined') return 'ko';

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('zh')) return 'zh';
  return 'en'; // 기본값
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ko');
  const [isInitialized, setIsInitialized] = useState(false);

  // 초기화: localStorage 또는 브라우저 언어 감지
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language | null;
    if (savedLang && (savedLang === 'ko' || savedLang === 'en' || savedLang === 'zh')) {
      setLanguageState(savedLang);
    } else {
      const detected = detectBrowserLanguage();
      setLanguageState(detected);
      localStorage.setItem('language', detected);
    }
    setIsInitialized(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  // 초기화 전에는 로딩 표시 (깜빡임 방지)
  if (!isInitialized) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
