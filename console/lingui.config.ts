import { defineConfig } from '@lingui/cli'

// Spec 0003 I18N-3 and I18N-7: one source catalog in English, plus a pseudo locale for development.
export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'pseudo-LOCALE'],
  pseudoLocale: 'pseudo-LOCALE',
  fallbackLocales: { default: 'en' },
  catalogs: [{ path: '<rootDir>/src/locales/{locale}/messages', include: ['src'] }],
})
