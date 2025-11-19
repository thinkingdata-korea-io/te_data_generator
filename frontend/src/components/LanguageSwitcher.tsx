'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage, Language } from '../contexts/LanguageContext';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'ko', label: '한국어', flag: 'KO' },
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'zh', label: '中文', flag: 'ZH' },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (langCode: Language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded font-mono text-sm text-[var(--text-primary)] hover:border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/5 transition-all terminal-glow"
        title="Change Language"
      >
        <span className="text-[var(--accent-cyan)]">◈</span>
        <span className="hidden sm:inline">{currentLang.flag}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg terminal-glow z-50">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 font-mono text-sm transition-all flex items-center gap-3 ${
                  language === lang.code
                    ? 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border-l-2 border-[var(--accent-cyan)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent-cyan)]'
                }`}
              >
                <span className="text-[var(--accent-cyan)] w-6">{lang.flag}</span>
                <span>{lang.label}</span>
                {language === lang.code && (
                  <span className="ml-auto text-[var(--accent-green)]">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
