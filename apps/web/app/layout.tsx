import type { Metadata } from 'next';
import { getMessages, getLocale, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { routing } from '@/src/i18n/routing';
import { notFound } from 'next/navigation';

/**
 * Root layout.
 *
 * Owns the `<html>` and `<body>` tags (Next.js requires exactly one root
 * layout to do so). The locale is resolved from the request here so that
 * `lang` and `dir` always match the active locale for `/fa` and `/en`,
 * including for the 404 page rendered outside the `[locale]` segment.
 */
export const metadata: Metadata = {
  title: 'Academic Conference Platform',
  description: 'Bilingual public conference site.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The request locale is resolved from the URL by next-intl's routing.
  const locale = await getLocale();

  if (!routing.locales.includes(locale as never)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const dir = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}