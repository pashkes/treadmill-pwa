import { useAppStore } from '../app/app-store';
import en, { type Translations } from './en';
import ru from './ru';
import uk from './uk';

const locales = { en, ru, uk } satisfies Record<string, Translations>;

export type SupportedLocale = keyof typeof locales;

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return locale in locales;
}

export function detectLocale(): SupportedLocale {
  const lang = (typeof navigator !== 'undefined' ? navigator.language : '') || 'en';
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('uk')) return 'uk';
  return 'en';
}

export function useT(): Translations {
  const locale = useAppStore((state) => state.locale);
  return locales[locale];
}

export function getLocaleString(locale: string): SupportedLocale {
  return isSupportedLocale(locale) ? locale : 'en';
}
