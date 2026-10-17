import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware navigation helpers. Every internal link in this app goes
 * through these, so the active locale is preserved as the visitor moves
 * between sections (docs/03 §2: `/en/...` mirrors every `/fa/...` page).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
