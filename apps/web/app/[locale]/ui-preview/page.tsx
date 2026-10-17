import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from '@/src/i18n/routing';
import { getTranslations } from 'next-intl/server';
import { Button, Card, Container, StatusBadge, TextField } from '@acp/ui';

export default async function UiPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations('uiPreview');

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Container width="wide" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="mb-6 text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="mb-8 text-center text-gray-600 dark:text-gray-400 max-w-2xl">
          {t('lead')}
        </p>

        <div className="space-y-12">
          {/* Buttons section */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('buttons.title')}
            </h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" size="md">
                {t('buttons.primary')}
              </Button>
              <Button variant="secondary" size="md">
                {t('buttons.secondary')}
              </Button>
              <Button variant="ghost" size="md">
                {t('buttons.ghost')}
              </Button>
            </div>
          </section>

          {/* TextField section */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('textField.title')}
            </h2>
            <div className="space-y-4">
              <TextField
                label={t('textField.label')}
                placeholder={t('textField.placeholder')}
                optionalLabel={t('textField.optional')}
              />
              <TextField
                label={t('textField.label')}
                placeholder={t('textField.placeholder')}
                required
                requiredLabel={t('textField.required')}
                error={t('textField.error')}
                help={t('textField.help')}
              />
            </div>
          </section>

          {/* StatusBadge section */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('status.title')}
            </h2>
            <div className="flex flex-wrap gap-4">
              <StatusBadge tone="success" label={t('status.accepted')} />
              <StatusBadge tone="info" label={t('status.inReview')} />
              <StatusBadge tone="warning" label={t('status.pending')} />
              <StatusBadge tone="danger" label={t('status.rejected')} />
            </div>
          </section>

          {/* Card section */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('cards.title')}
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <Card surface="flat">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('cards.flatTitle')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('cards.flatDescription')}
                </p>
              </Card>
              <Card surface="glass">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('cards.glassTitle')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('cards.glassDescription')}
                </p>
              </Card>
              <Card surface="clay">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('cards.clayTitle')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('cards.clayDescription')}
                </p>
              </Card>
            </div>
          </section>

          {/* Container section */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('containers.title')}
            </h2>
            <div className="space-y-4">
              <Container width="wide" className="bg-gray-50 dark:bg-gray-800 p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('containers.wideTitle')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('containers.wideDescription')}
                </p>
              </Container>
              <Container width="narrow" className="bg-gray-50 dark:bg-gray-800 p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('containers.narrowTitle')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('containers.narrowDescription')}
                </p>
              </Container>
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}