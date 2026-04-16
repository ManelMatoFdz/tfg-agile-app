import { useTranslation } from 'react-i18next';

const LANGS = ['es', 'en', 'gl'] as const;

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.split('-')[0] ?? 'es';

  return (
    <div className="flex items-center gap-1">
      {LANGS.map((lang) => (
        <button
          key={lang}
          onClick={() => i18n.changeLanguage(lang)}
          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
            current === lang
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title={t(`lang.${lang}`)}
        >
          {compact ? lang.toUpperCase() : t(`lang.${lang}`)}
        </button>
      ))}
    </div>
  );
}