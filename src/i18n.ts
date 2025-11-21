import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, locales, type Locale } from '@/lib/i18n-config'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import enMessages from '../messages/en.json'
import esMessages from '../messages/es.json'
import teMessages from '../messages/te.json'

// Static messages map for production builds
const messagesMap = {
  en: enMessages,
  es: esMessages,
  te: teMessages,
} as const

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const session = await auth()

  let locale: Locale = defaultLocale

  // Priority 1: Check user's database preference if logged in
  if (session?.user?.id) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      })

      if (user?.language && locales.includes(user.language as Locale)) {
        locale = user.language as Locale
      }
    } catch (error) {
      console.error('Error fetching user language preference:', error)
    }
  }

  // Priority 2: Fall back to cookie if no user preference
  if (locale === defaultLocale) {
    const cookieLanguage = cookieStore.get('NEXT_LOCALE')?.value
    if (cookieLanguage && locales.includes(cookieLanguage as Locale)) {
      locale = cookieLanguage as Locale
    }
  }

  return {
    locale,
    messages: messagesMap[locale] || messagesMap[defaultLocale],
  }
})
