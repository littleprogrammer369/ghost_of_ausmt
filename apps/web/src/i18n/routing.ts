import { defineRouting } from 'next-intl/routing';

export const locales = ['fa', 'en'] as const;

export type Locale = (typeof locales)[number];

/**
 * Persian is the default locale for this installation, so a visitor without a
 * locale prefix lands on the Persian public conference site.
 *
 * `localePrefix: 'always'` keeps the locale visible in the URL, which is what
 * the wireframes document for both `/fa/...` and `/en/...`.
 *
 * Locale detection is disabled: the locale comes from the URL only, so a
 * shared or cached response can never serve the wrong language.
 */
export const routing = defineRouting({
  locales,
  defaultLocale: 'fa',
  localePrefix: 'always',
  localeDetection: false,
});

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
