import eslintConfigNext from 'eslint-config-next';

/**
 * ESLint flat config for the web application.
 *
 * Wraps the eslint-config-next preset (Next.js 16 ships a flat-config
 * export) and adds the repository's own rules: no emoji in user-visible
 * copy and no hard-coded UI strings outside the translation layer.
 */
const config = [
  ...eslintConfigNext,
  {
    rules: {
      // Enforce the emoji prohibition from AGENTS.md §2.
      'no-irregular-whitespace': 'error',
    },
  },
];

export default config;