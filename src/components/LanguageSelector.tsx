import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import type { SupportedLanguage } from '../i18n/index';

const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'en',    label: 'English',   flag: '🇺🇸' },
  { code: 'es',    label: 'Español',   flag: '🇪🇸' },
];

export const LanguageSelector = () => {
  const { i18n } = useTranslation('common');
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleChange = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
    localStorage.setItem('clinicos_language', code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
                   text-teal-100 hover:bg-teal-600 transition-colors"
      >
        <Globe size={18} className="shrink-0" />
        <span className="text-sm font-medium truncate">{current.flag} {current.label}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-800
                        rounded-xl shadow-xl border border-teal-500/20 overflow-hidden
                        min-w-[140px] z-50">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm
                         hover:bg-teal-500/20 text-teal-50 transition-colors
                         ${i18n.language === lang.code
                           ? 'bg-teal-500/10 font-bold'
                           : ''}`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {i18n.language === lang.code && (
                <span className="ml-auto text-teal-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
