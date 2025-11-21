import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { cookies } from 'next/headers'
import { defaultLocale, locales, type Locale } from '@/lib/i18n-config'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import enMessages from '../../messages/en.json'
import esMessages from '../../messages/es.json'
import teMessages from '../../messages/te.json'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Insign - Enterprise Internal Operations Platform',
  description: 'Build Once, Replace Multiple SaaS Tools',
}

// Static messages map for production builds
const messagesMap = {
  en: enMessages,
  es: esMessages,
  te: teMessages,
} as const

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const cookieLanguage = cookieStore.get('NEXT_LOCALE')?.value
  const session = await auth()

  let locale: Locale = defaultLocale

  // Priority 1: Check user's database preference if logged in
  if (session?.user?.id) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      })

      console.log('[layout.tsx] User from DB:', { userId: session.user.id, language: user?.language })

      if (user?.language && locales.includes(user.language as Locale)) {
        locale = user.language as Locale
        console.log('[layout.tsx] Using user DB language:', locale)
      }
    } catch (error) {
      console.error('[layout.tsx] Error fetching user language preference:', error)
    }
  }

  // Priority 2: Fall back to cookie if no user preference was found
  if (locale === defaultLocale && cookieLanguage && locales.includes(cookieLanguage as Locale)) {
    locale = cookieLanguage as Locale
    console.log('[layout.tsx] Using cookie language:', locale)
  }

  console.log('[layout.tsx] Final locale:', locale)

  // Load messages for the current locale
  const messages = messagesMap[locale] || messagesMap[defaultLocale]

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <Providers messages={messages} locale={locale}>{children}</Providers>
      </body>
    </html>
  )
}
