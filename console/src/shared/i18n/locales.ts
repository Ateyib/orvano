// Spec 0003 I18N-6: the one locale module. The account's setting (feature 13) will come first.
export const sourceLocale = 'en'

export const shippedLocales = ['en'] as const
export type Locale = (typeof shippedLocales)[number] | 'pseudo-LOCALE'

const rightToLeft = new Set(['ar', 'fa', 'he', 'ur'])

export function resolveLocale(requested: readonly string[]): Locale {
  for (const tag of requested) {
    const language = tag.toLowerCase().split('-')[0]
    const match = shippedLocales.find((locale) => locale === language)
    if (match) return match
  }
  return sourceLocale
}

export function getDirection(locale: string): 'ltr' | 'rtl' {
  const language = locale.toLowerCase().split('-')[0] ?? ''
  return rightToLeft.has(language) ? 'rtl' : 'ltr'
}
