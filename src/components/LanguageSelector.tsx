import React, { useState, useEffect, useRef } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { 
  SUPPORTED_LANGUAGES, 
  getStoredLanguage, 
  setLanguage, 
  subscribeLanguageChange, 
  type SupportedLanguage, 
  type LanguageInfo,
  t 
} from '../services/i18n';
import confetti from 'canvas-confetti';

interface LanguageSelectorProps {
  variant?: 'header' | 'compact' | 'footer' | 'nav';
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'header',
  showLabel = true,
}) => {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getStoredLanguage());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeLanguageChange((newLang) => {
      setCurrentLang(newLang);
    });
    return () => unsubscribe();
  }, []);

  // Close on outside click
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

  const activeLangInfo: LanguageInfo = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = (langCode: SupportedLanguage) => {
    setLanguage(langCode);
    setIsOpen(false);
    confetti({ particleCount: 25, spread: 45, origin: { y: 0.1 } });
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* 🌐 BOTÃO MULTILÍNGUES SEMPRE VISÍVEL */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Menu Multilíngues / Alterar Idioma"
        aria-label="Menu Multilíngues"
        className={`flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-2xl border transition-all cursor-pointer shadow-xs select-none ${
          variant === 'header'
            ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:bg-slate-50 dark:hover:bg-slate-700/80'
            : variant === 'nav'
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
        } ${isOpen ? 'ring-2 ring-amber-500 border-amber-500' : ''}`}
      >
        <Globe className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-base leading-none select-none">{activeLangInfo.flag}</span>
        {showLabel && (
          <span className="text-xs font-bold tracking-tight">
            {activeLangInfo.code.toUpperCase()}
          </span>
        )}
        <span className="text-[11px] font-extrabold hidden md:inline text-slate-500 dark:text-slate-400">
          {t('btn.languages', 'Multilíngues')}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu com Idiomas */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-500 tracking-wider">
              <Globe className="w-3.5 h-3.5" />
              <span>Menu Multilíngues</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {SUPPORTED_LANGUAGES.length} Idiomas
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg leading-none shrink-0">{lang.flag}</span>
                    <div className="min-w-0 truncate">
                      <div className="truncate">{lang.name}</div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-slate-900/80 font-bold' : 'text-slate-400'}`}>
                        {lang.nativeName} • {lang.currencySymbol} ({lang.currency})
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 shrink-0 text-slate-950 font-black" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 px-2 text-[10px] text-center text-slate-400">
            Idioma selecionado salvo automaticamente
          </div>
        </div>
      )}
    </div>
  );
};
