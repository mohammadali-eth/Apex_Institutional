import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../messages/en.json';
import gu from '../messages/gu.json';
import hi from '../messages/hi.json';
import ar from '../messages/ar.json';
import ur from '../messages/ur.json';

export type Locale = 'en' | 'gu' | 'hi' | 'ar' | 'ur';

const messagesMap: Record<Locale, Record<string, any>> = {
  en,
  gu,
  hi,
  ar,
  ur,
};

export const languages: { code: Locale; name: string; nativeName: string; isRtl: boolean }[] = [
  { code: 'en', name: 'English', nativeName: 'English', isRtl: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', isRtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isRtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRtl: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', isRtl: true },
];

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isRtl: boolean;
  t: (path: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  isRtl: false,
  t: (path, fallback) => fallback || path,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('en');

  const activeLang = languages.find(l => l.code === locale) || languages[0];
  const isRtl = activeLang.isRtl;

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('qpms_locale', newLocale);
    } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('qpms_locale') as Locale;
      if (saved && messagesMap[saved]) {
        setLocaleState(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', locale);
    }
  }, [locale, isRtl]);

  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current: any = messagesMap[locale] || messagesMap.en;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        let enCurrent: any = messagesMap.en;
        for (const enKey of keys) {
          if (enCurrent && typeof enCurrent === 'object' && enKey in enCurrent) {
            enCurrent = enCurrent[enKey];
          } else {
            return fallback || path;
          }
        }
        return typeof enCurrent === 'string' ? enCurrent : (fallback || path);
      }
    }
    return typeof current === 'string' ? current : (fallback || path);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, isRtl, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
