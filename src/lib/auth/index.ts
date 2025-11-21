import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { locales, type Locale } from '@/lib/i18n-config'
import { eq } from 'drizzle-orm'

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        if (!parsedCredentials.success) return null

        const { email, password } = parsedCredentials.data

        // Find user in database
        const user = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, email),
        })

        if (!user || !user.password) return null

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password)

        if (!isValidPassword) return null

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.avatarUrl,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Sync language from cookie to database on sign-in
      // This ensures language preference set on landing page is retained after login
      if (user?.id) {
        try {
          const cookieStore = await cookies()
          const cookieLanguage = cookieStore.get('NEXT_LOCALE')?.value

          // Always sync cookie language to database if a valid language cookie exists
          // This ensures the most recent language selection is preserved
          if (cookieLanguage && locales.includes(cookieLanguage as Locale)) {
            await db
              .update(users)
              .set({
                language: cookieLanguage,
                updatedAt: new Date(),
              })
              .where(eq(users.id, user.id))
          }
        } catch (error) {
          console.error('Error syncing language preference on sign-in:', error)
          // Don't block sign-in if language sync fails
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
