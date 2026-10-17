'use client';

import { useRouter, usePathname } from 'next/navigation';

type Props = {
  locale: 'fa' | 'en';
  label: string;
  switchLabel: string;
};

/**
 * Tiny client island for the language toggle.
 *
 * The translations are injected by the server parent so this stays the only
 * `"use client"` boundary on the home page and never touches the translation
 * hook during prerendering.
 */
export function LanguageSwitcher({ locale, label, switchLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const target = locale === 'fa' ? '/en' : '/fa';

  return (
    <button
      type="button"
      className="flex items-center space-x-2 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-canvas-alt"
      onClick={() => router.push(target + pathname)}
    >
      <span>{label}</span>
      <span className="ml-2">{switchLabel}</span>
    </button>
  );
}