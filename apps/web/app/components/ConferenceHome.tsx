import { Mail, Phone, Rss, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/src/i18n/navigation';
import { conferences } from '@/content/conferences';
import { Button, Container } from '@acp/ui';
import { LanguageSwitcher } from './LanguageSwitcher';

export default function ConferenceHome({ locale }: { locale: 'fa' | 'en' }) {
  const conference = conferences[0];
  const t = useTranslations();

  // Helper to get localized string with fallback
  const loc = (obj: Record<'fa' | 'en', string> | undefined): string => {
    if (!obj) return '';
    return obj[locale] ?? obj.en ?? obj.fa ?? '';
  };

  // Simple object shape for conference identity sections
  const identity = {
    title: loc(conference.identity.title),
    edition: loc(conference.identity.edition),
    intro: loc(conference.identity.intro),
    venue: loc(conference.identity.venue),
    phone: conference.identity.secretariatPhone,
    email: conference.identity.secretariatEmail,
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-line">
        <Container width="wide" className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-6 text-sm">
            <span className="flex items-center space-x-2">
              <span className="sr-only">{t('topBar.phone')}</span>
              <span>{identity.phone}</span>
            </span>
            <span className="flex items-center space-x-2">
              <span className="sr-only">{t('topBar.email')}</span>
              <span>{identity.email}</span>
            </span>
            <LanguageSwitcher
              locale={locale}
              label={t('layout.languageSwitch')}
              switchLabel={t('layout.languageSwitchLabel')}
            />
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <a
              href="#"
              className="text-muted hover:text-ink"
              aria-label={t('topBar.socialTitle')}
            >
              <Mail size={18} aria-hidden="true" />
            </a>
            <a
              href="#"
              className="text-muted hover:text-ink"
              aria-label={t('topBar.socialTitle')}
            >
              <Phone size={18} aria-hidden="true" />
            </a>
            <a
              href="#"
              className="text-muted hover:text-ink"
              aria-label={t('topBar.socialTitle')}
            >
              <Send size={18} aria-hidden="true" />
            </a>
            <a
              href="#"
              className="text-muted hover:text-ink"
              aria-label={t('topBar.socialTitle')}
            >
              <Rss size={18} aria-hidden="true" />
            </a>
          </div>
        </Container>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Container width="wide" className="pt-8 pb-12">
          {/* Logo, Menu, Login/Signup */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:space-x-6 mb-12">
            <div className="flex-shrink-0 mb-4 sm:mb-0">
              <h2 className="text-xl font-bold text-ink">
                {identity.title}
              </h2>
              <p className="text-sm text-muted">
                {identity.edition}
              </p>
            </div>
            <nav className="flex space-x-4 sm:space-x-6">
              <Link href="/" className="text-muted hover:text-ink rounded-md px-3 py-2">
                {t('nav.home')}
              </Link>
              <Link href="/dates" className="text-muted hover:text-ink rounded-md px-3 py-2">
                {t('nav.dates')}
              </Link>
              <Link href="/topics" className="text-muted hover:text-ink rounded-md px-3 py-2">
                {t('nav.topics')}
              </Link>
              <Link href="/news" className="text-muted hover:text-ink rounded-md px-3 py-2">
                {t('nav.news')}
              </Link>
              <Link href="/accepted-papers" className="text-muted hover:text-ink rounded-md px-3 py-2">
                {t('nav.acceptedPapers')}
              </Link>
              <Link href="/committee" className="text-muted hover:text-ink rounded-md px-3 py-2">
                {t('nav.committee')}
              </Link>
              <Link href="/faq" className="text-muted hover:text-ink rounded-md px-3 py-2">
                {t('nav.faq')}
              </Link>
              <Link href="/contact" className="text-muted hover:text-ink rounded-md px-3 py-2">
                {t('nav.contact')}
              </Link>
            </nav>
            <div className="flex space-x-3">
              <Link href="/login" className="">
                <Button variant="secondary" size="sm">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link href="/register" className="">
                <Button variant="primary" size="sm">
                  {t('nav.register')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Simple hero section - just to verify layout works */}
          <div className="mt-8">
            <h1 className="mb-4 text-3xl font-bold text-ink text-center">
              {identity.title}
            </h1>
            <p className="mb-6 text-lg text-muted text-center max-w-2xl mx-auto">
              {identity.intro}
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-x-4 sm:space-x-6">
              <Link href="/register" className="">
                <Button variant="primary" size="md">
                  {t('hero.submitPaper')}
                </Button>
              </Link>
              <Link href="/topics" className="">
                <Button variant="secondary" size="md">
                  {t('hero.exploreTopics')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Minimal footer to verify full page works */}
          <footer className="mt-12 border-t border-line">
            <Container width="wide" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-12 text-center text-muted">
              <p>
                &copy; {new Date().getFullYear()} {identity.title}. {t('footer.copyright')}
              </p>
            </Container>
          </footer>
        </Container>
      </main>
    </div>
  );
}