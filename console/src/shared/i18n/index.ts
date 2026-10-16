import { i18n } from '@lingui/core'
import { messages as sourceMessages } from '@/locales/en/messages.po'
import { reportConsoleError } from '@/shared/report'
import { getDirection, sourceLocale, type Locale } from './locales'

export * from './locales'
export { i18n }

// The en catalog is imported statically, since the boot error page needs it (spec 0003 I18N-3).
i18n.load(sourceLocale, sourceMessages)

/** Activates a locale, falling back to en when its catalog fails to load (spec 0003 RTE-10). */
export async function activateLocale(locale: Locale): Promise<void> {
  if (locale === sourceLocale) {
    i18n.activate(sourceLocale)
  } else {
    try {
      const { messages } = (await import(`../../locales/${locale}/messages.po`)) as typeof import('*.po')
      i18n.loadAndActivate({ locale, messages })
    } catch (error) {
      reportConsoleError(error)
      i18n.activate(sourceLocale)
    }
  }
  document.documentElement.lang = i18n.locale
  document.documentElement.dir = getDirection(i18n.locale)
}
