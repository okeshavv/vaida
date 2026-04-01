import React from 'react';
import type { SupportedLanguage, LanguageOption } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', script: 'Latin' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', script: 'Devanagari' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', script: 'Tamil' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', script: 'Telugu' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', script: 'Bengali' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', script: 'Devanagari' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', script: 'Kannada' },
];

interface Props {
  compact?: boolean;
  onSelect?: (lang: SupportedLanguage) => void;
}

export default function LanguageSelector({ compact = false, onSelect }: Props) {
  const { language, setLanguage } = useApp();
  const { i18n } = useTranslation();

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    i18n.changeLanguage(code);
    onSelect?.(code);
  };

  if (compact) {
    return (
      <button
        onClick={() => {
          const idx = LANGUAGES.findIndex(l => l.code === language);
          const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
          handleSelect(next.code);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vaida-bg2 text-vaida-text-muted text-xs font-medium hover:bg-vaida-teal-light hover:text-vaida-teal transition-all"
      >
        <Globe size={14} />
        {LANGUAGES.find(l => l.code === language)?.nativeLabel}
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => handleSelect(lang.code)}
          className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
            language === lang.code
              ? 'border-vaida-teal bg-vaida-teal-light'
              : 'border-vaida-bg2 bg-white hover:border-vaida-teal-mid/30'
          }`}
        >
          <div className="font-semibold text-sm">{lang.nativeLabel}</div>
          <div className="text-xs text-vaida-text-muted">{lang.label}</div>
        </button>
      ))}
    </div>
  );
}

export { LANGUAGES };
