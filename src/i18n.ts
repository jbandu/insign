import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, type Locale } from '@/lib/i18n-config'
import enMessages from '../messages/en.json'
import esMessages from '../messages/es.json'

// Static messages map for production builds
const messagesMap = {
  en: enMessages,
  es: esMessages,
} as const

export default getRequestConfig(async () => {
  // Get locale from cookie or use default
  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value as Locale) || defaultLocale

  return {
    locale,
    messages: messagesMap[locale] || messagesMap[defaultLocale],
  }
})
