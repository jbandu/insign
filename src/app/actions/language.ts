'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { locales, type Locale } from '@/lib/i18n-config'

/**
 * Update user's language preference
 */
export async function updateLanguagePreference(language: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate language
  if (!locales.includes(language as Locale)) {
    return { success: false, error: 'Invalid language' }
  }

  try {
    // Update user's language preference in database
    await db
      .update(users)
      .set({
        language,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))

    // Set cookie for immediate language change
    const cookieStore = await cookies()
    cookieStore.set('NEXT_LOCALE', language, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })

    return { success: true, message: 'Language updated successfully' }
  } catch (error) {
    console.error('Error updating language:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update language',
    }
  }
}

/**
 * Set language preference (for non-authenticated users, e.g., landing page)
 */
export async function setLanguageCookie(language: string) {
  // Validate language
  if (!locales.includes(language as Locale)) {
    return { success: false, error: 'Invalid language' }
  }

  try {
    const cookieStore = await cookies()
    cookieStore.set('NEXT_LOCALE', language, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })

    return { success: true }
  } catch (error) {
    console.error('Error setting language cookie:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set language',
    }
  }
}

/**
 * Get current language from cookie or user preference
 */
export async function getCurrentLanguage(): Promise<Locale> {
  const session = await auth()
  const cookieStore = await cookies()

  // First check user preference if logged in
  if (session?.user?.id) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      })

      if (user?.language && locales.includes(user.language as Locale)) {
        return user.language as Locale
      }
    } catch (error) {
      console.error('Error fetching user language:', error)
    }
  }

  // Fall back to cookie
  const cookieLanguage = cookieStore.get('NEXT_LOCALE')?.value
  if (cookieLanguage && locales.includes(cookieLanguage as Locale)) {
    return cookieLanguage as Locale
  }

  // Default to English
  return 'en'
}
