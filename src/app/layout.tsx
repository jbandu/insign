import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { cookies } from 'next/headers'
import { defaultLocale, type Locale } from '@/lib/i18n-config'
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
  // Get locale from cookie or use default
  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value as Locale) || defaultLocale

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
