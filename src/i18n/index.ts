import { useAppStore } from '../app/app-store';
import en, { type Translations } from './en';
import ru from './ru';
import uk from './uk';

const locales: Record<string, Translations> = { en, ru, uk };

export function detectLocale(): string {
  const lang = (typeof navigator !== 'undefined' ? navigator.language : '') || 'en';
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('uk')) return 'uk';
  return 'en';
}

export function useT(): Translations {
  const locale = useAppStore((state) => state.locale);
  return locales[locale] ?? en;
}

export function getLocaleString(locale: string): string {
  return locales[locale] ? locale : 'en';
}
