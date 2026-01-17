import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

interface Language {
  code: string;
  label: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'zh-CN', label: '简体中文', flag: '简' },
  { code: 'zh-TW', label: '繁體中文', flag: '繁' },
  { code: 'en', label: 'English', flag: 'EN' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-xl text-slate-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-viewport-light/60 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
        title={currentLanguage.label}
      >
        <Globe size={20} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-40 bg-white dark:bg-charcoal rounded-xl shadow-panel dark:shadow-none border border-slate-200 dark:border-steel overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors
                  ${
                    lang.code === i18n.language
                      ? 'bg-azure-50 dark:bg-tech-orange-500/20 text-azure-700 dark:text-tech-orange-400'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-viewport-light'
                  }
                `}
              >
                <span className="text-xs font-bold w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-viewport-light rounded text-slate-600 dark:text-gray-300">
                  {lang.flag}
                </span>
                <span className="flex-1">{lang.label}</span>
                {lang.code === i18n.language && (
                  <Check size={16} className="text-azure dark:text-tech-orange" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
