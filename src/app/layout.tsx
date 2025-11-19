import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { cookies } from 'next/headers'
import { defaultLocale, type Locale } from '@/lib/i18n-config'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Insign - Enterprise Internal Operations Platform',
  description: 'Build Once, Replace Multiple SaaS Tools',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get locale from cookie or use default
  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value as Locale) || defaultLocale

  // Load messages for the current locale
  const messages = (await import(`../../messages/${locale}.json`)).default

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <Providers messages={messages}>{children}</Providers>
      </body>
    </html>
  )
}
