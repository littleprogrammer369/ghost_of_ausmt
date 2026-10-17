import createMiddleware from 'next-intl/middleware';
import { routing } from '@/src/i18n/routing';

/**
 * next-intl middleware.
 *
 * Runs before every request and sets the request locale from the URL prefix
 * (`/fa` / `/en`) so the root layout can read it via `getLocale()` and emit the
 * correct `<html lang/dir>` for every route, including the bare `/` redirect
 * and the 404 page rendered outside the `[locale]` segment.
 *
 * Locale detection is disabled: the locale comes from the URL only, so a
 * shared or cached response can never serve the wrong language.
 */
export default createMiddleware(routing);

export const config = {
  // Skip the internal Next.js routes and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ttf|woff2?)$).*)'],
};